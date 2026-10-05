"use client";

/**
 * Ad placement. The server picks the ad (slot, dates, device, GEO, language,
 * priority); it is rendered inside a sandboxed iframe so third-party code can
 * never touch the page. Impressions are counted once the slot is visible;
 * clicks are reported by the iframe through postMessage. Nothing loads until
 * the visitor has confirmed being 18+. An empty slot shows a FlirtPulse promo.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, Wand2, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAgeConfirmed } from "@/components/public/AgeGate";
import { cn } from "@/lib/utils";

interface Ad {
  id: string;
  kind: "html" | "image";
  html: string;
  image: string;
  link_url: string;
}

const DEFAULT_HEIGHT: Record<string, number> = {
  bottom_banner: 60,
  home_between_categories: 120,
  catalog_inline: 250,
  showcase_page: 250,
  sex_shop: 120,
  ai_section: 120,
};

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeHttpUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : "";
}

/** Inline script inside the sandbox: reports clicks and its content height to the parent. */
const BRIDGE = `<script>(function(){
var sent=false;function size(){try{parent.postMessage({fpAd:"height",h:document.documentElement.scrollHeight},"*")}catch(e){}}
document.addEventListener("click",function(){if(sent)return;sent=true;try{parent.postMessage({fpAd:"click"},"*")}catch(e){}setTimeout(function(){sent=false},1500)},true);
window.addEventListener("load",function(){size();setTimeout(size,800);setTimeout(size,2500)});
})();</script>`;

function buildSrcDoc(ad: Ad): string {
  const head = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;color:#fff;font-family:sans-serif}img{max-width:100%;height:auto;display:block;margin:0 auto;border-radius:14px}a{display:block}</style></head><body>`;
  if (ad.kind === "image") {
    const img = `<img src="${escapeAttr(safeHttpUrl(ad.image))}" alt="">`;
    const link = safeHttpUrl(ad.link_url);
    const inner = link ? `<a href="${escapeAttr(link)}" target="_blank" rel="noopener sponsored">${img}</a>` : img;
    return `${head}${inner}${BRIDGE}</body></html>`;
  }
  return `${head}${ad.html}${BRIDGE}</body></html>`;
}

function Promo({ slot }: { slot: string }) {
  const { t } = useI18n();
  const quiz = slot === "catalog_inline" || slot === "showcase_page" || slot === "sex_shop";
  const compact = slot === "bottom_banner";
  const href = quiz ? "/quiz" : "/ai-chat";
  const Icon = quiz ? Wand2 : Sparkles;

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-fuchsia-400/20 bg-gradient-to-r from-fuchsia-600/20 via-violet-600/15 to-indigo-600/20 transition hover:border-fuchsia-400/45",
        compact ? "px-3 py-2" : "p-4"
      )}
    >
      <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-fuchsia-500/25 blur-2xl" />
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white shadow-[0_0_22px_-6px_rgba(217,70,239,0.9)]",
          compact ? "h-8 w-8" : "h-10 w-10"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className={cn("block font-display font-bold text-white", compact ? "truncate text-xs" : "text-sm")}>
          {t(quiz ? "pub_promo_quiz_title" : "pub_promo_ai_title")}
        </span>
        {!compact && (
          <span className="mt-0.5 block text-xs text-white/55">
            {t(quiz ? "pub_promo_quiz_text" : "pub_promo_ai_text")}
          </span>
        )}
      </span>
      <ArrowRight className="relative h-4 w-4 shrink-0 text-white/50 transition group-hover:translate-x-0.5 group-hover:text-white" />
    </Link>
  );
}

export function AdSlot({ slot }: { slot: string }) {
  const { t, lang } = useI18n();
  const confirmed = useAgeConfirmed();
  const [ad, setAd] = useState<Ad | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [height, setHeight] = useState(DEFAULT_HEIGHT[slot] ?? 160);
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    if (!confirmed) return;
    let cancelled = false;
    const device = window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
    setState("loading");
    counted.current = false;
    api
      .get<{ ad: Ad | null }>(`/api/ads?slot=${encodeURIComponent(slot)}&device=${device}&lang=${lang}`)
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.data) {
          setAd(res.data.ad);
          console.log(`[ads] slot ${slot}: ${res.data.ad ? `ad ${res.data.ad.id}` : "empty → promo"}`);
        } else {
          console.error(`[ads] slot ${slot} failed:`, res.error);
          setAd(null);
        }
        setState("done");
      });
    return () => {
      cancelled = true;
    };
  }, [confirmed, slot, lang]);

  // Impression once at least half of the slot is on screen.
  useEffect(() => {
    if (!ad || !box.current) return;
    const node = box.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (counted.current || !entries[0]?.isIntersecting) return;
        counted.current = true;
        observer.disconnect();
        api.post(`/api/ads/${ad.id}/impression`, {}).then((res) => {
          if (!res.ok) console.error(`[ads] impression for ${ad.id} failed:`, res.error);
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ad]);

  // Clicks + auto-height from the sandboxed frame.
  useEffect(() => {
    if (!ad) return;
    const onMessage = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const data = e.data as { fpAd?: string; h?: number };
      if (data?.fpAd === "click") {
        console.log(`[ads] click on ${ad.id}`);
        api.post(`/api/ads/${ad.id}/click`, {}).then((res) => {
          if (!res.ok) console.error(`[ads] click for ${ad.id} failed:`, res.error);
        });
      } else if (data?.fpAd === "height" && typeof data.h === "number" && data.h > 0) {
        setHeight(Math.max(40, Math.min(600, Math.ceil(data.h))));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [ad]);

  const srcDoc = useMemo(() => (ad ? buildSrcDoc(ad) : ""), [ad]);

  if (!confirmed || state !== "done") return null;
  if (!ad) return <Promo slot={slot} />;

  return (
    <div ref={box} className="relative" data-ad-slot={slot}>
      <span className="absolute right-2 top-1 z-10 rounded-full bg-black/55 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider text-white/60 backdrop-blur">
        {t("pub_ad_label")}
      </span>
      <iframe
        ref={frame}
        title={t("pub_ad_label")}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        loading="lazy"
        referrerPolicy="no-referrer"
        className="block w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
        style={{ height }}
      />
    </div>
  );
}
