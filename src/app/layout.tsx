// src/app/layout.tsx
import React from "react";
import type { Metadata } from "next";
import { Unbounded, Manrope } from "next/font/google";
import "./globals.css";
import { ScriptExecutor } from "@/components/ScriptExecutor";
import { DevToolsHandler } from "@/components/DevToolsHandler";
import { GlobalErrorCatcher } from "@/components/GlobalErrorCatcher";
import { TemporalLinkBanner } from "@/components/TemporalLinkBanner";
import { AppProviders } from "@/components/AppProviders";
import { AppShell } from "@/components/AppShell";

const display = Unbounded({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FlirtPulse — каталог сервисов и платформ",
  description:
    "260+ отобранных сервисов знакомств, вебкама, живых камер и полезных платформ с AI-ассистентом на 12 языках.",
};

// SUPER IMPORTANT: NOT EDIT THE FOLLOWING 2 LINES TO FORCE NEXT.JS TO RENDER DYNAMICALLY
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark">
      <body className={`${display.variable} ${body.variable} antialiased fp-grain`}>
        <GlobalErrorCatcher />
        <ScriptExecutor />
        <DevToolsHandler />
        {/* Development-preview only banner. Kept outside the page wrapper so it never covers content. */}
        <TemporalLinkBanner />
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
