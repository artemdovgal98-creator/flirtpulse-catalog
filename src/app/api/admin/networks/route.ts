import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { query, create, getById, randomToken } from "@/lib/server/db";
import { invalidateNetworkSlugs } from "@/lib/server/offers";
import { okJson, errJson, serverError, getOrigin, str } from "./_lib/shared";
import { toClient, uniqueSlug, countByNetwork, NETWORK_STATUSES, type NetworkRow } from "./_lib/network";

export const dynamic = "force-dynamic";

/** Lists every affiliate network (secrets masked) with offer / conversion counts. */
export async function GET(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();

    const origin = getOrigin(request);
    const [rows, offers, conversions] = await Promise.all([
      query<NetworkRow>("affiliate_network", { _sort: { name: "asc" }, _limit: 500 }),
      countByNetwork("offer").catch((err) => {
        console.error("[API /admin/networks] offer counts failed:", err);
        return new Map<string, number>();
      }),
      countByNetwork("conversion").catch((err) => {
        console.error("[API /admin/networks] conversion counts failed:", err);
        return new Map<string, number>();
      }),
    ]);
    const items = rows.map((r) => toClient(r, origin, offers.get(r._id) ?? 0, conversions.get(r._id) ?? 0));
    console.log(`[API /admin/networks] listed ${items.length} networks`);
    return okJson({ items });
  } catch (err) {
    return serverError("GET /api/admin/networks", err);
  }
}

/** Creates a network: slug from the name (unique), random postback secret. */
export async function POST(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();

    const body = (await request.json()) as Record<string, unknown>;
    const name = str(body.name, 120);
    if (!name) return errJson("Name is required");

    const slug = await uniqueSlug(str(body.slug, 80) || name);
    const status = NETWORK_STATUSES.includes(body.status as any) ? String(body.status) : "pending";
    const record: Record<string, unknown> = {
      name,
      slug,
      link_template: str(body.link_template, 2000),
      api_url: str(body.api_url, 500),
      geo: str(body.geo, 300),
      payout_model: str(body.payout_model, 60),
      notes: str(body.notes, 4000),
      status,
      postback_secret: randomToken(16),
    };
    const apiKey = str(body.api_key, 500);
    if (apiKey) record.api_key = apiKey;

    const id = await create("affiliate_network", record);
    invalidateNetworkSlugs();
    await logAdmin(guard, "create", "affiliate_network", id, `Network "${name}" created (slug ${slug})`, {
      slug,
      has_api_key: Boolean(apiKey),
    });

    const row = await getById<NetworkRow>("affiliate_network", id);
    console.log(`[API /admin/networks] created ${id} "${name}" slug=${slug}`);
    return okJson({ item: toClient(row ?? ({ _id: id, ...record } as NetworkRow), getOrigin(request)) }, 201);
  } catch (err) {
    return serverError("POST /api/admin/networks", err);
  }
}
