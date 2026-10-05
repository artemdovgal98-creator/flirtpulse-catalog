"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Trash2, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { OfferCard } from "@/components/OfferCard";
import type { Offer } from "@/lib/catalog";
import { QuizCta } from "@/components/engage/QuizCta";
import { AdSlot } from "@/components/ads/AdSlot";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  offers?: Offer[];
}

/** Renders the assistant's lightweight markdown (**bold** + line breaks). */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <p key={i} className={cn("text-sm leading-relaxed", i > 0 && "mt-1.5")}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j} className="font-bold text-fuchsia-200">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </p>
      ))}
    </>
  );
}

export default function AiChatPage() {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = [t("ai_s1"), t("ai_s2"), t("ai_s3"), t("ai_s4")];

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setSending(true);
    console.log("[ai-chat] sending question:", message);

    const res = await api.post<{ reply: string; offers: Offer[] }>("/api/ai/chat", {
      message,
      language: lang,
      history,
    });

    if (res.ok && res.data) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data!.reply, offers: res.data!.offers },
      ]);
      console.log(`[ai-chat] answer received (${res.data.offers?.length ?? 0} offers in context)`);
    } else {
      console.error("[ai-chat] request failed:", res.error);
      setMessages((prev) => [...prev, { role: "assistant", content: t("ai_error") }]);
    }
    setSending(false);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-3xl flex-col px-4 pb-4 pt-6 sm:px-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 shadow-[0_0_26px_-6px_rgba(217,70,239,0.95)]">
            <Sparkles className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="font-display text-xl font-extrabold text-white">{t("ai_title")}</h1>
            <p className="text-xs text-white/45">{t("ai_subtitle")}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/60 transition hover:border-rose-400/40 hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("ai_clear")}</span>
          </button>
        )}
      </header>

      <div className="flex-1 space-y-4">
        {messages.length === 0 && (
          <>
            <div className="fp-card fp-rise rounded-3xl p-5">
              <p className="text-sm leading-relaxed text-white/75">{t("ai_welcome")}</p>
            </div>
            {/* Prefer clicking to typing? The quiz gives a top 3 in 5 taps. */}
            <QuizCta />
            <AdSlot slot="ai_section" />
          </>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn("fp-rise flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[92%] rounded-3xl px-4 py-3",
                m.role === "user"
                  ? "bg-gradient-to-br from-fuchsia-500/85 to-indigo-500/85 text-white"
                  : "fp-card text-white/85"
              )}
            >
              <RichText text={m.content} />

              {m.role === "assistant" && m.offers && m.offers.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {m.offers.slice(0, 4).map((offer, j) => (
                    <OfferCard key={offer._id} offer={offer} index={j} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="fp-card inline-flex items-center gap-2 rounded-3xl px-4 py-3 text-sm text-white/60">
              <Loader2 className="h-4 w-4 animate-spin text-fuchsia-300" />
              {t("ai_thinking")}
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Prompt suggestions */}
      <div className="fp-rail mt-5 flex gap-2 overflow-x-auto pb-1">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            disabled={sending}
            className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white/65 transition hover:border-fuchsia-400/45 hover:text-white disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-2 mt-3 flex items-center gap-2 rounded-full border border-white/10 bg-[#1b1330]/90 p-1.5 backdrop-blur-xl"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("ai_placeholder")}
          aria-label={t("ai_placeholder")}
          className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-white placeholder:text-white/35 outline-none"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          aria-label={t("ai_send")}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white transition hover:brightness-110 active:scale-90 disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
