import { NextResponse } from "next/server";
import { ADMIN_COOKIE, createAdminToken, isAdminPassword } from "@/lib/admin";

export const dynamic = "force-dynamic";

const isHttps = (process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://");

/** Unlocks the admin panel with the password and sets the signed httpOnly cookie. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { password?: string };

    if (!isAdminPassword(body.password || "")) {
      console.log("[API /admin/unlock] rejected: wrong password");
      // Small delay so the endpoint cannot be brute-forced at full speed.
      await new Promise((resolve) => setTimeout(resolve, 600));
      return NextResponse.json({ ok: false, error: "WRONG_PASSWORD" }, { status: 401 });
    }

    const token = await createAdminToken();
    const response = NextResponse.json({ ok: true, data: { unlocked: true } });
    response.cookies.set(ADMIN_COOKIE, token.value, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: token.maxAge,
    });

    console.log("[API /admin/unlock] admin panel unlocked");
    return response;
  } catch (err: any) {
    console.error("[API ERROR] POST /api/admin/unlock", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** Locks the panel again by clearing the cookie. */
export async function DELETE() {
  try {
    const response = NextResponse.json({ ok: true, data: { unlocked: false } });
    response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    console.log("[API /admin/unlock] admin panel locked");
    return response;
  } catch (err: any) {
    console.error("[API ERROR] DELETE /api/admin/unlock", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
