import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { totalumSdk } from "@/lib/totalum";

export interface AdminGuardResult {
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
}

/**
 * Resolves the current session and whether it belongs to an administrator.
 *
 * Membership is stored in the `admin_user` table rather than on the session
 * user, so it can only be granted from the Totalum back-office / database —
 * nothing the client sends can influence it.
 */
export async function getAdminGuard(): Promise<AdminGuardResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id ?? null;
    const email = session?.user?.email ?? null;

    if (!userId) {
      console.log("[admin-guard] no session — access denied");
      return { userId: null, email: null, isAdmin: false };
    }

    const result = await totalumSdk.crud.query("admin_user", {
      _filter: { user: userId },
      _limit: 1,
    } as any);
    if (result.errors) console.error("[admin-guard] admin_user lookup errors:", result.errors);

    const isAdmin = (((result.data as any[]) || []).length > 0);
    console.log(`[admin-guard] user=${userId} (${email}) isAdmin=${isAdmin}`);

    return { userId, email, isAdmin };
  } catch (err) {
    console.error("[admin-guard] guard failed:", err);
    return { userId: null, email: null, isAdmin: false };
  }
}
