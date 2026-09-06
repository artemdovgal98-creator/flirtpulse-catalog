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
          body: "Your interface language, favourite categories and guest favourites are stored in your browser's localStorage rather than in cookies. They never leave your device unless you are signed in.",
        },
        {
          heading: "Third-party cookies",
          body: "Partner networks set their own tracking cookies once you click through to an offer. Those cookies are governed by the network's own cookie policy, not ours.",
        },
        {
          heading: "Managing cookies",
          body: "You can clear cookies and site data at any time from your browser settings. Doing so signs you out and resets guest favourites and the selected language.",
        },
      ]}
    />
  );
}
