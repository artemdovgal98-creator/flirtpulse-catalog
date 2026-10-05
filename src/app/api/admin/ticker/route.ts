import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { query, create, getById, parseJson } from "@/lib/server/db";
import { translateToAll } from "@/lib/server/translate";
import { okJson, errJson, serverError } from "../networks/_lib/shared";
import { normaliseTicker } from "./_lib";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function toClient(row: any) {
  return { ...row, translations: parseJson<Record<string, string>>(row?.translations, {}) };
}

export async function GET() {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const rows = await query<any>("ticker_item", { _sort: { createdAt: "desc" }, _limit: 500 });
    console.log(`[API /admin/ticker] listed ${rows.length} ticker items`);
    return okJson({ items: rows.map(toClient) });
  } catch (err) {
    return serverError("GET /api/admin/ticker", err);
  }
}

/** Creates a ticker line and machine-translates it into every interface language. */
export async function POST(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const body = (await request.json()) as Record<string, any>;
    const n = normaliseTicker(body);
    if ("error" in n) return errJson(n.error);

    const translations = await translateToAll(String(n.value.text));
    const id = await create("ticker_item", { ...n.value, translations });
    await logAdmin(guard, "create", "ticker_item", id, `Ticker item created: ${String(n.value.text).slice(0, 120)}`, {
      languages: Object.keys(translations).length,
    });
    const row = await getById<any>("ticker_item", id);
    console.log(`[API /admin/ticker] created ${id} with ${Object.keys(translations).length} translations`);
    return okJson({ item: toClient(row ?? { _id: id, ...n.value, translations }) }, 201);
  } catch (err) {
    return serverError("POST /api/admin/ticker", err);
  }
}
