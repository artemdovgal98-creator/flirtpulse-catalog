"use client";

/** Running line under the header (news, novelties, new showcases). Hidden when empty. */

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, Sparkles, Flame } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";
import { cn } from "@/lib/utils";

interface TickerItem {
  _id: string;
  kind: string;
  text: string;
  link: string;
}

const CSS = `
@keyframes fp-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.fp-marquee { animation: fp-marquee var(--fp-dur, 40s) linear infinite; }
.fp-marquee-wrap:hover .fp-marquee, .fp-marquee-wrap[data-paused="true"] .fp-marquee { animation-play-state: paused; }
[dir="rtl"] .fp-marquee { animation-direction: reverse; }
@media (prefers-reduced-motion: reduce) { .fp-marquee { animation-duration: calc(var(--fp-dur, 40s) * 3); } }
`;

const ICON: Record<string, typeof Megaphone> = { news: Megaphone, novelty: Sparkles, new_showcase: Flame };

function Item({ item }: { item: TickerItem }) {
  const Icon = ICON[item.kind] ?? Megaphone;
  const content = (
    <>
      <Icon className="h-3.5 w-3.5 shrink-0 text-fuchsia-300" />
      <span>{item.text}</span>
    </>
  );
  const cls = "inline-flex items-center gap-2 whitespace-nowrap px-6 text-xs font-semibold text-white/75";
  if (!item.link) return <span className={cls}>{content}</span>;
  const external = /^https?:\/\//i.test(item.link);
  return external ? (
    <a href={item.link} target="_blank" rel="noopener noreferrer" className={cn(cls, "hover:text-white")}>
      {content}
    </a>
  ) : (
    <Link href={item.link} className={cn(cls, "hover:text-white")}>
      {content}
    </Link>
  );
}

export function Ticker() {
  const { lang } = useI18n();
  const [items, setItems] = useState<TickerItem[]>([]);
  const [paused, setPaused] = useState(false);

  const load = useCallback(() => {
    api.get<{ items: TickerItem[] }>(`/api/ticker?lang=${lang}`).then((res) => {
      if (res.ok && res.data) {
        setItems(res.data.items);
        console.log(`[ticker] ${res.data.items.length} items (${lang})`);
      } else {
        console.error("[ticker] could not load:", res.error);
      }
    });
  }, [lang]);

  useEffect(() => {
    load();
  }, [load]);
  useRefreshOnFocus(load, 60_000);

  if (!items.length) return null;

  const chars = items.reduce((n, i) => n + i.text.length, 0);
  const duration = Math.max(20, Math.round(chars * 0.22 + items.length * 3));
  // Repeat short lists so one half always fills a wide screen, then duplicate for a seamless loop.
  const base = items.length < 4 ? [...items, ...items, ...items] : items;

  return (
    <div
      className="fp-marquee-wrap relative overflow-hidden border-b border-white/5 bg-gradient-to-r from-fuchsia-950/60 via-[#1a1030]/80 to-indigo-950/60"
      data-paused={paused}
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse") setPaused((p) => !p);
      }}
    >
      <style>{CSS}</style>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#160d29] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#160d29] to-transparent" />
      <div
        className="fp-marquee flex w-max py-2"
        style={{ ["--fp-dur" as string]: `${duration}s` } as React.CSSProperties}
      >
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0" aria-hidden={half === 1}>
            {base.map((item, i) => (
              <Item key={`${half}-${item._id}-${i}`} item={item} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
