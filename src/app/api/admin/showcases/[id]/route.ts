import { NextResponse, after } from "next/server";
import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { normaliseShowcase, type ShowcasePayload } from "@/lib/showcase";
import { getById, update, parseJson } from "@/lib/server/db";
import { getCategoryRows } from "@/lib/server/categories";
import { retranslateOffer } from "@/lib/server/offers";
import { announceShowcase } from "@/lib/server/announce";
import {
  canManage,
  managerOnly,
  refId,
  requestOrigin,
  runShowcaseChecks,
  statusChange,
} from "@/lib/server/admin-showcases";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

function badId(id: string) {
  return !/^[a-f0-9]{24}$/i.test(id);
}

/** One showcase with its stored check result. */
export async function GET(_request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    if (badId(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const item = await getById<any>("offer", id);
    if (!item) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: { item: { ...item, check_result: parseJson(item.check_result, null) } } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/admin/showcases/[id]", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/**
 * Saves the whole showcase form. A requested publication (status → active) runs the
 * pre-publish checks first; when a hard check fails the rest is saved but the status
 * stays as it was and the answer carries `blocked: true` + the check list.
 */
export async function PUT(request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();

    const { id } = await context.params;
    if (badId(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const existing = await getById<any>("offer", id);
    if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const body = (await request.json()) as ShowcasePayload;
    const categoryKeys = (await getCategoryRows()).map((c) => c.key).filter(Boolean);
    // Keep legacy category values the card already has, even if no catalog_category row exists for them.
    const allowed = Array.from(new Set([...categoryKeys, ...((existing.category as string[]) || [])]));
    const normalised = normaliseShowcase(body, allowed);
    if ("error" in normalised) {
      return NextResponse.json({ ok: false, error: normalised.error }, { status: 400 });
    }

    const { status: requested, ...fields } = normalised.value;
    if (requested === "archived" && existing.status !== "archived" && !canManage(guard)) return managerOnly();

    const payload: Record<string, any> = { ...fields, admin_edited: "yes" };
    // Optional references/options: only send null when there is something to clear.
    for (const k of ["affiliate_network", "payout_model", "access_model"]) {
      if (payload[k] == null && !existing[k]) delete payload[k];
    }
    if (payload.affiliate_network && payload.affiliate_network !== refId(existing.affiliate_network)) {
      const net = await getById<any>("affiliate_network", payload.affiliate_network);
      if (net?.name) payload.network = net.name;
    }

    const merged = { ...existing, ...payload };
    const change = await statusChange(existing, merged, requested, { reachability: true });
    Object.assign(payload, change.patch);

    await update("offer", id, payload);

    // Keep a fresh (cheap) check result for cards that were saved without a status change.
    if (!change.check) {
      const check = await runShowcaseChecks({ ...merged, _id: id }, { reachability: false });
      await update("offer", id, { check_result: JSON.stringify(check) });
      change.check = check;
    }

    const item = (await getById<any>("offer", id)) ?? { ...merged, ...payload };

    if (change.announce) {
      const origin = requestOrigin(request);
      after(() => announceShowcase(item, origin).catch((err) => console.error("[admin] announce failed:", err)));
    }
    const copyChanged =
      (existing.description || "") !== (item.description || "") || (existing.tags || "") !== (item.tags || "");
    if (copyChanged) retranslateOffer(item);

    await logAdmin(
      guard,
      change.blocked ? "publish_blocked" : "update",
      "offer",
      id,
      `${change.blocked ? "Publish blocked" : "Updated"} "${item.name}" (${existing.status} → ${item.status})`,
      {
        requested,
        failed: change.check?.checks.filter((c) => !c.ok && c.level === "error").map((c) => c.key) ?? [],
        retranslate: copyChanged,
      }
    );
    console.log(
      `[API /admin/showcases/:id] updated ${id} "${item.name}" ${existing.status}→${item.status} blocked=${change.blocked} retranslate=${copyChanged}`
    );

    return NextResponse.json({
      ok: true,
      data: { item: { ...item, check_result: change.check }, check: change.check, blocked: change.blocked },
    });
  } catch (err: any) {
    console.error("[API ERROR] PUT /api/admin/showcases/[id]", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** Soft delete: moves the showcase to the archive (status archived + archived_at). */
export async function DELETE(_request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    if (!canManage(guard)) return managerOnly();

    const { id } = await context.params;
    if (badId(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const existing = await getById<any>("offer", id);
    if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    await update("offer", id, { status: "archived", archived_at: new Date().toISOString() });
    await logAdmin(guard, "archive", "offer", id, `Archived "${existing.name}" (was ${existing.status})`);
    console.log(`[API /admin/showcases/:id] archived ${id} "${existing.name}"`);

    return NextResponse.json({ ok: true, data: { id, status: "archived" } });
  } catch (err: any) {
    console.error("[API ERROR] DELETE /api/admin/showcases/[id]", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
