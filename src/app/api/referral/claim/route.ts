import { NextResponse } from "next/server";
import { query, create } from "@/lib/server/db";
import { getSessionUser, refId } from "@/components/engage/server";

export const dynamic = "force-dynamic";

/** Links the signed-in user to the person who invited them. Body: { code } */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as { code?: string };
    const code = String(body.code || "").trim().toUpperCase();
    if (!/^[A-F0-9]{4,16}$/.test(code)) {
      return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 400 });
    }

    const owner = (await query<any>("user_preference", { _filter: { referral_code: code }, _limit: 1 }))[0];
    const referrerId = refId(owner?.user);
    if (!referrerId) return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 404 });
    if (referrerId === user.id) {
      return NextResponse.json({ ok: false, error: "self_referral" }, { status: 400 });
    }

    const already = await query<any>("referral", { _filter: { referred: user.id }, _limit: 1 });
    if (already.length) {
      console.log(`[API /referral/claim] user ${user.id} was already referred`);
      return NextResponse.json({ ok: true, data: { claimed: false, reason: "already_referred" } });
    }

    await create("referral", { code, referrer: referrerId, referred: user.id, joined_at: new Date().toISOString() });
    console.log(`[API /referral/claim] user ${user.id} joined via ${code} (referrer ${referrerId})`);
    return NextResponse.json({ ok: true, data: { claimed: true } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/referral/claim", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
