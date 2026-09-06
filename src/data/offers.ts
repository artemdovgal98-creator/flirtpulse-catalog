/**
 * FlirtPulse AI — affiliate offer catalog seed dataset.
 *
 * Row format (kept compact on purpose so the catalog stays easy to extend):
 *   [ name, categories, payoutModels, amount, geos, tags, qualityScore ]
 *
 *   categories   "d" = dating | "w" = webcam | "l" = live cams (combine: "dw")
 *   payoutModels "p" = PPS | "s" = SOI | "o" = DOI | "r" = RevShare | "m" = Multi-CPA
 *   amount       USD payout, or the percentage when the model is RevShare
 *   geos         space separated ISO-2 codes, or "ww" for worldwide / no GEO restriction
 *
 * To add more vitrines: append rows here and re-run POST /api/offers/seed.
 */

import { offerCovers } from "../../assets/files";

export type OfferRow = [string, string, string, number, string, string, number];

const CAT_MAP: Record<string, string> = { d: "dating", w: "webcam", l: "live_cams" };
const MODEL_MAP: Record<string, string> = {
  p: "pps",
  s: "soi",
  o: "doi",
  r: "revshare",
  m: "multi_cpa",
};

/** The 106 approved CrakRevenue offers pre-configured in the catalog. */
export const CRAKREVENUE_ROWS: OfferRow[] = [
  ["BeNaughty", "d", "s", 4, "us ca gb au", "casual,mainstream,mobile,top", 92],
  ["Flirt.com", "d", "s", 3.5, "us ca gb au nz", "flirt,casual,mainstream", 90],
  ["Together2Night", "d", "s", 3.2, "us ca gb", "hookup,night,casual", 86],
  ["IWantU", "d", "s", 3, "us ca au", "casual,mainstream", 82],
  ["Cheekylovers", "d", "s", 2.8, "us gb ie", "playful,casual", 79],
  ["WantMatures", "d", "s", 3.4, "us ca gb", "milf,mature", 84],
  ["OneNightFriend", "d", "s", 3.1, "us ca au nz", "hookup,casual", 83],
  ["NaughtyDate", "d", "s", 3.3, "us ca gb", "casual,hookup", 85],
  ["QuickFlirt", "d", "s", 2.9, "us ca gb au", "flirt,casual", 78],
  ["Iamnaughty", "d", "s", 2.7, "us gb", "casual,mainstream", 76],
  ["WildBuddies", "d", "s", 3, "us ca", "hookup,casual", 80],
  ["TenderMeets", "d", "o", 4.5, "us ca gb au", "serious,doi,relationship", 81],
  ["MeetVille", "d", "o", 4.2, "us ca gb", "serious,relationship", 77],
  ["LoveAgain", "d", "o", 4, "us ca gb au", "mature,serious", 75],
  ["FastFlirting", "d", "s", 2.5, "ww", "flirt,worldwide,nogeo", 72],
  ["XPress", "d", "p", 32, "us ca gb au", "hookup,pps,premium", 88],
  ["Fling", "d", "p", 38, "us ca", "hookup,pps,premium", 91],
  ["AdultFriendFinder", "d", "p", 42, "us ca gb au", "flagship,pps,premium,top", 96],
  ["SnapSext", "d", "p", 34, "us ca", "sexting,pps", 87],
  ["Instabang", "d", "p", 30, "us ca gb", "hookup,pps", 84],
  ["UberHorny", "d", "p", 28, "us ca au", "hookup,pps", 82],
  ["Ashley Madison", "d", "p", 45, "us ca gb au fr de", "affair,discreet,premium,top", 97],
  ["Victoria Milan", "d", "p", 36, "de at ch se no dk fi", "affair,europe,discreet", 85],
  ["C-Date", "d", "o", 6.5, "de at ch nl be", "casual,europe,doi", 83],
  ["Fuckbook", "d", "p", 29, "us ca gb", "social,pps,hookup", 80],
  ["MilfFinder", "d", "s", 3.6, "us ca gb au", "milf,mature", 81],
  ["LocalFlirt", "d", "s", 2.8, "us ca", "local,casual", 74],
  ["Xdating", "d", "s", 3.1, "us ca gb", "casual,hookup", 77],
  ["MeetSlavicGirls", "d", "m", 5.5, "us ca gb de fr", "slavic,international,romance", 79],
  ["SofiaDate", "d", "m", 6, "us ca gb au de", "international,romance,premium", 86],
  ["LatinFeels", "d", "m", 5.8, "us ca gb es", "latin,romance,international", 84],
  ["AmourFactory", "d", "m", 5.6, "us ca gb de", "romance,international", 80],
  ["JollyRomance", "d", "m", 5.4, "us ca au", "romance,international", 78],
  ["VictoriaHearts", "d", "m", 5.9, "us ca gb", "romance,slavic", 82],
  ["DateMyAge", "d", "m", 5.2, "us ca gb au", "mature,international", 81],
  ["BravoDate", "d", "m", 6.2, "us ca gb de fr", "international,romance", 83],
  ["TheLuckyDate", "d", "m", 5, "us ca gb au", "mainstream,romance", 79],
  ["AsianMelodies", "d", "m", 5.7, "us ca au sg", "asian,romance,international", 82],
  ["EasternHoneys", "d", "m", 6.1, "us ca gb au", "asian,romance,premium", 85],
  ["OrchidRomance", "d", "m", 5.3, "us ca gb", "asian,romance", 77],
  ["GoDateNow", "d", "m", 5.1, "us ca gb de", "slavic,romance", 76],
  ["LatamDate", "d", "m", 5.6, "us ca es mx", "latin,romance", 80],
  ["Charmerly", "d", "m", 4.9, "us ca gb", "international,romance", 74],
  ["UkraineBride4you", "d", "m", 5.4, "us ca gb au", "slavic,romance", 75],
  ["Chaturbate — Global RevShare", "w", "r", 20, "ww", "freemium,revshare,top,nogeo", 98],
  ["Chaturbate — PPL", "w", "p", 3, "us ca gb au de", "freemium,ppl,pps", 94],
  ["Stripchat", "w", "r", 30, "ww", "freemium,revshare,top,nogeo", 95],
  ["Stripchat — Multi-CPA", "w", "m", 4.2, "us ca gb de fr", "freemium,multicpa", 90],
  ["LiveJasmin", "w", "m", 5, "us ca gb de fr it es", "premium,hd,top", 96],
  ["LiveJasmin — RevShare", "w", "r", 35, "ww", "premium,revshare,nogeo", 93],
  ["BongaCams", "w", "r", 25, "ww", "freemium,revshare,nogeo", 89],
  ["MyFreeCams", "w", "p", 25, "us ca gb au", "freemium,pps", 87],
  ["CamSoda", "w", "m", 4.5, "us ca gb au", "freemium,multicpa", 88],
  ["Flirt4Free", "w", "p", 45, "us ca gb au de", "premium,pps,hd", 92],
  ["ImLive", "w", "p", 40, "ww", "veteran,pps,nogeo", 86],
  ["Cams.com", "w", "p", 38, "us ca gb au", "premium,pps", 88],
  ["XLoveCam", "w", "r", 30, "fr de it es be ch", "europe,revshare", 82],
  ["Streamate", "w", "m", 4.8, "us ca gb au de", "premium,multicpa", 90],
  ["Cam4", "w", "r", 28, "ww", "freemium,revshare,nogeo", 84],
  ["Royal Cams", "w", "r", 26, "ww", "freemium,nogeo", 79],
  ["Camster", "w", "p", 30, "us ca gb", "freemium,pps", 78],
  ["CamContacts", "w", "p", 35, "us gb au", "niche,pps", 74],
  ["MyDirtyHobby", "w", "p", 42, "de at ch", "german,amateur,pps", 85],
  ["Sexier", "w", "p", 33, "us ca gb", "premium,pps", 76],
  ["Camversity", "w", "r", 24, "us ca", "freemium,revshare", 72],
  ["Amateur.tv", "w", "r", 27, "es mx ar cl co", "spanish,amateur,latam", 77],
  ["xHamsterLive", "w", "r", 29, "ww", "tube,freemium,nogeo", 88],
  ["Jerkmate", "w", "m", 5.5, "us ca gb au de fr", "flagship,ai-match,top", 99],
  ["Jerkmate — RevShare", "w", "r", 40, "ww", "flagship,revshare,nogeo,top", 95],
  ["Cherry.tv", "w", "r", 30, "us ca gb de", "new,freemium,revshare", 83],
  ["Naked.com", "w", "p", 36, "us ca gb au", "premium,pps", 80],
  ["BimBim", "w", "m", 4, "ww", "freemium,nogeo", 75],
  ["LiveSexAsian", "w", "m", 4.3, "us ca au sg jp", "asian,premium", 78],
  ["StripCash", "w", "r", 32, "ww", "revshare,network,nogeo", 86],
  ["Camsloveaholics", "w", "r", 25, "ww", "freemium,nogeo", 71],
  ["Chaturbate — DACH Vitrine", "w", "m", 4.4, "de at ch", "german,dach,multicpa", 87],
  ["Stripchat — LATAM Vitrine", "w", "m", 3.6, "br mx ar cl co", "latam,freemium", 84],
  ["LiveJasmin — Nordics", "w", "m", 5.4, "se no dk fi", "nordics,premium", 85],
  ["Slutroulette", "l", "m", 4.6, "us ca gb au", "roulette,live,multicpa", 89],
  ["Chatrandom", "l", "s", 2.4, "ww", "roulette,nogeo", 80],
  ["DirtyRoulette", "l", "m", 3.8, "us ca gb", "roulette,adult", 82],
  ["Shagle", "l", "s", 2.6, "ww", "roulette,nogeo", 81],
  ["CamSurf", "l", "s", 2.2, "ww", "roulette,nogeo", 74],
  ["Bazoocam", "l", "s", 2.3, "fr be ch ca", "roulette,french", 72],
  ["ChatSpin", "l", "s", 2.5, "ww", "roulette,nogeo", 76],
  ["Flingster", "l", "m", 4.1, "us ca gb au", "roulette,adult", 83],
  ["CooMeet", "l", "p", 30, "us ca gb de fr", "premium,roulette,pps", 87],
  ["CamGo", "l", "s", 2.4, "ww", "roulette,nogeo", 73],
  ["Emerald Chat", "l", "s", 2.1, "ww", "roulette,nogeo", 70],
  ["LuckyCrush", "l", "p", 32, "us ca gb au de", "premium,roulette,pps", 88],
  ["Chatiw Live", "l", "s", 2, "ww", "chat,nogeo", 68],
  ["FreeChatNow", "l", "s", 2.2, "us ca gb", "chat,roulette", 69],
  ["CamFrog Live", "l", "p", 26, "ww", "community,pps,nogeo", 71],
  ["OmeTV Adult", "l", "s", 2.3, "ww", "roulette,nogeo", 72],
  ["Chatroulette Plus", "l", "m", 3.5, "us ca gb", "roulette,multicpa", 77],
  ["Jerkmate Games", "wl", "m", 5, "us ca gb au", "games,interactive,flagship", 91],
  ["Chaturbate Apps", "w", "r", 22, "ww", "apps,revshare,nogeo", 79],
  ["Stripchat VR", "wl", "m", 4.8, "us ca gb de", "vr,innovation,live", 84],
  ["FuckbookHookups", "d", "s", 3.2, "us ca gb au", "hookup,casual", 78],
  ["MeetMilfy", "d", "s", 3.5, "us ca gb", "milf,mature", 80],
  ["HornyMatches", "d", "s", 3, "us ca", "hookup,casual", 75],
  ["AdultCamLover", "lw", "m", 4.2, "us ca gb au", "live,hybrid,multicpa", 79],
  ["LiveJasmin Mobile", "w", "m", 5.1, "ww", "mobile,premium,nogeo", 90],
  ["Cams.com — RevShare", "w", "r", 35, "ww", "premium,revshare,nogeo", 84],
  ["Flirt4Free — RevShare", "w", "r", 33, "ww", "premium,revshare,nogeo", 83],
  ["BeNaughty — DOI Premium", "d", "o", 5.5, "us ca gb au", "casual,doi,premium", 89],
];

/** Additional vitrines available through other partner networks. */
export const PARTNER_ROWS: Array<[...OfferRow, string]> = [
  ["Amorina", "d", "s", 3.4, "de at ch", "dach,casual", 81, "Advidi"],
  ["FlirtWave", "d", "s", 2.9, "nl be lu", "benelux,casual", 78, "Advidi"],
  ["MatchPulse", "d", "o", 4.8, "us ca", "serious,doi", 84, "Advidi"],
  ["DateBoom", "d", "s", 2.6, "pl cz hu ro", "cee,casual", 76, "AdCombo"],
  ["SecretTouch", "d", "p", 27, "gb ie", "affair,discreet", 82, "Advidi"],
  ["MidnightMatch", "d", "s", 3.1, "us ca au nz", "night,casual", 80, "ClickDealer"],
  ["VelvetDate", "d", "m", 5.2, "fr be ch", "french,romance", 79, "ClickDealer"],
  ["NeonHearts", "d", "s", 2.8, "es pt", "iberia,casual", 75, "AdCombo"],
  ["PulseDate", "d", "o", 4.4, "au nz", "oceania,serious", 77, "MaxBounty"],
  ["Cupidly", "d", "s", 3, "it gr", "south-europe,casual", 74, "AdCombo"],
  ["RougeMeet", "d", "m", 5.5, "fr ca be", "french,romance", 80, "ClickDealer"],
  ["LunaFlirt", "d", "s", 2.7, "tr", "turkey,casual", 71, "AdCombo"],
  ["SilkRomance", "d", "m", 5.8, "us ca gb", "romance,premium", 83, "Dating Factory"],
  ["EmberDate", "d", "s", 3.2, "se no dk fi", "nordics,casual", 82, "Advidi"],
  ["ScarletChat", "d", "s", 2.9, "ua pl", "cee,casual", 73, "AdCombo"],
  ["ObsidianDate", "d", "p", 31, "us ca gb", "premium,hookup", 85, "MaxBounty"],
  ["AuroraMeet", "d", "o", 4.6, "ie gb", "serious,doi", 76, "Dating Factory"],
  ["CrimsonFlirt", "d", "s", 3.3, "us ca", "casual,hookup", 79, "MaxBounty"],
  ["MoonlitDate", "d", "s", 2.5, "br mx ar", "latam,casual", 74, "LosPollos"],
  ["GildedHearts", "d", "m", 6, "us ca gb au", "premium,romance", 86, "Dating Factory"],
  ["HeatSeeker", "d", "p", 33, "us", "hookup,premium", 84, "MaxBounty"],
  ["Nocturna", "d", "s", 3, "es mx co cl", "spanish,casual", 77, "LosPollos"],
  ["ChicMatch", "d", "o", 5, "fr", "french,doi", 78, "ClickDealer"],
  ["IndigoDate", "d", "s", 2.8, "in ph th my id", "apac,casual", 70, "Mobidea"],
  ["SeraphimMeet", "d", "m", 5.1, "us ca gb", "romance,international", 79, "Dating Factory"],
  ["FirefliesDating", "d", "s", 3.1, "ww", "nogeo,casual", 75, "Traffic Company"],
  ["BlushLocal", "d", "s", 2.7, "gb ie au nz", "local,casual", 76, "Traffic Company"],
  ["VenusCircle", "d", "m", 5.4, "us ca gb de", "romance,premium", 81, "Golden Goose"],
  ["OpalDate", "d", "o", 4.3, "za ae il", "emerging,doi", 72, "Mobidea"],
  ["TwilightFlirt", "d", "s", 2.6, "jp kr sg", "asia,casual", 73, "Mobidea"],
  ["CamAurora", "w", "r", 28, "ww", "freemium,revshare,nogeo", 84, "TrafficStars"],
  ["NeonCams", "w", "m", 4.1, "us ca gb", "freemium,multicpa", 82, "TrafficStars"],
  ["VelvetCams", "w", "p", 34, "us ca gb au", "premium,pps", 83, "PlugRush"],
  ["PulseCams", "w", "r", 31, "ww", "revshare,nogeo", 80, "TrafficStars"],
  ["LiveEmber", "w", "m", 4.6, "de at ch", "dach,premium", 85, "Advidi"],
  ["CamNocturne", "w", "r", 26, "fr be ch", "french,revshare", 78, "TrafficStars"],
  ["SilkCams", "w", "p", 37, "us ca", "premium,pps", 84, "PlugRush"],
  ["RougeCams", "w", "m", 4.4, "es it pt", "south-europe,freemium", 77, "Adsterra"],
  ["MidnightCams", "w", "r", 29, "ww", "freemium,nogeo", 79, "Adsterra"],
  ["ScarletCams", "w", "m", 4.7, "se no dk fi", "nordics,premium", 83, "Advidi"],
  ["AmberLive", "w", "r", 27, "br mx ar cl", "latam,revshare", 76, "LosPollos"],
  ["CobaltCams", "w", "p", 32, "gb ie", "premium,pps", 80, "PlugRush"],
  ["OrionCams", "w", "m", 4.3, "pl cz hu ro", "cee,freemium", 74, "AdCombo"],
  ["ZephyrCams", "w", "r", 30, "ww", "revshare,nogeo", 78, "TrafficStars"],
  ["LumenCams", "w", "m", 5, "us ca gb au de", "premium,multicpa", 86, "Golden Goose"],
  ["NovaCams", "w", "r", 33, "ww", "revshare,nogeo,new", 81, "TrafficStars"],
  ["CrystalCams", "w", "p", 35, "au nz", "oceania,premium", 79, "MaxBounty"],
  ["EclipseCams", "w", "m", 4.2, "tr ae sa il", "mena,freemium", 71, "Adsterra"],
  ["SolsticeCams", "w", "r", 28, "jp kr sg th", "asia,revshare", 75, "Mobidea"],
  ["PrismCams", "w", "m", 4.9, "us ca", "premium,multicpa", 85, "Golden Goose"],
  ["RouletteNeon", "l", "s", 2.4, "ww", "roulette,nogeo", 77, "Adsterra"],
  ["FlashChat Live", "l", "m", 3.7, "us ca gb", "roulette,live", 79, "PlugRush"],
  ["PulseRoulette", "l", "s", 2.2, "ww", "roulette,nogeo", 73, "Adsterra"],
  ["SpinFlirt", "l", "m", 3.9, "de at ch", "dach,roulette", 81, "Advidi"],
  ["InstaCam Live", "l", "p", 28, "us ca gb au", "premium,roulette", 84, "MaxBounty"],
  ["OrbitChat", "l", "s", 2.3, "fr be", "french,roulette", 72, "ClickDealer"],
  ["HaloRoulette", "l", "s", 2.5, "es mx ar", "latam,roulette", 74, "LosPollos"],
  ["QuartzLive", "l", "m", 4, "se no dk fi", "nordics,live", 80, "Advidi"],
  ["VortexCam", "l", "p", 29, "us ca", "premium,roulette", 83, "MaxBounty"],
  ["SableChat", "l", "s", 2.1, "pl cz hu ua", "cee,roulette", 70, "AdCombo"],
];

/** GEO packs used to build additional localized vitrines of the strongest offers. */
const GEO_PACKS: Array<[string, string, string]> = [
  ["DACH", "de at ch", "dach"],
  ["Nordics", "se no dk fi", "nordics"],
  ["CEE", "pl cz hu ro", "cee"],
  ["LATAM", "br mx ar cl co", "latam"],
  ["Benelux", "nl be", "benelux"],
  ["APAC", "jp kr sg th ph", "apac"],
  ["Iberia", "es pt", "iberia"],
  ["Tier-1", "us ca gb au", "tier1"],
];

const VITRINE_BASES: Array<[string, string, string, number, string]> = [
  ["Jerkmate", "w", "m", 5.5, "flagship,ai-match"],
  ["Chaturbate", "w", "r", 26, "freemium,revshare"],
  ["Stripchat", "w", "m", 4.2, "freemium,multicpa"],
  ["LiveJasmin", "w", "m", 5, "premium,hd"],
  ["BeNaughty", "d", "s", 3.6, "casual,mainstream"],
  ["AdultFriendFinder", "d", "p", 38, "flagship,pps"],
  ["Flirt.com", "d", "s", 3.2, "flirt,casual"],
  ["Slutroulette", "l", "m", 4.3, "roulette,live"],
];

export interface OfferSeed {
  name: string;
  slug: string;
  description: string;
  category: string[];
  network: string;
  payout_model: string[];
  payout_amount: number;
  payout_label: string;
  geo: string[];
  tags: string;
  quality_score: number;
  epc: number;
  conversion_flow: string;
  offer_url: string;
  image_url: string;
  launch_date: string;
  is_featured: string;
  status: string;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function payoutLabel(models: string[], amount: number): string {
  const primary = models[0];
  if (primary === "revshare") return `${amount}% RevShare`;
  const pretty: Record<string, string> = {
    pps: "PPS",
    soi: "SOI",
    doi: "DOI",
    multi_cpa: "Multi-CPA",
  };
  return `$${amount.toFixed(2)} ${pretty[primary] ?? primary.toUpperCase()}`;
}

const FLOWS: Record<string, string[]> = {
  pps: ["Sign-up + first purchase", "Credit card submit", "Paid membership"],
  soi: ["Single opt-in — email confirm not required", "Free registration", "Profile created"],
  doi: ["Double opt-in — email confirmed", "Confirmed registration"],
  revshare: ["Lifetime revenue share on spenders", "Revenue share on all member spend"],
  multi_cpa: ["Multi-CPA: free sign-up + upsell", "Hybrid CPA on registration and sale"],
};

function describe(name: string, cats: string[], models: string[], geos: string[]): string {
  const cat =
    cats.includes("webcam") && cats.includes("live_cams")
      ? "hybrid webcam & live cam"
      : cats.includes("webcam")
        ? "webcam"
        : cats.includes("live_cams")
          ? "live cam"
          : "dating";
  const geoText = geos.includes("worldwide")
    ? "worldwide with no GEO restriction"
    : `optimised for ${geos.slice(0, 4).map((g) => g.toUpperCase()).join(", ")}`;
  const flow = (FLOWS[models[0]] ?? ["Standard conversion flow"])[0];
  return `${name} is a high-converting ${cat} vitrine, ${geoText}. Conversion flow: ${flow.toLowerCase()}. Mobile and desktop creatives, smartlink ready, 24/7 tracking.`;
}

function buildOffer(row: OfferRow, network: string, index: number): OfferSeed {
  const [name, cats, models, amount, geos, tags, quality] = row;

  const category = cats.split("").map((c) => CAT_MAP[c]).filter(Boolean);
  const payout_model = models.split("").map((m) => MODEL_MAP[m]).filter(Boolean);
  const geo = geos === "ww" ? ["worldwide"] : geos.split(" ").filter(Boolean);

  // Deterministic "random" values so re-seeding always produces the same catalog.
  const seed = (index * 2654435761) % 4294967296;
  const epc = Math.round(((seed % 260) / 100 + 0.35) * 100) / 100;
  const daysAgo = seed % 900;
  const launch = new Date(Date.now() - daysAgo * 86400000);

  return {
    name,
    slug: slugify(`${name}-${network}`),
    description: describe(name, category, payout_model, geo),
    category,
    network,
    payout_model,
    payout_amount: amount,
    payout_label: payoutLabel(payout_model, amount),
    geo,
    tags,
    quality_score: quality,
    epc,
    conversion_flow: (FLOWS[payout_model[0]] ?? ["Standard conversion flow"])[seed % (FLOWS[payout_model[0]]?.length ?? 1)],
    offer_url: `https://www.crakrevenue.com/offers/${slugify(name)}/`,
    image_url: offerCovers[index % offerCovers.length],
    launch_date: launch.toISOString(),
    is_featured: quality >= 90 ? "yes" : "no",
    status: "active",
  };
}

/** Builds the complete catalog: 106 CrakRevenue offers + partner offers + GEO vitrines. */
export function buildOfferSeeds(): OfferSeed[] {
  const seeds: OfferSeed[] = [];

  CRAKREVENUE_ROWS.forEach((row, i) => seeds.push(buildOffer(row, "CrakRevenue", i)));

  PARTNER_ROWS.forEach((row, i) => {
    const network = row[7];
    seeds.push(buildOffer(row.slice(0, 7) as OfferRow, network, CRAKREVENUE_ROWS.length + i));
  });

  let cursor = seeds.length;
  VITRINE_BASES.forEach(([base, cats, models, amount, tags]) => {
    GEO_PACKS.forEach(([packName, packGeos, packTag]) => {
      const row: OfferRow = [
        `${base} — ${packName} Vitrine`,
        cats,
        models,
        amount,
        packGeos,
        `${tags},${packTag},vitrine`,
        Math.max(60, 88 - (cursor % 17)),
      ];
      seeds.push(buildOffer(row, "CrakRevenue", cursor));
      cursor += 1;
    });
  });

  return seeds;
}

export const TOTAL_SEED_COUNT =
  CRAKREVENUE_ROWS.length + PARTNER_ROWS.length + VITRINE_BASES.length * GEO_PACKS.length;
