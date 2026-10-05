import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { query, create, update } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Upserts a push subscription by endpoint (linked to the user when signed in). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      endpoint?: string;
      categories?: string[];
      language?: string;
      visitorId?: string;
    };
    const endpoint = String(body.endpoint || "").trim();
    if (!/^https:\/\//.test(endpoint) || endpoint.length > 2000) {
      return NextResponse.json({ ok: false, error: "Invalid endpoint" }, { status: 400 });
    }
    const categories = (Array.isArray(body.categories) ? body.categories : [])
      .map((c) => String(c).trim().toLowerCase().replace(/[^a-z0-9_-]/g, ""))
      .filter(Boolean)
      .slice(0, 50)
      .join(",");

    let userId = "";
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      userId = session?.user?.id || "";
    } catch (err) {
      console.error("[API /push/subscribe] session lookup failed (continuing as guest):", err);
    }

    const data: Record<string, any> = {
      endpoint,
      categories,
      language: String(body.language || "ru").slice(0, 5),
      visitor_id: String(body.visitorId || "").slice(0, 64),
      is_active: "yes",
    };
    if (userId) data.user = userId;

    const existing = await query<any>("push_subscription", { _filter: { endpoint }, _limit: 1 });
    let id: string;
    if (existing[0]) {
      id = existing[0]._id;
      await update("push_subscription", id, data);
    } else {
      id = await create("push_subscription", data);
    }
    console.log(`[API /push/subscribe] ${existing[0] ? "updated" : "created"} ${id} cats=${categories || "-"} user=${userId || "guest"}`);
    return NextResponse.json({ ok: true, data: { id } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/push/subscribe", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
