import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { getById, update, remove } from "@/lib/server/db";
import { okJson, errJson, serverError } from "../../networks/_lib/shared";
import { normaliseAd, withCtr } from "../_lib";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const row = await getById<any>("ad_tag", id);
    if (!row) return errJson("Ad not found", 404);
    return okJson({ item: withCtr(row) });
  } catch (err) {
    return serverError("GET /api/admin/ads/[id]", err);
  }
}

/** Updates an ad. Counters (impressions / clicks) are read-only; `reset_stats: true` zeroes them. */
export async function PUT(request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const row = await getById<any>("ad_tag", id);
    if (!row) return errJson("Ad not found", 404);

    const body = (await request.json()) as Record<string, any>;
    const n = normaliseAd(body, true);
    if ("error" in n) return errJson(n.error);
    const patch: Record<string, unknown> = { ...n.value };
    if (body.reset_stats === true) {
      patch.impressions = 0;
      patch.clicks = 0;
    }
    const kind = (patch.kind as string) ?? row.kind;
    const image = "image" in patch ? patch.image : row.image;
    if (kind === "image" && !image) return errJson("Upload an image for an image ad");

    await update("ad_tag", id, patch);
    await logAdmin(guard, "update", "ad_tag", id, `Ad "${patch.name ?? row.name}" updated: ${Object.keys(patch).join(", ")}`, {
      fields: Object.keys(patch),
    });
    const fresh = (await getById<any>("ad_tag", id)) ?? { ...row, ...patch };
    console.log(`[API /admin/ads/:id] updated ${id}: ${Object.keys(patch).join(", ")}`);
    return okJson({ item: withCtr(fresh) });
  } catch (err) {
    return serverError("PUT /api/admin/ads/[id]", err);
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const row = await getById<any>("ad_tag", id);
    if (!row) return errJson("Ad not found", 404);
    await remove("ad_tag", id);
    await logAdmin(guard, "delete", "ad_tag", id, `Ad "${row.name}" deleted`, { slot: row.slot });
    console.log(`[API /admin/ads/:id] deleted ${id}`);
    return okJson({ deleted: id });
  } catch (err) {
    return serverError("DELETE /api/admin/ads/[id]", err);
  }
}
