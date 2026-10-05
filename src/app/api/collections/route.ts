import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { query, create, randomToken } from "@/lib/server/db";
import { getSessionUser, cleanIds } from "@/components/engage/server";

export const dynamic = "force-dynamic";

const LISTS = ["all", "want_to_try", "tried"];

/**
 * Creates a public, read-only collection of showcases.
 * Body: { list, title, offerIds } — guests are allowed too (the collection is anonymous).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { list?: string; title?: string; offerIds?: unknown };
    const offerIds = cleanIds(body.offerIds, 60);
    if (!offerIds.length) {
      return NextResponse.json({ ok: false, error: "offerIds must contain at least one showcase" }, { status: 400 });
    }
    const list = LISTS.includes(String(body.list)) ? String(body.list) : "all";
    const title = String(body.title || "")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);

    // Only published showcases can be shared.
    const active = await query<any>("offer", {
      _filter: { _id: { in: offerIds }, status: "active" },
      _select: { _id: true },
      _limit: offerIds.length,
    });
    const activeIds = new Set(active.map((o) => String(o._id)));
    const ids = offerIds.filter((id) => activeIds.has(id));
    if (!ids.length) {
      return NextResponse.json({ ok: false, error: "None of these showcases is published" }, { status: 400 });
    }

    const user = await getSessionUser();
    const token = randomToken(9);
    const id = await create("shared_collection", {
      token,
      title,
      list,
      views: 0,
      ...(user ? { user: user.id } : {}),
    });

    for (const offerId of ids) {
      const res = await totalumSdk.crud.addManyToManyReferenceRecord("shared_collection", id, "offers", offerId);
      if (res.errors) {
        console.error(`[API /collections] could not attach ${offerId}:`, res.errors);
        throw new Error(res.errors.errorMessage || "Could not attach showcase");
      }
    }

    console.log(`[API /collections] created ${token} (${ids.length} showcases, list=${list}, ${user ? "user" : "guest"})`);
    return NextResponse.json({ ok: true, data: { token, path: `/c/${token}`, count: ids.length } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/collections", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
