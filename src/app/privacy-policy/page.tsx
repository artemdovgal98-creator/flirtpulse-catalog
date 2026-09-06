"use client";

import { LegalPage } from "@/components/LegalPage";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      titleKey="prof_privacy"
      sections={[
        {
          heading: "What we collect",
          body: "FlirtPulse stores the minimum required to run the catalog: your account email and display name when you register, the services you save to Favorites, your interface language and favourite categories, and the questions you send to the AI assistant. We do not collect payment data and we never ask for documents.",
        },
        {
          heading: "How we use it",
          body: "Your data is used only to render the catalog, sync your favourites between devices, translate the interface and improve the relevance of AI recommendations. We do not sell personal data to third parties.",
        },
        {
          heading: "Guest mode",
          body: "If you browse without an account, favourites and the selected language are stored only in your browser's localStorage. Clearing your browser data removes them permanently.",
        },
        {
          heading: "External services",
          body: "When you open a card you leave FlirtPulse and land on the service's own website. Those sites operate under their own privacy policies and may set their own cookies and identifiers.",
        },
        {
          heading: "Your rights",
          body: "You may request access to, correction of, or deletion of your account data at any time through the Contacts page. Deleting your account removes your saved offers, preferences and stored AI conversations.",
        },
      ]}
    />
  );
}
