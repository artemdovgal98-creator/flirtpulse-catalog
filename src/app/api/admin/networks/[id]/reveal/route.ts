import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { getById } from "@/lib/server/db";
import { slugifyNetwork } from "@/lib/server/offers";
import { okJson, errJson, serverError, getOrigin } from "../../_lib/shared";
import { postbackUrl, type NetworkRow } from "../../_lib/network";

export const dynamic = "force-dynamic";

/** Explicit, journaled reveal of the full postback URL (the only place the secret leaves the server). */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const row = await getById<NetworkRow>("affiliate_network", id);
    if (!row) return errJson("Network not found", 404);
    if (!row.postback_secret) return errJson("This network has no postback secret yet — regenerate it first", 409);

    const slug = row.slug || slugifyNetwork(row.name || "network");
    await logAdmin(guard, "reveal_postback", "affiliate_network", id, `Postback URL revealed for "${row.name}"`);
    console.log(`[API /admin/networks/:id/reveal] postback URL revealed for ${id}`);
    return okJson({ url: postbackUrl(getOrigin(request), slug, row.postback_secret) });
  } catch (err) {
    return serverError("POST /api/admin/networks/[id]/reveal", err);
  }
}
