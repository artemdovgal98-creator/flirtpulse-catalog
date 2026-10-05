import { NextResponse } from "next/server";
import { update, csv } from "@/lib/server/db";
import { getSessionUser, getOrCreatePreference } from "@/components/engage/server";

export const dynamic = "force-dynamic";

/** Category subscriptions (bell + push filter). Guests keep them in localStorage only. */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: true, data: { categories: [], guest: true } });
    const pref = await getOrCreatePreference(user.id);
    const categories = csv(pref.subscribed_categories);
    console.log(`[API /subscriptions] user ${user.id} subscribed to: ${categories.join(",") || "-"}`);
    return NextResponse.json({ ok: true, data: { categories, guest: false } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/subscriptions", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** Body: { categories: string[] } */
export async function PUT(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { categories?: unknown };
    if (!Array.isArray(body.categories)) {
      return NextResponse.json({ ok: false, error: "categories must be an array" }, { status: 400 });
    }
    const categories = Array.from(
      new Set(body.categories.map((c) => String(c ?? "").trim().toLowerCase()).filter((c) => /^[a-z0-9_-]{1,40}$/.test(c)))
    ).slice(0, 50);

    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: true, data: { categories, guest: true } });

    const pref = await getOrCreatePreference(user.id);
    await update("user_preference", pref._id, { subscribed_categories: categories.join(",") });
    console.log(`[API /subscriptions] saved for user ${user.id}: ${categories.join(",") || "-"}`);
    return NextResponse.json({ ok: true, data: { categories, guest: false } });
  } catch (err: any) {
    console.error("[API ERROR] PUT /api/subscriptions", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
