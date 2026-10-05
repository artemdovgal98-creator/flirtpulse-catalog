import "server-only";

export interface TrackingVars {
  click_id: string;
  subid: string;
  category: string;
  geo: string;
  offer_id: string;
  network: string;
  lang: string;
}

const PLACEHOLDER = /\{(click_id|clickid|subid|sub_id|category|geo|offer_id|network|lang)\}/gi;

function fill(template: string, vars: TrackingVars): string {
  return template.replace(PLACEHOLDER, (_m, key: string) => {
    const k = key.toLowerCase();
    const value =
      k === "clickid" ? vars.click_id : k === "sub_id" ? vars.subid : (vars as any)[k] ?? "";
    return encodeURIComponent(String(value));
  });
}

/**
 * Builds the final destination of a click.
 *  - `{click_id}`, `{subid}`, `{category}`, `{geo}`, `{offer_id}`, `{network}`, `{lang}`
 *    placeholders inside the hidden link are replaced;
 *  - the SubID template (showcase first, then the network's link template) is
 *    appended as query parameters when the link has no `{click_id}` of its own.
 * Only http(s) results are accepted.
 */
export function buildDestination(offerUrl: string, subidTemplate: string, vars: TrackingVars): string | null {
  const hasOwnPlaceholder = /\{(click_id|clickid)\}/i.test(offerUrl);
  let url = fill(offerUrl, vars);

  const template = (subidTemplate || "").trim().replace(/^[?&]/, "");
  if (template && !hasOwnPlaceholder) {
    const extra = fill(template, vars);
    url += (url.includes("?") ? "&" : "?") + extra;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Domain used for duplicate detection ("www." stripped). */
export function domainOf(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}
