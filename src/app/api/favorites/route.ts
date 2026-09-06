import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { totalumSdk } from "@/lib/totalum";

export const dynamic = "force-dynamic";

async function getUserId(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.id ?? null;
  } catch (err) {
    console.error("[API /favorites] session lookup failed:", err);
    return null;
  }
}

/** Returns the signed-in user's saved offers (with the full offer expanded). */
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      console.log("[API /favorites] guest request — favorites live in localStorage");
      return NextResponse.json({ ok: true, data: { items: [], guest: true } });
    }

    const result = await totalumSdk.crud.query("favorite", {
      _filter: { user: userId },
      _sort: { saved_at: "desc" },
      _limit: 500,
      offer: true,
    } as any);
    if (result.errors) console.error("[API /favorites] sdk errors:", result.errors);

    const items = ((result.data as any[]) || []).filter((f) => f.offer);
    console.log(`[API /favorites] user ${userId} has ${items.length} favorites`);

    return NextResponse.json({ ok: true, data: { items, guest: false } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/favorites", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** Toggles an offer in the signed-in user's favorites. Body: { offer_id, action? } */
export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { offer_id?: string; action?: string };
    if (!body.offer_id) {
      return NextResponse.json({ ok: false, error: "offer_id is required" }, { status: 400 });
    }

    const existingResult = await totalumSdk.crud.query("favorite", {
      _filter: { user: userId, offer: body.offer_id },
      _limit: 1,
    } as any);
    if (existingResult.errors) console.error("[API /favorites] lookup errors:", existingResult.errors);

    const existing = ((existingResult.data as any[]) || [])[0];

    if (existing) {
      await totalumSdk.crud.deleteRecordById("favorite", existing._id);
      console.log(`[API /favorites] removed offer ${body.offer_id} for user ${userId}`);
      return NextResponse.json({ ok: true, data: { saved: false } });
    }

    const created = await totalumSdk.crud.createRecord("favorite", {
      user: userId,
      offer: body.offer_id,
      saved_at: new Date().toISOString(),
    } as any);
    if (created.errors) {
      console.error("[API /favorites] create errors:", created.errors);
      throw new Error(created.errors.errorMessage || "Could not save favorite");
    }

    console.log(`[API /favorites] saved offer ${body.offer_id} for user ${userId}`);
    return NextResponse.json({ ok: true, data: { saved: true, favorite: created.data } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/favorites", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
