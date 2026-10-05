import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { getById, update, remove, count, randomToken } from "@/lib/server/db";
import { invalidateNetworkSlugs } from "@/lib/server/offers";
import { okJson, errJson, serverError, getOrigin, str } from "../_lib/shared";
import { toClient, uniqueSlug, NETWORK_STATUSES, type NetworkRow } from "../_lib/network";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const row = await getById<NetworkRow>("affiliate_network", id);
    if (!row) return errJson("Network not found", 404);
    const [offers, conversions] = await Promise.all([
      count("offer", { affiliate_network: id }),
      count("conversion", { affiliate_network: id }),
    ]);
    return okJson({ item: toClient(row, getOrigin(request), offers, conversions) });
  } catch (err) {
    return serverError("GET /api/admin/networks/[id]", err);
  }
}

/**
 * Updates a network. `api_key` is write-only: a non-empty value replaces it,
 * `clear_api_key: true` removes it, otherwise it stays untouched.
 * `regenerate_secret: true` issues a new postback secret.
 */
export async function PUT(request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const row = await getById<NetworkRow>("affiliate_network", id);
    if (!row) return errJson("Network not found", 404);

    const body = (await request.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    const changed: string[] = [];

    if (body.name !== undefined) {
      const name = str(body.name, 120);
      if (!name) return errJson("Name is required");
      patch.name = name;
    }
    if (body.slug !== undefined) {
      const wanted = str(body.slug, 80);
      if (wanted && wanted !== row.slug) patch.slug = await uniqueSlug(wanted, id);
    }
    for (const [field, max] of [
      ["link_template", 2000],
      ["api_url", 500],
      ["geo", 300],
      ["payout_model", 60],
      ["notes", 4000],
    ] as const) {
      if (body[field] !== undefined) patch[field] = str(body[field], max);
    }
    if (body.status !== undefined) {
      if (!NETWORK_STATUSES.includes(body.status as any)) return errJson("Invalid status");
      patch.status = body.status;
    }
    const apiKey = str(body.api_key, 500);
    if (apiKey) patch.api_key = apiKey;
    else if (body.clear_api_key === true) patch.api_key = "";
    if (body.regenerate_secret === true) patch.postback_secret = randomToken(16);

    for (const k of Object.keys(patch)) {
      if (k === "api_key" || k === "postback_secret") changed.push(k);
      else if ((row as any)[k] !== patch[k]) changed.push(k);
    }
    if (!Object.keys(patch).length) return okJson({ item: toClient(row, getOrigin(request)) });

    await update("affiliate_network", id, patch);
    invalidateNetworkSlugs();

    // Never put secrets in the journal — only the names of the changed fields.
    await logAdmin(
      guard,
      body.regenerate_secret === true ? "regenerate_secret" : "update",
      "affiliate_network",
      id,
      body.regenerate_secret === true
        ? `Postback secret regenerated for "${row.name}"`
        : `Network "${(patch.name as string) || row.name}" updated: ${changed.join(", ") || "no changes"}`,
      { fields: changed }
    );

    const fresh = (await getById<NetworkRow>("affiliate_network", id)) ?? ({ ...row, ...patch } as NetworkRow);
    console.log(`[API /admin/networks/:id] updated ${id}: ${changed.join(", ")}`);
    return okJson({ item: toClient(fresh, getOrigin(request)) });
  } catch (err) {
    return serverError("PUT /api/admin/networks/[id]", err);
  }
}

/** Deletes a network only when no showcase or conversion references it. */
export async function DELETE(_request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const row = await getById<NetworkRow>("affiliate_network", id);
    if (!row) return errJson("Network not found", 404);

    const [offers, conversions] = await Promise.all([
      count("offer", { affiliate_network: id }),
      count("conversion", { affiliate_network: id }),
    ]);
    if (offers > 0 || conversions > 0) {
      console.warn(`[API /admin/networks/:id] refused delete of ${id}: offers=${offers} conversions=${conversions}`);
      return errJson(
        `Network is in use: ${offers} showcase(s) and ${conversions} conversion(s) reference it. Detach the showcases first (conversions keep the history, so a network with conversions cannot be deleted — set it to "error"/pending instead).`,
        409
      );
    }

    await remove("affiliate_network", id);
    invalidateNetworkSlugs();
    await logAdmin(guard, "delete", "affiliate_network", id, `Network "${row.name}" deleted`, { slug: row.slug });
    console.log(`[API /admin/networks/:id] deleted ${id}`);
    return okJson({ deleted: id });
  } catch (err) {
    return serverError("DELETE /api/admin/networks/[id]", err);
  }
}
