"use client";

import { LegalPage } from "@/components/LegalPage";

export default function TermsOfServicePage() {
  return (
    <LegalPage
      titleKey="prof_terms"
      sections={[
        {
          heading: "Age requirement",
          body: "FlirtPulse AI is a directory of adult affiliate offers. By using this platform you confirm that you are at least 18 years old (or the age of majority in your jurisdiction) and that adult content is legal where you live.",
        },
        {
          heading: "What this service is",
          body: "FlirtPulse AI is an informational catalog for affiliate marketers. We list offers, payout models and GEO availability. We do not operate the dating or webcam services themselves and we are not a party to any agreement between you and a partner network.",
        },
        {
          heading: "Payout information",
          body: "Payouts, EPC values and GEO restrictions shown in the catalog are indicative and can change at any moment on the network side. Always confirm the current terms inside your partner network dashboard before running traffic.",
        },
        {
          heading: "Acceptable use",
          body: "You agree not to scrape the catalog at scale, not to use the AI assistant to generate illegal content, and to comply with the traffic rules of every network whose offers you promote.",
        },
        {
          heading: "Availability",
          body: "The service is provided \"as is\". We may change, suspend or discontinue any part of the catalog, including individual offers, without prior notice.",
        },
      ]}
    />
  );
}
