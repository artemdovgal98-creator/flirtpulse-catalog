import "server-only";
import { getById } from "@/lib/server/db";
import { decorateOffers } from "@/lib/server/offers";
import { hiddenCategoryKeys } from "@/lib/server/categories";
import type { Offer } from "@/lib/catalog";

/**
 * Loads one published showcase for the public site: private fields stripped,
 * localised, with badges and go_path. Returns null when it is not active or
 * all of its categories are hidden for the visitor's GEO.
 */
export async function getPublicOffer(id: string, lang: string, geo?: string): Promise<Offer | null> {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  const row = await getById<any>("offer", id);
  if (!row || row.status !== "active") {
    console.log(`[offer-page] ${id} is not public (status=${row?.status ?? "missing"})`);
    return null;
  }
  if (geo !== undefined) {
    const hidden = await hiddenCategoryKeys(geo);
    const cats: string[] = row.category || [];
    if (cats.length && cats.every((c) => hidden.includes(c))) {
      console.log(`[offer-page] ${id} hidden for geo "${geo || "-"}"`);
      return null;
    }
  }
  const [offer] = await decorateOffers([row], lang);
  return (offer as Offer) ?? null;
}
