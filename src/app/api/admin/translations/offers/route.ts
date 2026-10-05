import { getAdminGuard, forbidden } from "@/lib/admin";
import { query, count } from "@/lib/server/db";
import { okJson, serverError } from "../../networks/_lib/shared";

export const dynamic = "force-dynamic";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Showcase picker for translation editing: `?q=&offset=&limit=`. */
export async function GET(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 40));
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const filter = q ? { name: { regex: escapeRegex(q), options: "i" } } : undefined;

    const [rows, total] = await Promise.all([
      query<any>("offer", {
        ...(filter ? { _filter: filter } : {}),
        _select: { name: true, status: true },
        _sort: { name: "asc" },
        _limit: limit,
        _offset: offset,
      }),
      count("offer", filter),
    ]);
    const items = rows.map((r) => ({ _id: r._id, name: r.name ?? "", status: r.status ?? "" }));
    return okJson({ items, total, offset, limit, hasMore: offset + items.length < total });
  } catch (err) {
    return serverError("GET /api/admin/translations/offers", err);
  }
}
