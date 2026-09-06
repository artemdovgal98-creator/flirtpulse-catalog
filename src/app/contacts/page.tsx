"use client";

import { LegalPage } from "@/components/LegalPage";

export default function ContactsPage() {
  return (
    <LegalPage
      titleKey="prof_contacts"
      sections={[
        {
          heading: "General enquiries",
          body: "Questions about the catalog, a missing offer or a wrong payout: support@flirtpulse.ai — we usually answer within one business day.",
        },
        {
          heading: "Partnerships",
          body: "Networks and advertisers who want their offers added to the catalog: partners@flirtpulse.ai. Please include the network name, verticals, payout models and available GEOs.",
        },
        {
          heading: "Privacy & data requests",
          body: "Access, correction or deletion of your personal data: privacy@flirtpulse.ai. Write from the email address linked to your account so we can verify the request.",
        },
        {
          heading: "Abuse reports",
          body: "If an offer in the catalog links to illegal content, report it to abuse@flirtpulse.ai with the offer name and a screenshot. We remove confirmed cases immediately.",
        },
      ]}
    />
  );
}
