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
    console.error("[API /preferences] session lookup failed:", err);
    return null;
  }
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ ok: true, data: null });

    const result = await totalumSdk.crud.query("user_preference", {
      _filter: { user: userId },
      _limit: 1,
    } as any);
    if (result.errors) console.error("[API /preferences] sdk errors:", result.errors);

    return NextResponse.json({ ok: true, data: ((result.data as any[]) || [])[0] ?? null });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/preferences", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** Body: { language?: string, preferred_categories?: string[] } */
export async function PUT(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      // Guests keep their preferences in localStorage — this is not an error.
      return NextResponse.json({ ok: true, data: null });
    }

    const body = (await request.json().catch(() => ({}))) as {
      language?: string;
      preferred_categories?: string[];
    };

    const patch: Record<string, any> = {};
    if (body.language) patch.language = body.language;
    if (Array.isArray(body.preferred_categories)) patch.preferred_categories = body.preferred_categories;

    if (!Object.keys(patch).length) {
      return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
    }

    const existingResult = await totalumSdk.crud.query("user_preference", {
      _filter: { user: userId },
      _limit: 1,
    } as any);
    const existing = ((existingResult.data as any[]) || [])[0];

    let saved;
    if (existing) {
      const updated = await totalumSdk.crud.editRecordById("user_preference", existing._id, patch as any);
      if (updated.errors) {
        console.error("[API /preferences] update errors:", updated.errors);
        throw new Error(updated.errors.errorMessage || "Could not update preferences");
      }
      saved = updated.data;
    } else {
      const created = await totalumSdk.crud.createRecord("user_preference", {
        user: userId,
        language: patch.language ?? "ru",
        preferred_categories: patch.preferred_categories ?? ["dating", "webcam", "live_cams"],
      } as any);
      if (created.errors) {
        console.error("[API /preferences] create errors:", created.errors);
        throw new Error(created.errors.errorMessage || "Could not create preferences");
      }
      saved = created.data;
    }

    console.log(`[API /preferences] saved preferences for user ${userId}:`, patch);
    return NextResponse.json({ ok: true, data: saved });
  } catch (err: any) {
    console.error("[API ERROR] PUT /api/preferences", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
