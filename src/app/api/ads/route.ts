import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { query, csv } from "@/lib/server/db";
import { detectGeo } from "@/lib/server/geo";

export const dynamic = "force-dynamic";

function fileUrl(f: any): string {
  if (!f) return "";
  if (Array.isArray(f)) return fileUrl(f[0]);
  return typeof f === "object" ? f.url || "" : "";
}

/**
 * Picks the ad for a slot: enabled, inside its dates, matching device, GEO and
 * language (empty lists = everyone), highest priority; random among equals.
 */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const slot = (params.get("slot") || "").trim();
    const device = params.get("device") === "desktop" ? "desktop" : "mobile";
    const lang = (params.get("lang") || "").toLowerCase().slice(0, 5);
    if (!slot) return NextResponse.json({ ok: false, error: "slot is required" }, { status: 400 });

    const geo = detectGeo(await headers());
    const rows = await query<any>("ad_tag", { _filter: { slot, is_enabled: "yes" }, _limit: 200 });
    const now = Date.now();

    const eligible = rows.filter((r) => {
      if (r.starts_at && new Date(r.starts_at).getTime() > now) return false;
      if (r.ends_at && new Date(r.ends_at).getTime() < now) return false;
      if (r.device && r.device !== "all" && r.device !== device) return false;
      const geos = csv(r.geo);
      if (geos.length && (!geo || !geos.includes(geo))) return false;
      const langs = csv(r.language);
      if (langs.length && (!lang || !langs.includes(lang))) return false;
      if (r.kind === "image") return Boolean(fileUrl(r.image));
      return Boolean(String(r.html || "").trim());
    });

    if (!eligible.length) {
      console.log(`[API /ads] slot=${slot} device=${device} geo=${geo || "-"} lang=${lang || "-"} → no ad (${rows.length} enabled)`);
      return NextResponse.json({ ok: true, data: { ad: null } });
    }

    const top = Math.max(...eligible.map((r) => Number(r.priority) || 0));
    const best = eligible.filter((r) => (Number(r.priority) || 0) === top);
    const pick = best[Math.floor(Math.random() * best.length)];
    const ad = {
      id: pick._id,
      kind: pick.kind === "image" ? "image" : "html",
      html: pick.kind === "image" ? "" : String(pick.html || ""),
      image: pick.kind === "image" ? fileUrl(pick.image) : "",
      link_url: pick.link_url || "",
    };
    console.log(`[API /ads] slot=${slot} → ad ${ad.id} (${ad.kind}, priority ${top}, ${best.length} tied)`);
    return NextResponse.json({ ok: true, data: { ad } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/ads", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
