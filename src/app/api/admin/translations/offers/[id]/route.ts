import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { query, getById, create, update } from "@/lib/server/db";
import { ALL_LANGS, translateMap } from "@/lib/server/translate";
import { offerSourceHash, retranslateOffer, SOURCE_LANG } from "@/lib/server/offers";
import { okJson, errJson, serverError } from "../../../networks/_lib/shared";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

function validLang(lang: string | null | undefined): lang is string {
  return Boolean(lang) && lang !== SOURCE_LANG && ALL_LANGS.includes(lang as any);
}

async function findRow(offerId: string, lang: string) {
  const rows = await query<any>("offer_translation", { _filter: { offer: offerId, language: lang }, _limit: 1 });
  return rows[0] || null;
}

function view(offer: any, row: any, lang: string) {
  const hash = offerSourceHash(offer);
  return {
    offer: { _id: offer._id, name: offer.name ?? "", description: offer.description ?? "", tags: offer.tags ?? "" },
    source_lang: SOURCE_LANG,
    lang,
    translation: row
      ? {
          description: row.description ?? "",
          tags: row.tags ?? "",
          is_manual: row.is_manual === "yes",
          stale: row.is_manual !== "yes" && row.source_hash !== hash,
        }
      : null,
  };
}

/** Original copy + the stored translation for `?lang=`. */
export async function GET(request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const lang = new URL(request.url).searchParams.get("lang");
    if (!validLang(lang)) return errJson("Unsupported language");
    const offer = await getById<any>("offer", id);
    if (!offer) return errJson("Showcase not found", 404);
    return okJson(view(offer, await findRow(id, lang), lang));
  } catch (err) {
    return serverError("GET /api/admin/translations/offers/[id]", err);
  }
}

/**
 * Saves a manual translation `{ lang, description, tags }`. It is stored with
 * is_manual=yes, so automatic translation never overwrites it.
 */
export async function PUT(request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const body = (await request.json()) as { lang?: string; description?: string; tags?: string };
    if (!validLang(body.lang)) return errJson("Unsupported language");
    const lang = body.lang;
    const offer = await getById<any>("offer", id);
    if (!offer) return errJson("Showcase not found", 404);

    const data = {
      offer: id,
      language: lang,
      description: String(body.description ?? "").trim().slice(0, 8000),
      tags: String(body.tags ?? "").trim().slice(0, 1000),
      source_hash: offerSourceHash(offer),
      is_manual: "yes",
    };
    const row = await findRow(id, lang);
    if (row) await update("offer_translation", row._id, data);
    else await create("offer_translation", data);

    await logAdmin(guard, "translate_edit", "offer_translation", id, `Showcase "${offer.name}" translation (${lang}) edited manually`, {
      lang,
    });
    console.log(`[API /admin/translations/offers/:id] manual ${lang} translation saved for ${id}`);
    return okJson(view(offer, { ...row, ...data }, lang));
  } catch (err) {
    return serverError("PUT /api/admin/translations/offers/[id]", err);
  }
}

/**
 * "Translate again": `{ lang }` re-translates that language now (dropping the
 * manual flag); `{ all: true }` also resets every language and re-translates
 * them in the background via retranslateOffer().
 */
export async function POST(request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const body = (await request.json()) as { lang?: string; all?: boolean };
    const offer = await getById<any>("offer", id);
    if (!offer) return errJson("Showcase not found", 404);
    if (!offer.description && !offer.tags) return errJson("This showcase has no description or tags to translate");

    if (body.all === true) {
      const rows = await query<any>("offer_translation", { _filter: { offer: id }, _limit: 50 });
      await Promise.all(rows.map((r) => update("offer_translation", r._id, { is_manual: "no", source_hash: "" })));
    }

    let result: ReturnType<typeof view> | null = null;
    if (validLang(body.lang)) {
      const lang = body.lang;
      const entries: Record<string, string> = {};
      if (offer.description) entries.d = offer.description;
      if (offer.tags) entries.t = offer.tags;
      const done = await translateMap(entries, lang);
      if (!done.d && !done.t) throw new Error("The translator returned nothing — try again");
      const data = {
        offer: id,
        language: lang,
        description: done.d ?? "",
        tags: done.t ?? "",
        source_hash: offerSourceHash(offer),
        is_manual: "no",
      };
      const row = await findRow(id, lang);
      if (row) await update("offer_translation", row._id, data);
      else await create("offer_translation", data);
      result = view(offer, data, lang);
    }

    if (body.all === true) retranslateOffer(offer);

    await logAdmin(
      guard,
      "retranslate",
      "offer_translation",
      id,
      `Showcase "${offer.name}" re-translated (${body.all ? "all languages" : body.lang})`,
      { lang: body.lang, all: body.all === true }
    );
    console.log(`[API /admin/translations/offers/:id] retranslate ${id} lang=${body.lang ?? "-"} all=${body.all === true}`);
    return okJson(result ?? { queued: true });
  } catch (err) {
    return serverError("POST /api/admin/translations/offers/[id]", err);
  }
}
