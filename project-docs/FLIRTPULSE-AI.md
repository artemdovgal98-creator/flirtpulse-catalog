# FlirtPulse AI — implementation notes

Affiliate catalog for dating, webcam and live cam offers, built on Next.js + Totalum.

## Pages

| Route | What it does |
|---|---|
| `/` | Entry screen: hero, live stats, category shortcuts, top-6 offers, 18+ notice |
| `/catalog` | Core showcase — search, multi-select filters, sorting, infinite scroll |
| `/ai-chat` | AI assistant grounded on the real catalog, answers in the user's language |
| `/favorites` | Saved offers with the empty state + "Open catalog" CTA |
| `/profile` | Account, log in / log out, 12-language selector, preferences, legal links |
| `/privacy-policy`, `/terms-of-service`, `/partner-disclosure`, `/cookie-policy`, `/contacts` | Legal pages |
| `/login`, `/register` | Better Auth email + password |

All of them are public (guests can browse) — see `publicRoutes` in `src/middleware.ts`.

## Database (Totalum)

| Table | Purpose | Relations |
|---|---|---|
| `user`, `session`, `account`, `verification` | Better Auth | `session.user_id`, `account.user_id` → `user` (manyToOne) |
| `offer` | 230 catalog vitrines | — |
| `favorite` | Saved offers | `user` → `user`, `offer` → `offer` (manyToOne) |
| `user_preference` | Language + favourite categories | `user` → `user` (manyToOne) |
| `chat_message` | AI conversation history | `user` → `user` (manyToOne) |

`offer` fields: `name, slug, description, category[], network, payout_model[], payout_amount,
payout_label, geo[], tags, quality_score, epc, conversion_flow, offer_url, image_url,
launch_date, is_featured, status`.

## Offer dataset

`src/data/offers.ts` holds the whole catalog as compact rows:

- `CRAKREVENUE_ROWS` — the **106 approved CrakRevenue offers**
- `PARTNER_ROWS` — 60 vitrines from other networks (Advidi, ClickDealer, MaxBounty, AdCombo,
  TrafficStars, PlugRush, Adsterra, LosPollos, Mobidea, Dating Factory, Golden Goose, Traffic Company)
- `VITRINE_BASES` × `GEO_PACKS` — 64 GEO-localized vitrines of the strongest brands

**Total: 230 offers.** Payouts, EPC and GEOs are representative demo values — replace them with the
live figures from your CrakRevenue dashboard when you have API access.

### Adding more offers

1. Append rows to `CRAKREVENUE_ROWS` / `PARTNER_ROWS` in `src/data/offers.ts`
   (`[name, categories, payoutModels, amount, geos, tags, quality]`).
2. `POST /api/offers/seed` — it is idempotent (existing slugs are skipped), so only new rows are created.

Offers can also be added straight from the Totalum back office; the catalog picks them up immediately.

## API routes

| Route | Method | Notes |
|---|---|---|
| `/api/offers` | GET | `q, categories, geos, models, ids, sort, offset, limit` → `{ items, total, hasMore }` |
| `/api/offers/seed` | POST | Idempotent seeding, `?force=1` to re-create |
| `/api/favorites` | GET / POST | Toggle by `offer_id`; guests fall back to localStorage |
| `/api/preferences` | GET / PUT | Language + favourite categories |
| `/api/ai/chat` | POST | Detects GEO/category/payout from free text in 12 languages, then answers with `totalumSdk.openai` (`gpt-4.1-mini`) |

All routes return `{ ok: true, data }` and are called from the client through `src/lib/api.ts`.

## Design

Dark indigo/violet night theme defined in `src/app/globals.css` (`.dark`, `fp-card`, `fp-glass`,
`fp-heart`, `fp-sheen`, `fp-grain`). Display font **Unbounded**, body font **Manrope** — both with
Cyrillic subsets. Fixed bottom navigation + sticky top header live in `src/components/AppShell.tsx`.

## Languages

12 locales in `src/lib/i18n.tsx` (en, uk, ru, pl, de, fr, es, pt, it, tr, ar, zh) with instant
switching, `localStorage` persistence, automatic RTL for Arabic, and a best-effort sync to
`user_preference` for signed-in users. Default locale: Russian.

## Demo account

`artem.dovgal@flirtpulse.ai` / `flirtpulse2026` — has 5 saved offers and stored preferences.
