import { NextResponse } from "next/server";
import { query, create, update, count, getById } from "@/lib/server/db";
import { getSessionUser, reviewCounts, safeLang } from "@/components/engage/server";

export const dynamic = "force-dynamic";

const MAX_COMMENT = 300;
const MAX_PER_HOUR = 5;

/** Rejects links, domains, @handles and Telegram links in review comments. */
const LINK_PATTERNS: RegExp[] = [
  /\b(?:https?|ftp|tg):\/\//i,
  /\bwww\./i,
  /\bt\.me\b|\btelegram\.(?:me|org|dog)\b|\btelesco\.pe\b/i,
  /(^|[\s(])@[a-z0-9_.]{3,}/i,
  /\b[a-z0-9][a-z0-9-]*\s?(?:\.|\(dot\)|\[dot\]|\sdot\s)\s?(?:com|net|org|ru|su|io|me|app|xyz|info|biz|co|ua|de|uk|online|site|club|top|live|tv|cc|ly|gg|link|pro|fun|vip|cam|chat|dating|love|sex|xxx|porn|shop|store|bz|to|in|eu|us|pl|fr|es|it|nl|br|kz|by)\b/i,
];

function containsLink(text: string): boolean {
  return LINK_PATTERNS.some((re) => re.test(text));
}

function firstName(name: string): string {
  const first = String(name || "").trim().split(/\s+/)[0] || "";
  if (!first || first.includes("@")) return "";
  return first.slice(0, 24);
}

/** GET ?offerId= — approved reviews + 👍/👎 counts; the caller's own review is returned separately. */
export async function GET(request: Request) {
  try {
    const offerId = new URL(request.url).searchParams.get("offerId") || "";
    if (!/^[a-f0-9]{24}$/i.test(offerId)) {
      return NextResponse.json({ ok: false, error: "offerId is required" }, { status: 400 });
    }

    const user = await getSessionUser();
    const [rows, counts, mineRows] = await Promise.all([
      query<any>("review", {
        _filter: { offer: offerId, status: "approved" },
        _sort: { submitted_at: "desc" },
        _limit: 50,
      }),
      reviewCounts([offerId]),
      user ? query<any>("review", { _filter: { offer: offerId, user: user.id }, _limit: 1 }) : Promise.resolve([]),
    ]);

    const mineRow = mineRows[0];
    const items = rows.map((r) => ({
      _id: r._id,
      vote: r.vote,
      comment: r.comment || "",
      author_name: r.author_name || "",
      submitted_at: r.submitted_at || r.createdAt,
      mine: !!mineRow && r._id === mineRow._id,
    }));
    const c = counts.get(offerId) ?? { up: 0, down: 0 };
    const mine = mineRow
      ? { vote: mineRow.vote, comment: mineRow.comment || "", status: mineRow.status, pending: mineRow.status === "pending" }
      : null;

    console.log(`[API /reviews] offer ${offerId}: ${items.length} approved (👍${c.up} 👎${c.down})${mine ? `, own=${mine.status}` : ""}`);
    return NextResponse.json({ ok: true, data: { items, up: c.up, down: c.down, mine, canReview: !!user } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/reviews", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** POST { offerId, vote: "up"|"down", comment, lang } — signed-in users only, goes to moderation. */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as {
      offerId?: string;
      vote?: string;
      comment?: string;
      lang?: string;
    };
    const offerId = String(body.offerId || "");
    if (!/^[a-f0-9]{24}$/i.test(offerId)) {
      return NextResponse.json({ ok: false, error: "offerId is required" }, { status: 400 });
    }
    if (body.vote !== "up" && body.vote !== "down") {
      return NextResponse.json({ ok: false, error: "vote must be up or down" }, { status: 400 });
    }
    const comment = String(body.comment || "").replace(/\s+/g, " ").trim();
    if (comment.length > MAX_COMMENT) {
      return NextResponse.json({ ok: false, error: "comment_too_long" }, { status: 400 });
    }
    if (comment && containsLink(comment)) {
      console.log(`[API /reviews] rejected a comment with a link from user ${user.id}`);
      return NextResponse.json({ ok: false, error: "links_not_allowed" }, { status: 400 });
    }

    const offer = await getById<any>("offer", offerId);
    if (!offer || offer.status !== "active") {
      return NextResponse.json({ ok: false, error: "Showcase not found" }, { status: 404 });
    }

    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const recent = await count("review", { user: user.id, submitted_at: { gte: hourAgo } });
    if (recent >= MAX_PER_HOUR) {
      console.log(`[API /reviews] rate limit hit for user ${user.id} (${recent} in the last hour)`);
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    const data = {
      vote: body.vote,
      comment,
      status: "pending",
      author_name: firstName(user.name),
      language: safeLang(body.lang),
      submitted_at: new Date().toISOString(),
    };

    // One review per user per showcase: an edit replaces it and goes back to moderation.
    const existing = (await query<any>("review", { _filter: { offer: offerId, user: user.id }, _limit: 1 }))[0];
    if (existing) {
      await update("review", existing._id, data);
      console.log(`[API /reviews] user ${user.id} updated review ${existing._id} → pending`);
    } else {
      const id = await create("review", { ...data, user: user.id, offer: offerId });
      console.log(`[API /reviews] user ${user.id} created review ${id} on ${offerId} (pending)`);
    }

    return NextResponse.json({
      ok: true,
      data: { mine: { vote: data.vote, comment, status: "pending", pending: true }, updated: !!existing },
    });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/reviews", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
