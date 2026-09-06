"use client";

import { LegalPage } from "@/components/LegalPage";

export default function ContactsPage() {
  return (
    <LegalPage
      titleKey="prof_contacts"
      sections={[
        {
          heading: "General enquiries",
          body: "Questions about the catalog, a missing service or a wrong description: support@flirtpulse.ai — we usually answer within one business day.",
        },
        {
          heading: "Suggest a service",
          body: "Want a platform added to the catalog? Write to hello@flirtpulse.ai with the name, a short description, the categories it belongs to and the countries where it works.",
        },
        {
          heading: "Privacy & data requests",
          body: "Access, correction or deletion of your personal data: privacy@flirtpulse.ai. Write from the email address linked to your account so we can verify the request.",
        },
        {
          heading: "Abuse reports",
          body: "If a card in the catalog links to illegal content, report it to abuse@flirtpulse.ai with the name of the service and a screenshot. We remove confirmed cases immediately.",
        },
      ]}
    />
  );
}
