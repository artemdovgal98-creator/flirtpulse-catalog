import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { detectGeo } from "@/lib/server/geo";
import { decorateOffers, getBadgeMap, type BadgeInfo } from "@/lib/server/offers";
import { getVisibleOffers, loadOffersByIds, availableIn, safeLang } from "@/components/engage/server";

export const dynamic = "force-dynamic";

interface QuizBody {
  goal?: string; // category key or "any"
  language?: string; // service language or "any"
  country?: string; // ISO code or ""
  format?: string; // chat | video | voice | images | any
  access?: string; // free | freemium | paid | any
  lang?: string; // UI language for localisation
}

/** Sub-filters / categories that satisfy each format answer. */
const FORMAT_SUBFILTERS: Record<string, string[]> = {
  chat: ["chat", "companion", "girlfriend", "boyfriend"],
  video: ["video"],
  voice: ["voice"],
  images: ["image"],
};
const FORMAT_CATEGORIES: Record<string, string[]> = {
  chat: ["dating", "ai"],
  video: ["webcam", "live_cams"],
  voice: [],
  images: [],
};
/** Goals that cover several categories. */
const GOAL_CATEGORIES: Record<string, string[]> = {
  webcam: ["webcam", "live_cams"],
  live_cams: ["live_cams", "webcam"],
};

function accessScore(access: string, model: string | null | undefined): number {
  if (!access || access === "any") return 0;
  if (!model) return 3; // unknown model — neutral
  if (access === "free") return model === "free" ? 18 : model === "freemium" ? 10 : -6;
  if (access === "freemium") return model === "freemium" ? 16 : model === "free" ? 12 : 2;
  if (access === "paid") return ["subscription", "credits", "paid"].includes(model) ? 14 : 4;
  return 0;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as QuizBody;
    const h = await headers();
    const lang = safeLang(body.lang);
    const goal = String(body.goal || "any").toLowerCase();
    const language = String(body.language || "any").toLowerCase();
    const country = String(body.country || detectGeo(h) || "").toLowerCase();
    const format = String(body.format || "any").toLowerCase();
    const access = String(body.access || "any").toLowerCase();
    console.log("[API /quiz] answers:", { goal, language, country, format, access, lang });

    const [offers, badges] = await Promise.all([
      getVisibleOffers(country || detectGeo(h)),
      getBadgeMap().catch((err) => {
        console.error("[API /quiz] badges unavailable:", err);
        return new Map<string, BadgeInfo>();
      }),
    ]);

    const goalCats = goal === "any" ? [] : GOAL_CATEGORIES[goal] ?? [goal];

    const scored = offers
      .map((o) => {
        const cats: string[] = o.category ?? [];
        const subs: string[] = o.subfilters ?? [];
        const langs: string[] = o.languages ?? [];
        const reasons: string[] = [];
        let score = 0;

        // Goal / category — the strongest signal.
        if (goalCats.length) {
          if (cats.some((c) => goalCats.includes(c))) {
            score += cats[0] && goalCats.includes(cats[0]) ? 50 : 40;
            reasons.push("goal");
          } else score -= 40;
        }

        // Country.
        const avail = availableIn(o, country);
        if (avail === "exact") {
          score += 16;
          reasons.push("country");
        } else if (avail === "worldwide") {
          score += 10;
          if (country) reasons.push("worldwide");
        } else score -= 45;

        // Service language.
        if (language !== "any") {
          if (langs.includes(language)) {
            score += 16;
            reasons.push("language");
          } else if (!langs.length) score += 4;
          else if (langs.includes("en")) score += 2;
          else score -= 8;
        }

        // Format.
        if (format !== "any") {
          const wantSubs = FORMAT_SUBFILTERS[format] ?? [];
          const wantCats = FORMAT_CATEGORIES[format] ?? [];
          if (subs.some((s) => wantSubs.includes(s))) {
            score += 16;
            reasons.push("format");
          } else if (cats.some((c) => wantCats.includes(c))) {
            score += 10;
            reasons.push("format");
          }
        }

        // Access model.
        const a = accessScore(access, o.access_model);
        score += a;
        if (a >= 10) reasons.push("access");

        // Social proof / editorial signals.
        const info = badges.get(String(o._id));
        if (info?.badges.includes("hit_week")) score += 8;
        if (info?.badges.includes("trending")) score += 6;
        score += Math.min(10, Math.log2(1 + (info?.clicks7d ?? 0)) * 2);
        score += Math.min(6, Math.log2(1 + Number(o.click_count || 0)));
        if (o.is_featured === "yes") score += 6;
        score += Math.min(5, Number(o.quality_score || 0) / 20);

        return { id: String(o._id), score, reasons };
      })
      .sort((a, b) => b.score - a.score);

    const top = scored.slice(0, 3);
    const maxScore = 50 + 16 + 16 + 16 + 18 + 8 + 6 + 10 + 6 + 6 + 5;
    const rows = await loadOffersByIds(top.map((s) => s.id));
    const items = await decorateOffers(rows, lang);
    const meta = new Map(top.map((s) => [s.id, s]));

    const results = items.map((item) => {
      const s = meta.get(String(item._id))!;
      return {
        offer: item,
        match: Math.max(35, Math.min(99, Math.round((s.score / maxScore) * 100) + 25)),
        reasons: s.reasons,
      };
    });

    console.log(
      `[API /quiz] scored ${scored.length} showcases → top:`,
      top.map((s) => `${s.id}:${s.score.toFixed(1)}`).join(", ")
    );
    return NextResponse.json({ ok: true, data: { results, country } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/quiz", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
