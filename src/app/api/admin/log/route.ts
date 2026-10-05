import { NextResponse } from "next/server";
import { getAdminGuard, forbidden } from "@/lib/admin";
import { query, count, parseJson } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Admin journal: GET ?limit&offset&entity&q — newest first. */
export async function GET(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();

    const params = new URL(request.url).searchParams;
    const limit = Math.min(100, Math.max(1, Number(params.get("limit") || 30)));
    const offset = Math.max(0, Number(params.get("offset") || 0));
    const entity = (params.get("entity") || "").trim();
    const q = (params.get("q") || "").trim();

    const filter: Record<string, any> = {};
    if (entity) filter.entity = entity;
    if (q) {
      const regex = { regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), options: "i" };
      filter._or = [{ summary: regex }, { actor: regex }, { action: regex }];
    }
    const hasFilter = Object.keys(filter).length > 0;

    const [rows, total] = await Promise.all([
      query<any>("admin_log", {
        ...(hasFilter ? { _filter: filter } : {}),
        _sort: { logged_at: "desc" },
        _limit: limit,
        _offset: offset,
      }),
      count("admin_log", hasFilter ? filter : undefined),
    ]);

    const items = rows.map((r) => ({
      _id: r._id,
      action: r.action,
      entity: r.entity,
      entity_id: r.entity_id,
      summary: r.summary,
      details: parseJson(r.details, {}),
      actor: r.actor,
      ip_address: r.ip_address,
      logged_at: r.logged_at || r.createdAt,
    }));
    console.log(`[API /admin/log] ${items.length}/${total} (entity=${entity || "-"})`);
    return NextResponse.json({ ok: true, data: { items, total, offset, limit, hasMore: offset + items.length < total } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/admin/log", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
