import { NextResponse } from "next/server";
import { query, create, update, remove } from "@/lib/server/db";
import { getSessionUser, refId } from "@/components/engage/server";

export const dynamic = "force-dynamic";

const LISTS = ["want_to_try", "tried"] as const;
type FavList = (typeof LISTS)[number];

function isList(v: unknown): v is FavList {
  return typeof v === "string" && (LISTS as readonly string[]).includes(v);
}

/**
 * Returns the signed-in user's saved showcases: [{ offer: id, list, saved_at }].
 * Only ids are returned — the cards are loaded through the public /api/offers.
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      console.log("[API /favorites] guest request — favorites live in localStorage");
      return NextResponse.json({ ok: true, data: { items: [], guest: true } });
    }

    const rows = await query<any>("favorite", {
      _filter: { user: user.id },
      _sort: { saved_at: "desc" },
      _limit: 500,
    });
    // Drop favourites whose showcase no longer exists (one batched lookup).
    const offerIds = Array.from(new Set(rows.map((f) => refId(f.offer)).filter(Boolean)));
    const existing = offerIds.length
      ? await query<any>("offer", { _filter: { _id: { in: offerIds } }, _select: { _id: true }, _limit: offerIds.length })
      : [];
    const alive = new Set(existing.map((o) => String(o._id)));
    const items = rows
      .filter((f) => alive.has(refId(f.offer)))
      .map((f) => ({ _id: f._id, offer: refId(f.offer), list: f.list || "", saved_at: f.saved_at }));
    console.log(`[API /favorites] user ${user.id} has ${items.length} favorites`);

    return NextResponse.json({ ok: true, data: { items, guest: false } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/favorites", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** Toggles a showcase in the signed-in user's favorites. Body: { offer_id, list? } */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as { offer_id?: string; list?: string };
    if (!body.offer_id) {
      return NextResponse.json({ ok: false, error: "offer_id is required" }, { status: 400 });
    }

    const existing = (await query<any>("favorite", { _filter: { user: user.id, offer: body.offer_id }, _limit: 1 }))[0];
    if (existing) {
      await remove("favorite", existing._id);
      console.log(`[API /favorites] removed offer ${body.offer_id} for user ${user.id}`);
      return NextResponse.json({ ok: true, data: { saved: false, list: "" } });
    }

    const list = isList(body.list) ? body.list : "want_to_try";
    await create("favorite", { user: user.id, offer: body.offer_id, saved_at: new Date().toISOString(), list });
    console.log(`[API /favorites] saved offer ${body.offer_id} (${list}) for user ${user.id}`);
    return NextResponse.json({ ok: true, data: { saved: true, list } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/favorites", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** Moves a saved showcase to a list (saving it first if needed). Body: { offerId, list } */
export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as { offerId?: string; list?: string };
    if (!body.offerId || !isList(body.list)) {
      return NextResponse.json({ ok: false, error: "offerId and list (want_to_try|tried) are required" }, { status: 400 });
    }

    const existing = (await query<any>("favorite", { _filter: { user: user.id, offer: body.offerId }, _limit: 1 }))[0];
    if (existing) await update("favorite", existing._id, { list: body.list });
    else await create("favorite", { user: user.id, offer: body.offerId, saved_at: new Date().toISOString(), list: body.list });

    console.log(`[API /favorites] offer ${body.offerId} → ${body.list} for user ${user.id}`);
    return NextResponse.json({ ok: true, data: { saved: true, list: body.list } });
  } catch (err: any) {
    console.error("[API ERROR] PUT /api/favorites", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
