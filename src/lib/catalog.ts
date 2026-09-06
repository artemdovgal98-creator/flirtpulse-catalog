/**
 * Shared, client-safe catalog constants and types.
 *
 * IMPORTANT: the public interface never exposes partner networks, payouts or
 * tracking links. Those fields still exist in the database for the admin, but
 * `/api/offers` strips them before anything reaches the browser.
 */

export interface OfferImage {
  name: string;
  url: string;
}

export interface Offer {
  _id: string;
  name: string;
  description?: string;
  category?: string[];
  geo?: string[];
  tags?: string;
  quality_score?: number;
  image_url?: string;
  images?: OfferImage[];
  launch_date?: string;
  is_featured?: string;
  is_custom?: string;
  click_count?: number;
  status?: string;
  createdAt?: string;
}

/** Admin-only view of a showcase — includes the hidden tracking link. */
export interface AdminOffer extends Offer {
  slug?: string;
  offer_url?: string;
  network?: string;
  /** "yes" once the administrator has saved the card by hand. */
  admin_edited?: string;
}

export interface Favorite {
  _id: string;
  offer?: Offer | string;
  saved_at?: string;
}

export const CATEGORIES = ["dating", "webcam", "live_cams", "useful"] as const;
export type Category = (typeof CATEGORIES)[number];

export const SORT_OPTIONS = ["relevance", "newest", "name", "popular"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

/** Every region available as a filter, in the order shown in the UI. */
export const GEO_NAMES: Record<string, string> = {
  worldwide: "Worldwide",
  us: "United States",
  ca: "Canada",
  gb: "United Kingdom",
  au: "Australia",
  nz: "New Zealand",
  de: "Germany",
  fr: "France",
  es: "Spain",
  it: "Italy",
  pt: "Portugal",
  nl: "Netherlands",
  be: "Belgium",
  ch: "Switzerland",
  at: "Austria",
  se: "Sweden",
  no: "Norway",
  dk: "Denmark",
  fi: "Finland",
  ie: "Ireland",
  pl: "Poland",
  ua: "Ukraine",
  ru: "Russia",
  hu: "Hungary",
  cz: "Czechia",
  ro: "Romania",
  gr: "Greece",
  tr: "Turkey",
  br: "Brazil",
  mx: "Mexico",
  ar: "Argentina",
  cl: "Chile",
  co: "Colombia",
  za: "South Africa",
  ae: "United Arab Emirates",
  sa: "Saudi Arabia",
  il: "Israel",
  in: "India",
  jp: "Japan",
  kr: "South Korea",
  sg: "Singapore",
  ph: "Philippines",
  th: "Thailand",
  my: "Malaysia",
  id: "Indonesia",
  vn: "Vietnam",
};

export const GEO_CODES = Object.keys(GEO_NAMES);

export const GEO_FLAGS: Record<string, string> = {
  worldwide: "🌍",
  us: "🇺🇸", ca: "🇨🇦", gb: "🇬🇧", au: "🇦🇺", nz: "🇳🇿", de: "🇩🇪", fr: "🇫🇷",
  es: "🇪🇸", it: "🇮🇹", pt: "🇵🇹", nl: "🇳🇱", be: "🇧🇪", ch: "🇨🇭", at: "🇦🇹",
  se: "🇸🇪", no: "🇳🇴", dk: "🇩🇰", fi: "🇫🇮", ie: "🇮🇪", pl: "🇵🇱", ua: "🇺🇦",
  ru: "🇷🇺", hu: "🇭🇺", cz: "🇨🇿", ro: "🇷🇴", gr: "🇬🇷", tr: "🇹🇷", br: "🇧🇷",
  mx: "🇲🇽", ar: "🇦🇷", cl: "🇨🇱", co: "🇨🇴", za: "🇿🇦", ae: "🇦🇪", sa: "🇸🇦",
  il: "🇮🇱", in: "🇮🇳", jp: "🇯🇵", kr: "🇰🇷", sg: "🇸🇬", ph: "🇵🇭", th: "🇹🇭",
  my: "🇲🇾", id: "🇮🇩", vn: "🇻🇳",
};

/** Accent gradient per category — used for card glows and chips. */
export const CATEGORY_GRADIENT: Record<string, string> = {
  dating: "from-rose-500 to-fuchsia-600",
  webcam: "from-violet-500 to-indigo-600",
  live_cams: "from-cyan-400 to-blue-600",
  useful: "from-emerald-400 to-teal-600",
};

export const CATEGORY_DOT: Record<string, string> = {
  dating: "bg-rose-400",
  webcam: "bg-violet-400",
  live_cams: "bg-cyan-400",
  useful: "bg-emerald-400",
};

export const PAGE_SIZE = 24;

/**
 * Fields that must never leave the server on a public request.
 * `slug` is included because seeded slugs embed the internal source name.
 */
export const PRIVATE_OFFER_FIELDS = [
  "slug",
  "offer_url",
  "network",
  "payout_model",
  "payout_amount",
  "payout_label",
  "epc",
  "conversion_flow",
] as const;

/** Returns the best cover image for a card: uploaded images first, then the external URL. */
export function offerImages(offer: Offer): string[] {
  const uploaded = (offer.images ?? []).map((f) => f?.url).filter(Boolean) as string[];
  if (uploaded.length) return uploaded;
  return offer.image_url ? [offer.image_url] : [];
}
