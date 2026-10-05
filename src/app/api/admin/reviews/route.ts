import { getAdminGuard, forbidden } from "@/lib/admin";
import { query, count } from "@/lib/server/db";
import { okJson, serverError, refId } from "../networks/_lib/shared";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "approved", "hidden"];

/** Reviews for moderation: `?status=pending|approved|hidden|all&offset=&limit=`. */
export async function GET(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "pending";
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const filter = STATUSES.includes(status) ? { status } : {};

    const [rows, total, counts] = await Promise.all([
      query<any>("review", {
        ...(Object.keys(filter).length ? { _filter: filter } : {}),
        _sort: { submitted_at: "desc", createdAt: "desc" },
        _limit: limit,
        _offset: offset,
      }),
      count("review", filter),
      Promise.all(STATUSES.map((s) => count("review", { status: s }))),
    ]);

    const offerIds = Array.from(new Set(rows.map((r) => refId(r.offer)).filter(Boolean)));
    const offers = offerIds.length
      ? await query<any>("offer", { _filter: { _id: { in: offerIds } }, _select: { name: true }, _limit: offerIds.length + 5 })
      : [];
    const names = new Map(offers.map((o) => [o._id, o.name]));

    const items = rows.map((r) => ({
      _id: r._id,
      offer_id: refId(r.offer),
      offer_name: names.get(refId(r.offer)) ?? "",
      author_name: r.author_name ?? "",
      vote: r.vote ?? "",
      comment: r.comment ?? "",
      status: r.status || "pending",
      language: r.language ?? "",
      submitted_at: r.submitted_at || r.createdAt || null,
    }));
    console.log(`[API /admin/reviews] status=${status} → ${items.length}/${total}`);
    return okJson({
      items,
      total,
      offset,
      limit,
      hasMore: offset + items.length < total,
      counts: Object.fromEntries(STATUSES.map((s, i) => [s, counts[i]])),
    });
  } catch (err) {
    return serverError("GET /api/admin/reviews", err);
  }
}
