import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { totalumSdk } from "@/lib/totalum";
import { GEO_NAMES, PRIVATE_OFFER_FIELDS } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Multi-language keywords that map a free-text question onto catalog filters. */
const GEO_KEYWORDS: Record<string, string[]> = {
  us: ["united states", "usa", "u.s.", "america", "сша", "штаты", "vereinigte staaten", "estados unidos", "états-unis", "美国"],
  ca: ["canada", "канада", "kanada", "canadá", "加拿大"],
  gb: ["united kingdom", "uk", "britain", "england", "великобритания", "англия", "reino unido", "royaume-uni", "英国"],
  au: ["australia", "австралия", "australien", "australie", "澳大利亚"],
  nz: ["new zealand", "новая зеландия", "neuseeland"],
  de: ["germany", "german", "германия", "немецк", "deutschland", "allemagne", "alemania", "germania", "almanya", "德国", "німеччин"],
  fr: ["france", "french", "франция", "frankreich", "francia", "法国"],
  es: ["spain", "spanish", "испания", "spanien", "españa", "espagne", "西班牙"],
  it: ["italy", "italian", "италия", "italien", "italia", "意大利"],
  pt: ["portugal", "португалия", "葡萄牙"],
  nl: ["netherlands", "holland", "нидерланды", "niederlande", "países bajos"],
  be: ["belgium", "бельгия", "belgien", "belgique"],
  ch: ["switzerland", "швейцария", "schweiz", "suisse"],
  at: ["austria", "австрия", "österreich", "autriche"],
  se: ["sweden", "швеция", "schweden", "suecia"],
  no: ["norway", "норвегия", "norwegen", "noruega"],
  dk: ["denmark", "дания", "dänemark", "dinamarca"],
  fi: ["finland", "финляндия", "finnland"],
  ie: ["ireland", "ирландия", "irland", "irlanda"],
  pl: ["poland", "polska", "польша", "polen", "polonia", "polonya"],
  ua: ["ukraine", "ukrain", "украин", "україн", "ukraina", "ucrania", "ukrayna", "乌克兰"],
  ru: ["russia", "россия", "русск", "russland", "rusia", "俄罗斯"],
  hu: ["hungary", "венгрия", "ungarn", "hungría", "magyar"],
  cz: ["czech", "чехия", "tschechien", "chequia"],
  ro: ["romania", "румыния", "rumänien", "rumanía"],
  gr: ["greece", "греция", "griechenland", "grecia"],
  tr: ["turkey", "türkiye", "турция", "türkei", "turquía"],
  br: ["brazil", "brasil", "бразилия", "brasilien"],
  mx: ["mexico", "méxico", "мексика", "mexiko"],
  ar: ["argentina", "аргентина", "argentinien"],
  cl: ["chile", "чили"],
  co: ["colombia", "колумбия", "kolumbien"],
  za: ["south africa", "юар", "südafrika", "sudáfrica"],
  ae: ["emirates", "uae", "оаэ", "эмираты", "emiratos"],
  sa: ["saudi", "саудов"],
  il: ["israel", "израиль"],
  in: ["india", "индия", "indien"],
  jp: ["japan", "япония", "japón", "日本"],
  kr: ["korea", "корея", "韩国"],
  sg: ["singapore", "сингапур", "singapur"],
  ph: ["philippines", "филиппины", "filipinas"],
  th: ["thailand", "таиланд", "tailandia"],
  my: ["malaysia", "малайзия"],
  id: ["indonesia", "индонезия"],
  vn: ["vietnam", "вьетнам"],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  dating: ["dating", "date", "знакомств", "свидан", "знайомств", "randk", "rencontre", "citas", "encontro", "incontri", "flört", "مواعدة", "约会", "partnersuche"],
  webcam: ["webcam", "cam site", "вебкам", "вебка", "kamerk", "kamera", "cámara", "câmara", "webkam", "كاميرا", "视频聊天"],
  live_cams: ["live cam", "живые камер", "живі камер", "roulette", "рулетк", "live chat", "canlı", "en vivo", "dal vivo", "直播", "بث مباشر", "camera live"],
  useful: ["useful", "полезн", "корисн", "vpn", "приватн", "безопасн", "podarok", "подарк", "перевод", "фото", "путешеств", "здоров", "przydatne", "nützlich", "utile", "útil", "faydalı", "مفيد", "实用", "tool", "инструмент"],
};

/** Fields the assistant response must never carry back to the browser. */
const OMIT_PRIVATE = Object.fromEntries(PRIVATE_OFFER_FIELDS.map((f) => [f, true]));

const NO_GEO_KEYWORDS = ["no geo", "without geo", "any geo", "worldwide", "без geo", "без гео", "весь мир", "no restriction", "全球", "بدون قيود"];

function detect(text: string, dictionary: Record<string, string[]>): string[] {
  const lower = text.toLowerCase();
  return Object.entries(dictionary)
    .filter(([, words]) => words.some((w) => lower.includes(w)))
    .map(([key]) => key);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      message?: string;
      language?: string;
      history?: Array<{ role: string; content: string }>;
    };

    const message = (body.message || "").trim();
    if (!message) {
      return NextResponse.json({ ok: false, error: "message is required" }, { status: 400 });
    }

    const language = body.language || "ru";
    const geos = detect(message, GEO_KEYWORDS);
    const categories = detect(message, CATEGORY_KEYWORDS);
    const wantsWorldwide = NO_GEO_KEYWORDS.some((w) => message.toLowerCase().includes(w));

    const filter: Record<string, any> = { status: "active" };
    if (categories.length) filter.category = { in: categories };
    if (wantsWorldwide) filter.geo = { in: ["worldwide"] };
    else if (geos.length) filter.geo = { in: [...geos, "worldwide"] };

    console.log("[API /ai/chat] detected filter:", JSON.stringify(filter), "lang:", language);

    const offersResult = await totalumSdk.crud.query("offer", {
      _filter: filter,
      _sort: { quality_score: "desc" },
      _limit: 40,
      _omit: OMIT_PRIVATE,
    } as any);
    if (offersResult.errors) console.error("[API /ai/chat] sdk errors:", offersResult.errors);

    let offers = (offersResult.data as any[]) || [];

    // Nothing matched the heuristic — fall back to the strongest offers so the
    // assistant always has real catalog data to work with.
    if (!offers.length) {
      const fallback = await totalumSdk.crud.query("offer", {
        _filter: { status: "active" },
        _sort: { quality_score: "desc" },
        _limit: 30,
        _omit: OMIT_PRIVATE,
      } as any);
      offers = (fallback.data as any[]) || [];
      console.log("[API /ai/chat] heuristic returned nothing, using top services fallback");
    }

    const catalogSnippet = offers
      .slice(0, 30)
      .map(
        (o) =>
          `- ${o.name} | ${(o.category || []).join("/")} | countries: ${(o.geo || [])
            .map((g: string) => GEO_NAMES[g] || g)
            .join(", ")} | tags: ${o.tags || "-"} | ${String(o.description || "").slice(0, 160)}`
      )
      .join("\n");

    const systemPrompt = `You are the FlirtPulse assistant. You help visitors find services and platforms in four sections: Dating, Webcam, Live cams and Useful (everyday services).
Answer ONLY with information from the catalog data given below. Never invent services or countries.
Never mention partner programmes, affiliate networks, commissions, payouts or pricing models — you know nothing about them and they are irrelevant to the visitor.
Reply in the language of the user's message (their interface language code is "${language}" — use it if the message language is ambiguous).
Be concise and friendly: recommend 3-6 services max, each on its own line as "**Name** — what it is — where it works — why it fits". Finish with one short helpful tip.
Use plain text with markdown-style ** for names. Do not use tables.

CATALOG DATA (${offers.length} matching services):
${catalogSnippet}`;

    const history = (body.history || []).slice(-6).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content).slice(0, 1500),
    }));

    const completion = await totalumSdk.openai.createChatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message },
      ],
      model: "gpt-4.1-mini",
      max_tokens: 700,
      temperature: 0.5,
    } as any);

    const reply =
      (completion as any)?.data?.choices?.[0]?.message?.content?.trim() ||
      "I could not generate an answer this time. Please rephrase your question.";

    console.log(`[API /ai/chat] answered with ${reply.length} chars, ${offers.length} services in context`);

    // Persist the exchange for signed-in users (non-critical: never blocks the reply).
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      const userId = session?.user?.id;
      if (userId) {
        const now = new Date().toISOString();
        await Promise.all([
          totalumSdk.crud.createRecord("chat_message", {
            user: userId, role: "user", content: message, language, sent_at: now,
          } as any),
          totalumSdk.crud.createRecord("chat_message", {
            user: userId, role: "assistant", content: reply, language, sent_at: now,
          } as any),
        ]);
      }
    } catch (err) {
      console.error("[API /ai/chat] could not persist chat history:", err);
    }

    return NextResponse.json({
      ok: true,
      data: {
        reply,
        offers: offers.slice(0, 6).map((o) => {
          // Defence in depth — nothing private ever reaches the chat UI.
          const safe = { ...o };
          for (const field of PRIVATE_OFFER_FIELDS) delete safe[field];
          return safe;
        }),
        detected: { geos, categories, worldwide: wantsWorldwide },
      },
    });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/ai/chat", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
