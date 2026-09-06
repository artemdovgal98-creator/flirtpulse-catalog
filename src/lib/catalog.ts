/**
 * Shared, client-safe catalog constants and types.
 * Mirrors the Totalum `offer` table structure.
 */

export interface Offer {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  category?: string[];
  network?: string;
  payout_model?: string[];
  payout_amount?: number;
  payout_label?: string;
  geo?: string[];
  tags?: string;
  quality_score?: number;
  epc?: number;
  conversion_flow?: string;
  offer_url?: string;
  image_url?: string;
  launch_date?: string;
  is_featured?: string;
  status?: string;
  createdAt?: string;
}

export interface Favorite {
  _id: string;
  offer?: Offer | string;
  saved_at?: string;
}

export const CATEGORIES = ["dating", "webcam", "live_cams"] as const;
export type Category = (typeof CATEGORIES)[number];

export const PAYOUT_MODELS = ["pps", "soi", "doi", "revshare", "multi_cpa"] as const;
export type PayoutModel = (typeof PAYOUT_MODELS)[number];

export const PAYOUT_MODEL_LABELS: Record<string, string> = {
  pps: "PPS",
  soi: "SOI",
  doi: "DOI",
  revshare: "RevShare",
  multi_cpa: "Multi-CPA",
};

export const SORT_OPTIONS = ["relevance", "newest", "name", "quality"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

/** Every GEO available as a filter, in the order shown in the UI. */
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
};

export const CATEGORY_DOT: Record<string, string> = {
  dating: "bg-rose-400",
  webcam: "bg-violet-400",
  live_cams: "bg-cyan-400",
};

export const PAGE_SIZE = 24;
