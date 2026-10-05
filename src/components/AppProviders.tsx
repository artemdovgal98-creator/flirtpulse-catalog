"use client";

import React from "react";
import { I18nProvider } from "@/lib/i18n";
import { FavoritesProvider } from "@/components/FavoritesProvider";
import { CategoriesProvider } from "@/components/CategoriesProvider";
import { CompareProvider } from "@/components/CompareProvider";
import { Toaster } from "@/components/ui/sonner";
import { PresenceTracker } from "@/components/PresenceTracker";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <CategoriesProvider>
        <FavoritesProvider>
          <CompareProvider>
            <PresenceTracker />
            {children}
            <Toaster position="top-center" theme="dark" richColors />
          </CompareProvider>
        </FavoritesProvider>
      </CategoriesProvider>
    </I18nProvider>
  );
}
