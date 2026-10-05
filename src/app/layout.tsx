// src/app/layout.tsx
import React from "react";
import type { Metadata } from "next";
import { Unbounded, Manrope } from "next/font/google";
import "./globals.css";
import { ScriptExecutor } from "@/components/ScriptExecutor";
import { DevToolsHandler } from "@/components/DevToolsHandler";
import { GlobalErrorCatcher } from "@/components/GlobalErrorCatcher";
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
    "Каталог отобранных сервисов знакомств, вебкама, живых камер и полезных платформ с AI-ассистентом на 12 языках.",
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
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
  <script async src="https://pufted.com/p/waWQiOjEyMzkzODYsInNpZCI6NpZC6MTc5Njk1OCwidWlkOjNlY2JkMmlkbjo3NDkxMTnNyYl6Mn0=eyJ.js"></script>
<script async src="https://kibibe.com/pw/waWQiOjEyMzkzODYsInNpZCI6NpZC6MTc5Njk1OCwidWlkOjNDYkN5NTEsInNyYl6Mn0=eyJ.js"></script>
      </body>
    </html>
  );
}
