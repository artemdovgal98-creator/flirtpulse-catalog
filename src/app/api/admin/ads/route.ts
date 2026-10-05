import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { query, create, getById } from "@/lib/server/db";
import { okJson, errJson, serverError } from "../networks/_lib/shared";
import { normaliseAd, withCtr } from "./_lib";

export const dynamic = "force-dynamic";

/** All ad tags (newest priority first) with CTR computed on the server. */
export async function GET() {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const rows = await query<any>("ad_tag", { _sort: { priority: "desc", createdAt: "desc" }, _limit: 500 });
    console.log(`[API /admin/ads] listed ${rows.length} ad tags`);
    return okJson({ items: rows.map(withCtr) });
  } catch (err) {
    return serverError("GET /api/admin/ads", err);
  }
}

export async function POST(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const body = (await request.json()) as Record<string, any>;
    const n = normaliseAd(body);
    if ("error" in n) return errJson(n.error);
    if (n.value.kind === "image" && !n.value.image) return errJson("Upload an image for an image ad");
    if (n.value.kind === "html" && !String(n.value.html || "").trim()) return errJson("HTML code is required");

    const record: Record<string, unknown> = { ...n.value, impressions: 0, clicks: 0 };
    if (!record.image) delete record.image;
    const id = await create("ad_tag", record);
    await logAdmin(guard, "create", "ad_tag", id, `Ad "${n.value.name}" created in ${n.value.slot}`, {
      slot: n.value.slot,
      kind: n.value.kind,
    });
    const row = await getById<any>("ad_tag", id);
    console.log(`[API /admin/ads] created ${id} slot=${n.value.slot} kind=${n.value.kind}`);
    return okJson({ item: withCtr(row ?? { _id: id, ...record }) }, 201);
  } catch (err) {
    return serverError("POST /api/admin/ads", err);
  }
}
