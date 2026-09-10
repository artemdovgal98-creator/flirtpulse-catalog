/**
 * Server-safe list of the interface languages.
 *
 * It lives outside `i18n.tsx` (a "use client" module) so API routes can read the
 * real number of supported languages without pulling React into the server bundle.
 * `i18n.tsx` re-exports `LANGUAGES` from here, so there is a single source of truth.
 */

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["code"];

export const RTL_LANGS: Lang[] = ["ar"];

export const LANGUAGE_COUNT = LANGUAGES.length;
