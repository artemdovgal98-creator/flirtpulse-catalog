import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { getById, update, remove } from "@/lib/server/db";
import { okJson, errJson, serverError } from "../../networks/_lib/shared";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Moderation: `{ status: "approved" | "hidden" | "pending" }`. */
export async function PUT(request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const body = (await request.json()) as { status?: string };
    const status = String(body.status || "");
    if (!["approved", "hidden", "pending"].includes(status)) return errJson("Invalid status");
    const row = await getById<any>("review", id);
    if (!row) return errJson("Review not found", 404);

    await update("review", id, { status });
    await logAdmin(guard, `review_${status}`, "review", id, `Review by "${row.author_name || "?"}" → ${status}`, {
      from: row.status,
      to: status,
    });
    console.log(`[API /admin/reviews/:id] ${id} ${row.status} → ${status}`);
    return okJson({ _id: id, status });
  } catch (err) {
    return serverError("PUT /api/admin/reviews/[id]", err);
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const row = await getById<any>("review", id);
    if (!row) return errJson("Review not found", 404);
    await remove("review", id);
    await logAdmin(guard, "delete", "review", id, `Review by "${row.author_name || "?"}" deleted`, {
      comment: String(row.comment || "").slice(0, 200),
    });
    console.log(`[API /admin/reviews/:id] deleted ${id}`);
    return okJson({ deleted: id });
  } catch (err) {
    return serverError("DELETE /api/admin/reviews/[id]", err);
  }
}
