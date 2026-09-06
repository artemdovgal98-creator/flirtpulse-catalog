"use client";

import React from "react";
import { I18nProvider } from "@/lib/i18n";
import { FavoritesProvider } from "@/components/FavoritesProvider";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <FavoritesProvider>
        {children}
        <Toaster position="top-center" theme="dark" richColors />
      </FavoritesProvider>
    </I18nProvider>
  );
}
