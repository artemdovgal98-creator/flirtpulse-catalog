"use client";

/** "Recently viewed" showcases and viewed categories, kept on this device only. */

const RECENT_KEY = "flirtpulse_recent";
const CATS_KEY = "flirtpulse_viewed_categories";
const MAX = 12;

export function getRecent(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

/** Remembers a viewed showcase (most recent first) and counts its categories. */
export function pushRecent(offerId: string, categories: string[] = []) {
  try {
    const next = [offerId, ...getRecent().filter((id) => id !== offerId)].slice(0, MAX);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    const counts = getViewedCategories();
    for (const c of categories) counts[c] = (counts[c] || 0) + 1;
    window.localStorage.setItem(CATS_KEY, JSON.stringify(counts));
    window.dispatchEvent(new Event("fp-recent"));
  } catch (err) {
    console.error("[recent] could not store recently viewed:", err);
  }
}

/** { category: views } — used by the "For you" block. */
export function getViewedCategories(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(CATS_KEY) || "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function countCategoryView(category: string) {
  try {
    const counts = getViewedCategories();
    counts[category] = (counts[category] || 0) + 1;
    window.localStorage.setItem(CATS_KEY, JSON.stringify(counts));
  } catch (err) {
    console.error("[recent] could not count category view:", err);
  }
}
