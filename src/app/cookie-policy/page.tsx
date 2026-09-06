"use client";

import { LegalPage } from "@/components/LegalPage";

export default function CookiePolicyPage() {
  return (
    <LegalPage
      titleKey="prof_cookies"
      sections={[
        {
          heading: "Essential cookies",
          body: "We set a single session cookie when you sign in. It keeps you authenticated and is required for saving favourites to your account. It is removed when you log out.",
        },
        {
          heading: "Local storage",
          body: "Your interface language, favourite categories, guest favourites and an anonymous visitor id are stored in your browser's localStorage rather than in cookies. The visitor id is a random string and contains no personal data.",
        },
        {
          heading: "Third-party cookies",
          body: "External services set their own cookies once you open them from the catalog. Those cookies are governed by each service's own cookie policy, not ours.",
        },
        {
          heading: "Managing cookies",
          body: "You can clear cookies and site data at any time from your browser settings. Doing so signs you out and resets guest favourites and the selected language.",
        },
      ]}
    />
  );
}
