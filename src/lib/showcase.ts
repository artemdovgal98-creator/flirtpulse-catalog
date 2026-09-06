import { CATEGORIES } from "@/lib/catalog";

export interface ShowcasePayload {
  name?: string;
  description?: string;
  category?: string[];
  geo?: string[];
  tags?: string;
  offer_url?: string;
  images?: Array<{ name: string }>;
  status?: string;
  is_featured?: string;
}

/**
 * Makes a pasted tracking link safe to hand to `NextResponse.redirect`.
 * Accepts `example.com/?a=1` and turns it into `https://example.com/?a=1`;
 * rejects anything that is not http(s) so no `javascript:` URL can be stored.
 */
function normaliseTrackingUrl(raw: string): { url: string } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { url: "" };

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { error: "Tracking link is not a valid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "Tracking link must start with http:// or https://" };
  }
  return { url: parsed.toString() };
}

/** Validates and normalises the admin showcase form payload. */
export function normaliseShowcase(
  body: ShowcasePayload
): { value: Record<string, any> } | { error: string } {
  const name = (body.name || "").trim();
  const category = (body.category || []).filter((c) => (CATEGORIES as readonly string[]).includes(c));

  if (!name) return { error: "Title is required" };
  if (!category.length) return { error: "At least one category is required" };

  const link = normaliseTrackingUrl(body.offer_url || "");
  if ("error" in link) return { error: link.error };

  const value: Record<string, any> = {
    name,
    description: (body.description || "").trim(),
    category,
    geo: (body.geo || []).filter(Boolean),
    tags: (body.tags || "").trim(),
    offer_url: link.url,
    status: body.status === "hidden" ? "hidden" : "active",
    is_featured: body.is_featured === "yes" ? "yes" : "no",
  };

  if (Array.isArray(body.images)) {
    // Totalum expects the COMPLETE array on every edit, capped at 3 images.
    value.images = body.images.filter((f) => f?.name).slice(0, 3).map((f) => ({ name: f.name }));
  }

  return { value };
}
