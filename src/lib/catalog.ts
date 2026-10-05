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
  short_name?: string;
  /** FlirtPulse AI sub-filters: companion, girlfriend, boyfriend, chat, image, voice, video. */
  subfilters?: string[];
  /** Interface languages the service itself supports. */
  languages?: string[];
  /** Public access model: free / freemium / subscription / credits / paid. */
  access_model?: string;
  published_at?: string;
  /** Computed by the backend from real clicks: "new", "hit_week", "trending". */
  badges?: string[];
  clicks_7d?: number;
  /** Server-built tracking path /go/{category}/{network}/{showcase}. */
  go_path?: string;
}

/** Admin-only view of a showcase — includes the hidden tracking link. */
export interface AdminOffer extends Offer {
  slug?: string;
  offer_url?: string;
  network?: string;
  /** "yes" once the administrator has saved the card by hand. */
  admin_edited?: string;
  payout_model?: string;
  subid_template?: string;
  affiliate_network?: string | { _id: string; name?: string };
  archived_at?: string;
  check_result?: unknown;
}

/** Showcase workflow: Draft → Review → Published (active) → Archive. "paused" = hidden. */
export const SHOWCASE_STATUSES = ["draft", "review", "active", "paused", "archived"] as const;
export type ShowcaseStatus = (typeof SHOWCASE_STATUSES)[number];

export const AI_SUBFILTERS = ["companion", "girlfriend", "boyfriend", "chat", "image", "voice", "video"] as const;

export const ACCESS_MODELS = ["free", "freemium", "subscription", "credits", "paid"] as const;

export const PAYOUT_MODELS = ["cpa", "cpl", "cps", "cpi", "pps", "soi", "doi", "revshare", "multi_cpa", "hybrid"] as const;

/** Category as served by /api/categories (managed in the admin panel). */
export interface CatalogCategory {
  key: string;
  label: string;
  labels: Record<string, string>;
  emoji: string;
  color: string;
  subfilters: string[];
  geoOnly: string[];
}

export interface Favorite {
  _id: string;
  offer?: Offer | string;
  saved_at?: string;
}

export const CATEGORIES = ["dating", "webcam", "live_cams", "useful", "ai", "games", "sex_shop"] as const;
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
  ai: "from-fuchsia-500 to-purple-600",
  games: "from-amber-400 to-orange-600",
  sex_shop: "from-red-500 to-rose-700",
};

/** Colour presets selectable for admin-created categories. */
export const COLOR_GRADIENT: Record<string, string> = {
  rose: "from-rose-500 to-fuchsia-600",
  violet: "from-violet-500 to-indigo-600",
  cyan: "from-cyan-400 to-blue-600",
  emerald: "from-emerald-400 to-teal-600",
  fuchsia: "from-fuchsia-500 to-purple-600",
  amber: "from-amber-400 to-orange-600",
  red: "from-red-500 to-rose-700",
  indigo: "from-indigo-500 to-blue-700",
};

export const COLOR_SOFT: Record<string, string> = {
  rose: "from-rose-500/20 to-fuchsia-600/10",
  violet: "from-violet-500/20 to-indigo-600/10",
  cyan: "from-cyan-500/20 to-blue-600/10",
  emerald: "from-emerald-500/20 to-teal-600/10",
  fuchsia: "from-fuchsia-500/25 to-purple-600/10",
  amber: "from-amber-500/20 to-orange-600/10",
  red: "from-red-500/20 to-rose-700/10",
  indigo: "from-indigo-500/20 to-blue-700/10",
};

export const COLOR_DOT: Record<string, string> = {
  rose: "bg-rose-400",
  violet: "bg-violet-400",
  cyan: "bg-cyan-400",
  emerald: "bg-emerald-400",
  fuchsia: "bg-fuchsia-400",
  amber: "bg-amber-400",
  red: "bg-red-400",
  indigo: "bg-indigo-400",
};

export const CATEGORY_DOT: Record<string, string> = {
  dating: "bg-rose-400",
  webcam: "bg-violet-400",
  live_cams: "bg-cyan-400",
  useful: "bg-emerald-400",
  ai: "bg-fuchsia-400",
  games: "bg-amber-400",
  sex_shop: "bg-red-400",
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
  "affiliate_network",
  "subid_template",
  "check_result",
  "admin_edited",
] as const;

/** Returns the best cover image for a card: uploaded images first, then the external URL. */
export function offerImages(offer: Offer): string[] {
  const uploaded = (offer.images ?? []).map((f) => f?.url).filter(Boolean) as string[];
  if (uploaded.length) return uploaded;
  return offer.image_url ? [offer.image_url] : [];
}

/** Public tracking path: /go/{category}/{network}/{showcase}. Network is a neutral slug. */
export function goPath(offer: Offer): string {
  if (offer.go_path) return offer.go_path;
  const category = (offer.category ?? [])[0] || "catalog";
  return `/go/${category}/direct/${offer._id}`;
}
