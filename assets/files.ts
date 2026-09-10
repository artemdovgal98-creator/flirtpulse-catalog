/**
 * Static assets hashmap for FlirtPulse AI.
 * Every image / logo / icon used across the project MUST be referenced from here.
 */

export const files = {
  // Offer card covers (validated Unsplash URLs — neon / nightlife / abstract)
  cover01: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
  cover02: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
  cover03: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
  cover04: "https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=800&q=80",
  cover05: "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=800&q=80",
  cover06: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&q=80",
  cover07: "https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=800&q=80",
  cover08: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80",
  cover09: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80",
  cover10: "https://images.unsplash.com/photo-1502136969935-8d8eef54d77b?w=800&q=80",
  cover11: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
  cover12: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80",
  cover13: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
  cover14: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&q=80",
  cover15: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&q=80",
  cover16: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80",
} as const;

export type FileKey = keyof typeof files;

/** Ordered list of offer cover images, used to give every vitrine a cover. */
export const offerCovers: string[] = [
  files.cover01, files.cover02, files.cover03, files.cover04,
  files.cover05, files.cover06, files.cover07, files.cover08,
  files.cover09, files.cover10, files.cover11, files.cover12,
  files.cover13, files.cover14, files.cover15, files.cover16,
];

/**
 * Company / partner logos shown on the home page and in the services catalog.
 * Every URL below was verified to return a real image before being added here.
 */
export const companyLogos = {
  zeydoo: "https://www.google.com/s2/favicons?domain=zeydoo.com&sz=256",
  // Locally drawn monogram: Avwin publishes no public logo file.
  avwin: "/logos/avwin.svg",
  mylead: "https://www.google.com/s2/favicons?domain=mylead.global&sz=256",
  crakrevenue: "https://www.google.com/s2/favicons?domain=crakrevenue.com&sz=256",
  aiveksa: "https://www.google.com/s2/favicons?domain=aivix.com&sz=256",
} as const;

export type CompanyLogoKey = keyof typeof companyLogos;

export default files;
