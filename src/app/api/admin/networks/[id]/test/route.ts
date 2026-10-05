import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { getById, update, count } from "@/lib/server/db";
import { okJson, errJson, serverError, isHttpUrl } from "../../_lib/shared";
import type { NetworkRow } from "../../_lib/network";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const TIMEOUT_MS = 6000;

interface Check {
  key: string;
  ok: boolean;
  /** Warnings do not fail the test. */
  warn?: boolean;
  detail?: string;
}

/** Calls the network API with the key as a Bearer token. The key is never logged. */
async function testApi(url: string, apiKey: string): Promise<{ ok: boolean; result: string }> {
  if (!isHttpUrl(url)) return { ok: false, result: "API URL is not a valid http(s) URL" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const headers: Record<string, string> = { Accept: "application/json, text/plain, */*" };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const res = await fetch(url, { method: "GET", headers, signal: controller.signal, redirect: "follow" });
    const ms = Date.now() - started;
    const ok = res.ok;
    const hint = res.status === 401 || res.status === 403 ? " (check the API key)" : "";
    return { ok, result: `API HTTP ${res.status} in ${ms} ms${hint}` };
  } catch (err: any) {
    const aborted = err?.name === "AbortError";
    return { ok: false, result: aborted ? `API timeout after ${TIMEOUT_MS / 1000}s` : `API unreachable: ${err?.message || "network error"}` };
  } finally {
    clearTimeout(timer);
  }
}

/** Validates the link template (full URL or SubID query template). */
function checkTemplate(template: string): Check[] {
  const tpl = template.trim();
  if (!tpl) return [{ key: "link_template", ok: true, warn: true, detail: "No link template — showcase links are used as-is" }];
  const checks: Check[] = [];
  if (/^https?:\/\//i.test(tpl)) {
    const probe = tpl.replace(/\{[a-z_]+\}/gi, "x");
    checks.push({ key: "link_template", ok: isHttpUrl(probe), detail: isHttpUrl(probe) ? "Valid http(s) URL" : "Invalid URL" });
  } else {
    const valid = /^[?&]?[\w.\-[\]]+=[^&\s]*(&[\w.\-[\]]+=[^&\s]*)*$/.test(tpl);
    checks.push({
      key: "link_template",
      ok: valid,
      detail: valid ? "Valid SubID query template" : "Must be an http(s) URL or a query like sub1={click_id}&sub2={category}",
    });
  }
  const hasClickId = /\{(click_id|clickid)\}/i.test(tpl);
  checks.push({
    key: "click_id",
    ok: hasClickId,
    warn: !hasClickId,
    detail: hasClickId ? "{click_id} present" : "No {click_id} — conversions cannot be matched to clicks",
  });
  return checks;
}

/**
 * Tests a network: with an API URL → real request (6s timeout); otherwise a
 * self-test of the configuration the postback endpoint relies on.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const row = await getById<NetworkRow>("affiliate_network", id);
    if (!row) return errJson("Network not found", 404);

    let status = row.status || "pending";
    let result: string;
    const checks: Check[] = [];
    let mode: "api" | "self";

    if (row.api_url) {
      mode = "api";
      const api = await testApi(row.api_url, row.api_key || "");
      checks.push({ key: "api", ok: api.ok, detail: api.result });
      status = api.ok ? "connected" : "error";
      result = api.result;
    } else {
      mode = "self";
      checks.push({ key: "secret", ok: Boolean(row.postback_secret), detail: row.postback_secret ? "Postback secret set" : "No postback secret" });
      checks.push({ key: "slug", ok: Boolean(row.slug), detail: row.slug ? `Endpoint /api/postback/${row.slug}` : "No slug" });
      checks.push(...checkTemplate(row.link_template || ""));
      const conversions = await count("conversion", { affiliate_network: id });
      checks.push({
        key: "conversions",
        ok: conversions > 0,
        warn: conversions === 0,
        detail: conversions > 0 ? `${conversions} postback(s) received` : "No postbacks received yet",
      });

      const failed = checks.filter((c) => !c.ok && !c.warn);
      const warnings = checks.filter((c) => c.warn);
      if (failed.length) status = "error";
      else if (conversions > 0) status = "connected";
      else if (status === "error") status = "pending";
      result =
        `Self-test: ${failed.length ? `FAILED (${failed.map((c) => c.key).join(", ")})` : "config OK"}` +
        (warnings.length ? `; warnings: ${warnings.map((c) => c.key).join(", ")}` : "");
    }

    const testedAt = new Date().toISOString();
    await update("affiliate_network", id, { status, last_test_at: testedAt, last_test_result: result.slice(0, 240) });
    await logAdmin(guard, "test", "affiliate_network", id, `Network "${row.name}" tested (${mode}): ${result}`.slice(0, 240), {
      mode,
      status,
    });
    console.log(`[API /admin/networks/:id/test] ${id} mode=${mode} status=${status} result="${result}"`);
    return okJson({ status, result, mode, checks, last_test_at: testedAt });
  } catch (err) {
    return serverError("POST /api/admin/networks/[id]/test", err);
  }
}
