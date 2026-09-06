import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { buildOfferSeeds } from "@/data/offers";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CONCURRENCY = 8;

async function runBatched<T>(items: T[], task: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    await Promise.all(items.slice(i, i + CONCURRENCY).map(task));
  }
}

/**
 * Seeds / refreshes the catalog.
 *
 * Upserts by slug so re-running it rewrites existing rows with the current copy
 * instead of duplicating them, and removes stale seeded rows that no longer
 * exist in the dataset. Cards created by the admin (`is_custom: "yes"`) and cards
 * the admin has edited by hand (`admin_edited: "yes"`) are never touched — their
 * tracking links and uploaded photos always survive a re-seed.
 */
export async function POST(request: Request) {
  try {
    const purge = new URL(request.url).searchParams.get("purge") !== "0";
    const seeds = buildOfferSeeds();
    console.log(`[SEED] building ${seeds.length} catalog items (purge=${purge})`);

    const existingResult = await totalumSdk.crud.query("offer", {
      _select: { slug: true, is_custom: true, admin_edited: true, name: true },
      _limit: 2000,
    } as any);
    if (existingResult.errors) console.error("[SEED] error reading existing items:", existingResult.errors);

    const allRows = (existingResult.data as any[]) || [];
    // Hand-managed rows are excluded from the upsert *and* from the purge.
    const protectedRows = allRows.filter((o) => o.is_custom === "yes" || o.admin_edited === "yes");
    const existing = allRows.filter((o) => o.is_custom !== "yes" && o.admin_edited !== "yes");
    // Their slugs are still reserved, otherwise the seeder would recreate them as duplicates.
    const protectedSlugs = new Set(protectedRows.map((o) => o.slug).filter(Boolean));
    console.log(`[SEED] ${protectedRows.length} hand-managed card(s) will be left untouched`);
    const bySlug = new Map<string, any>(existing.map((o) => [o.slug, o]));
    const seedSlugs = new Set(seeds.map((s) => s.slug));

    let created = 0;
    let updated = 0;
    let removed = 0;
    let skipped = 0;
    const failures: string[] = [];

    await runBatched(seeds, async (seed) => {
      if (protectedSlugs.has(seed.slug)) {
        // The admin owns this card now — its link, photos and copy stay as saved.
        skipped += 1;
        return;
      }
      const current = bySlug.get(seed.slug);
      try {
        if (current) {
          const result = await totalumSdk.crud.editRecordById("offer", current._id, seed as any);
          if (result.errors) throw new Error(JSON.stringify(result.errors));
          updated += 1;
        } else {
          const result = await totalumSdk.crud.createRecord("offer", seed as any);
          if (result.errors) throw new Error(JSON.stringify(result.errors));
          created += 1;
        }
      } catch (err) {
        console.error(`[SEED] failed to upsert "${seed.name}":`, err);
        failures.push(seed.name);
      }
    });

    // Drop seeded rows whose slug disappeared (renamed items) so no stale copy survives.
    const stale = purge ? existing.filter((o) => !seedSlugs.has(o.slug)) : [];
    await runBatched(stale, async (row) => {
      try {
        const result = await totalumSdk.crud.deleteRecordById("offer", row._id);
        if (result.errors) throw new Error(JSON.stringify(result.errors));
        removed += 1;
      } catch (err) {
        console.error(`[SEED] failed to remove stale item "${row.name}":`, err);
        failures.push(`stale:${row.name}`);
      }
    });

    console.log(
      `[SEED] done — created ${created}, updated ${updated}, removed ${removed}, skipped ${skipped}, failed ${failures.length}`
    );

    if (failures.length && created === 0 && updated === 0) {
      return NextResponse.json(
        { ok: false, error: `Could not write any item. First failures: ${failures.slice(0, 5).join(", ")}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        total: seeds.length,
        created,
        updated,
        removed,
        skipped,
        failed: failures.length,
        failures: failures.slice(0, 10),
      },
    });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/offers/seed", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
