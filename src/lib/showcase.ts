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

/** Validates and normalises the admin showcase form payload. */
export function normaliseShowcase(
  body: ShowcasePayload
): { value: Record<string, any> } | { error: string } {
  const name = (body.name || "").trim();
  const category = (body.category || []).filter((c) => (CATEGORIES as readonly string[]).includes(c));

  if (!name) return { error: "Title is required" };
  if (!category.length) return { error: "At least one category is required" };

  const value: Record<string, any> = {
    name,
    description: (body.description || "").trim(),
    category,
    geo: (body.geo || []).filter(Boolean),
    tags: (body.tags || "").trim(),
    offer_url: (body.offer_url || "").trim(),
    status: body.status === "hidden" ? "hidden" : "active",
    is_featured: body.is_featured === "yes" ? "yes" : "no",
  };

  if (Array.isArray(body.images)) {
    // Totalum expects the COMPLETE array on every edit, capped at 3 images.
    value.images = body.images.filter((f) => f?.name).slice(0, 3).map((f) => ({ name: f.name }));
  }

  return { value };
}
