import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { query, update, count, randomToken } from "@/lib/server/db";
import { getSessionUser, getOrCreatePreference, requestOrigin } from "@/components/engage/server";

export const dynamic = "force-dynamic";

/** Short, unique, upper-case invite code (e.g. "7F3A9C"). */
async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = randomToken(i < 3 ? 3 : 4).toUpperCase();
    const clash = await query<any>("user_preference", { _filter: { referral_code: code }, _limit: 1 });
    if (!clash.length) return code;
  }
  throw new Error("Could not generate a unique referral code");
}

/** The signed-in user's invite link + how many people joined with it. No payouts. */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const pref = await getOrCreatePreference(user.id);
    let code = String(pref.referral_code || "");
    if (!code) {
      code = await uniqueCode();
      await update("user_preference", pref._id, { referral_code: code });
      console.log(`[API /referral] assigned code ${code} to user ${user.id}`);
    }
    const invited = await count("referral", { referrer: user.id });
    const origin = requestOrigin(request, await headers());
    return NextResponse.json({ ok: true, data: { code, link: `${origin}/?ref=${code}`, invited } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/referral", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
