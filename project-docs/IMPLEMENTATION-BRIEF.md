# FlirtPulse — extension brief (stage 1 + stage 2)

Existing Next.js 15 app (dark + neon purple/pink, glassmorphism, mobile-first). EXTEND it — never break users, login,
favourites, showcases, redirects, SEO, search. No offerwall, coins, wallet, withdrawals, fake data. All calculations on the backend.
All user-visible strings go through `t()` from `useI18n()` (`src/lib/i18n.tsx`); add new keys to YOUR i18n-extra file
(`en` = English source, `ru` = Russian). The other 10 languages are machine-translated by `/api/i18n/[lang]` automatically.
Use `t(key, {var})` with `{var}` placeholders.

## Rules (CLAUDE.md)
- API routes return `{ ok: true, data }` / `{ ok: false, error }` with status. No top-level named keys.
- Client components use `api.get/post/put/delete/upload` from `src/lib/api.ts` (never raw fetch). `/api/admin*` calls auto-send the admin token.
- TotalumSDK server-only (`import { totalumSdk } from "@/lib/totalum"`); prefer helpers in `src/lib/server/db.ts`
  (query, queryAll, count, getById, create→id, update, remove, parseJson, csv, randomToken, mask).
- `<img>` only (no next/image). No `export const runtime = "edge"`. Don't touch cloudflare/wrangler files. No git. No .env edits.
- console.log important steps; never swallow errors silently.
- Auth: `auth.api.getSession({ headers: await headers() })` from `@/lib/auth`; user id is `session.user.id`.
- Type-cast JSON: `(await req.json()) as {...}`.
- File fields come back as `{ name, url }` — display `url`.
- Do NOT run `npm run build` (the lead runs it at the end; parallel builds clash). You MAY run `npx tsc --noEmit --skipLibCheck` to check your files; ignore errors in files owned by other agents.

## Shared server helpers (already written — read them, don't rewrite)
- `src/lib/admin.ts`: `getAdminGuard()` → `{ isAdmin, role, userId, email, ... }`, `forbidden()`, `logAdmin(guard, action, entity, entityId, summary, details?)` → writes `admin_log`.
- `src/lib/server/offers.ts`: PRIVATE_FIELDS, OMIT_PRIVATE, OMIT_FOR_QUERY, stripPrivate, localizeOffers(items, lang), retranslateOffer(offer),
  getBadgeMap() (hit_week / trending from real clicks), isNewOffer, decorateOffers(items, lang) → adds go_path, badges, clicks_7d + localisation,
  getNetworkSlugs/invalidateNetworkSlugs/slugifyNetwork/buildGoPath.
- `src/lib/server/categories.ts`: getCategoryRows, invalidateCategories, toPublicCategory, visibleCategories(geo), hiddenCategoryKeys(geo).
- `src/lib/server/geo.ts`: detectGeo(headers) → "UA"/"DE"/… or "".
- `src/lib/server/settings.ts`: getSetting/getSettings/setSetting (`app_setting` table). Secret keys: telegram_bot_token, vapid_private_jwk.
  Public keys: telegram_channel_url, catalog_ad_every, push_enabled. Others: telegram_chat_id, telegram_autopost ("yes"/"no").
- `src/lib/server/translate.ts`: translateMap(entries, lang), translateToAll(text) → {lang:text}, pickTranslation(original, translations, lang), ALL_LANGS.
- `src/lib/server/ui-i18n.ts`: getUiStrings, setManualStrings(lang, edits), getEditableStrings(lang).
- `src/lib/server/webpush.ts`: getVapidKeys() → { publicKey (b64url) ... }, sendPush(endpoint), pushToSubscribers(category?).
- `src/lib/server/telegram.ts`: sendTelegram(text) (HTML parse mode), escapeHtml.
- `src/lib/server/announce.ts`: announceShowcase(offer, origin) — ticker item + bell notification + push + telegram autopost, once per offer.
- `src/lib/server/tracking.ts`: buildDestination(offerUrl, subidTemplate, vars), domainOf(url).
- Tracking route `/go/{category}/{networkSlug|direct}/{offerId}` (src/app/go/[...path]/route.ts) — query `v` (visitor id), `lang`, `sub`. Legacy `/go/{id}` still works.
- Postback `/api/postback/{networkSlug}?secret=…&click_id=…&transaction_id=…&payout=…&currency=…&status=…` (done).
- `/api/offers` (public): params q, category, sub, geo, sort (newest|name|popular), lang, ids (csv), limit, offset → `{ items, total, offset, limit, hasMore, geo }`; items include go_path, badges, clicks_7d.
- `/api/categories` → `{ categories: CatalogCategory[], geo }`; client: `useCategories()` from `src/components/CategoriesProvider.tsx` (categories, geo, label(key), get(key)).
- `useCompare()` from `src/components/CompareProvider.tsx` (ids, has, toggle, clear; max 3).
- `src/lib/recent.ts`: getRecent(), pushRecent(id, categories), getViewedCategories(), countCategoryView(cat).
- `src/lib/catalog.ts`: Offer/AdminOffer types, CATEGORIES (legacy static), SHOWCASE_STATUSES, AI_SUBFILTERS, ACCESS_MODELS, PAYOUT_MODELS,
  CatalogCategory, COLOR_GRADIENT/COLOR_SOFT/COLOR_DOT (by color name), goPath(offer).
- `src/lib/visitor.ts`: getVisitorId().

## Database tables (Totalum; snake_case)
- offer: name, short_name, description, tags, category (options multi: dating, webcam, live_cams, useful, ai, games, sex_shop, + admin-created keys),
  status (active=Опубликована, draft, review, paused, archived), subfilters (multi: companion, girlfriend, boyfriend, chat, image, voice, video),
  languages (multi), access_model, geos, image/logo/images (see existing ShowcaseManager), offer_url (hidden tracking link), subid_template,
  network (text), affiliate_network (manyToOne → affiliate_network), payout_model, is_featured ("ТОП"), click_count, published_at, archived_at,
  check_result (json), is_custom, admin_edited, ... (inspect via existing code / MCP getAllDatabaseTables).
- click: offer ref, click_id, session_id, visitor_id, geo, subid, category, affiliate_network ref, is_unique (yes/no), createdAt.
- conversion: transaction_id, click_id, click/offer/affiliate_network refs, payout (number), currency, status (pending|approved|rejected|pending_pricing), geo, category, raw, received_at.
- affiliate_network: name, slug, link_template, postback_secret, api_url, api_key, geo, payout_model, status (pending|connected|error), notes, last_test_at, last_test_result.
- catalog_category: key, label, emoji, color (rose|violet|cyan|emerald|fuchsia|amber|red|indigo), sort_order, geo_only (csv), subfilters (csv), is_enabled (yes/no), translations (json {lang:label}).
- admin_log: action, entity, entity_id, summary, details, actor, user ref, ip_address, logged_at.
- admin_user: email, role (admin|editor|none).
- offer_translation: language, offer ref, description, tags, source_hash, is_manual (yes/no).
- ui_translation: language, strings (json), manual (json).
- ticker_item: text, link, kind (news|novelty|new_showcase), starts_at, ends_at, is_enabled (yes/no), offer ref, translations (json {lang:text}).
- notification: title, body, link, type (new_showcase|novelty|news), category, offer ref, is_enabled, published_at, translations (json {title:{lang},body:{lang}}), push_sent.
- push_subscription: endpoint, visitor_id, user ref, language, categories (csv), is_active.
- app_setting: key, value.
- ad_tag: name, slot (home_between_categories|catalog_inline|showcase_page|ai_section|sex_shop|bottom_banner), device (all|mobile|desktop), geo (csv, empty=all),
  language (csv, empty=all), kind (html|image), html, image (file), link_url, starts_at, ends_at, priority (number), is_enabled, impressions, clicks.
- review: user ref, offer ref, vote (up|down), comment, status (pending|approved|hidden), author_name, language, submitted_at.
- shared_collection: token, title, list, user ref, offers (manyToMany → offer; add with `totalumSdk.crud.addManyToManyReferenceRecord('shared_collection', id, 'offers', offerId)`), views.
- favorite: user ref, offer ref, list (want_to_try|tried).
- user_preference: user ref, language, categories, subscribed_categories (csv), referral_code.
- referral: code, referrer ref, referred ref, joined_at.
Verify exact field names with the Totalum MCP `getAllDatabaseTables` if unsure. Use MCP `query` to inspect data. Never create fake records.

## Agent file ownership (do not edit files owned by others; use the contracts)
- ADMIN-A: `src/app/api/admin/**` (except paths listed for ADMIN-B), `src/components/admin/AdminGate.tsx`, `AdminStats.tsx`, `ShowcaseManager.tsx`,
  new `src/components/admin/{Dashboard,ShowcasesPanel,CategoriesPanel,LogPanel,SettingsPanel,...}.tsx`, `src/lib/showcase.ts`, `src/lib/i18n-extra/admin.ts`.
- ADMIN-B: `src/app/api/admin/{networks,ads,ticker,notifications,reviews,translations}/**`, `src/components/admin/{NetworksPanel,AdsPanel,TickerPanel,NotificationsPanel,ReviewsPanel,TranslationsPanel}.tsx`, `src/lib/i18n-extra/admin2.ts`.
  Each panel: `export function XxxPanel()` with no props. ADMIN-A imports and mounts them as tabs in AdminGate.
- PUBLIC: `src/app/page.tsx`, `src/components/AppShell.tsx`, `src/components/OfferCard.tsx`, `src/app/catalog/page.tsx`, `src/app/offer/[id]/**`,
  `src/components/public/**`, `src/components/ads/AdSlot.tsx` (`export function AdSlot({ slot }: { slot: string })`),
  `src/app/api/{ads,ticker,notifications,push,geo}/**`, `src/app/api/offers/{suggest,[id]}/**`, `src/app/manifest.ts`, `public/sw.js`, `public/icons/*`,
  `src/middleware.ts`, `public/robots.txt`, `src/lib/i18n-extra/core.ts`.
- ENGAGE: `src/app/{quiz,compare,c}/**`, `src/app/profile/page.tsx`, `src/app/favorites/page.tsx`, `src/components/FavoritesProvider.tsx`, `src/app/ai-chat/page.tsx`,
  `src/app/api/{quiz,for-you,compare,reviews,collections,referral,subscriptions,settings}/**`, `src/app/api/favorites/**`, `src/app/api/preferences/**`,
  `src/components/engage/**`, `src/lib/push-client.ts`, `src/lib/i18n-extra/engage.ts`.
  Exposed components (PUBLIC imports them): `src/components/engage/QuizCta.tsx` → `export function QuizCta({ compact }: { compact?: boolean })`,
  `src/components/engage/ForYou.tsx` → `export function ForYou()`, `src/components/engage/Reviews.tsx` → `export function Reviews({ offerId }: { offerId: string })`,
  `src/components/engage/CompareBar.tsx` → `export function CompareBar()` (floating bar when ≥1 selected, links to /compare).
- Push contract: PUBLIC writes `public/sw.js` (registered at `/sw.js`, scope `/`, by PUBLIC in AppShell), `GET /api/push/vapid` → `{ publicKey }`,
  `POST /api/push/subscribe` body `{ endpoint, categories: string[], language, visitorId }` → upserts by endpoint; `POST /api/push/unsubscribe` `{ endpoint }`.
  ENGAGE writes `src/lib/push-client.ts` (`enablePush(categories, language): Promise<boolean>`, `disablePush(): Promise<void>`, `isPushEnabled(): Promise<boolean>`).
- Public settings: ENGAGE writes `GET /api/settings/public` → `{ telegram_channel_url, catalog_ad_every, push_enabled }` (only PUBLIC_SETTINGS keys).
