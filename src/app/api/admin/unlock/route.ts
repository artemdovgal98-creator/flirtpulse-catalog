import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ADMIN_COOKIE, createAdminToken, isAdminPassword, logAdmin, type AdminGuardResult } from "@/lib/admin";

const PASSWORD_ACTOR: AdminGuardResult = { userId: null, email: null, isAdmin: true, isListedAdmin: false, role: "password" };

export const dynamic = "force-dynamic";

/**
 * The panel is served over HTTPS behind the Totalum proxy, so the cookie can be
 * `SameSite=None; Secure` — without that, browsers drop it when the app runs
 * inside the Totalum preview iframe and every admin call answers "Forbidden".
 * On plain HTTP (local runs) `SameSite=None` would be rejected, so we fall back
 * to `Lax`.
 */
async function isSecureRequest(request: Request): Promise<boolean> {
  const headerStore = await headers();
  const proto =
    headerStore.get("x-forwarded-proto") ||
    headerStore.get("cf-visitor")?.match(/"scheme":"(\w+)"/)?.[1] ||
    new URL(request.url).protocol.replace(":", "");
  return proto.split(",")[0].trim() === "https";
}

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
    const secure = await isSecureRequest(request);

    // The token also travels in the body so the client can echo it back as
    // `x-admin-token` when third-party cookies are blocked.
    const response = NextResponse.json({
      ok: true,
      data: { unlocked: true, token: token.value, expiresIn: token.maxAge },
    });
    response.cookies.set(ADMIN_COOKIE, token.value, {
      httpOnly: true,
      sameSite: secure ? "none" : "lax",
      secure,
      path: "/",
      maxAge: token.maxAge,
    });

    await logAdmin(PASSWORD_ACTOR, "unlock", "admin_session", "-", "Admin panel unlocked with the password");
    console.log(`[API /admin/unlock] admin panel unlocked (secure cookie=${secure})`);
    return response;
  } catch (err: any) {
    console.error("[API ERROR] POST /api/admin/unlock", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** Locks the panel again by clearing the cookie. */
export async function DELETE(request: Request) {
  try {
    const secure = await isSecureRequest(request);
    const response = NextResponse.json({ ok: true, data: { unlocked: false } });
    response.cookies.set(ADMIN_COOKIE, "", {
      httpOnly: true,
      sameSite: secure ? "none" : "lax",
      secure,
      path: "/",
      maxAge: 0,
    });
    await logAdmin(PASSWORD_ACTOR, "lock", "admin_session", "-", "Admin panel locked");
    console.log("[API /admin/unlock] admin panel locked");
    return response;
  } catch (err: any) {
    console.error("[API ERROR] DELETE /api/admin/unlock", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
