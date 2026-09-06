import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { buildOfferSeeds } from "@/data/offers";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Seeds the catalog with the full offer dataset.
 * Idempotent: existing offers (matched by slug) are skipped unless `?force=1`.
 */
export async function POST(request: Request) {
  try {
    const force = new URL(request.url).searchParams.get("force") === "1";
    const seeds = buildOfferSeeds();
    console.log(`[SEED] building ${seeds.length} offers (force=${force})`);

    const existingResult = await totalumSdk.crud.query("offer", {
      _select: { slug: true },
      _limit: 1000,
    } as any);
    if (existingResult.errors) console.error("[SEED] error reading existing offers:", existingResult.errors);

    const existingSlugs = new Set(((existingResult.data as any[]) || []).map((o) => o.slug));
    const pending = force ? seeds : seeds.filter((s) => !existingSlugs.has(s.slug));

    console.log(`[SEED] ${existingSlugs.size} offers already stored, ${pending.length} to create`);

    let created = 0;
    const failures: string[] = [];
    const CONCURRENCY = 8;

    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      const batch = pending.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map((seed) => totalumSdk.crud.createRecord("offer", seed as any))
      );
      results.forEach((res, idx) => {
        if (res.status === "fulfilled" && !res.value.errors) {
          created += 1;
        } else {
          const reason = res.status === "rejected" ? res.reason : res.value.errors;
          console.error(`[SEED] failed to create "${batch[idx].name}":`, reason);
          failures.push(batch[idx].name);
        }
      });
    }

    console.log(`[SEED] done — created ${created}, failed ${failures.length}`);

    if (failures.length && created === 0) {
      return NextResponse.json(
        { ok: false, error: `Could not create any offer. First failures: ${failures.slice(0, 5).join(", ")}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: { total: seeds.length, created, skipped: seeds.length - pending.length, failed: failures.length, failures: failures.slice(0, 10) },
    });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/offers/seed", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
