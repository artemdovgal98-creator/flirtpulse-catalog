"use client";

import { LegalPage } from "@/components/LegalPage";

export default function TermsOfServicePage() {
  return (
    <LegalPage
      titleKey="prof_terms"
      sections={[
        {
          heading: "Age requirement",
          body: "Parts of FlirtPulse contain adult content. By using this platform you confirm that you are at least 18 years old (or the age of majority in your jurisdiction) and that such content is legal where you live.",
        },
        {
          heading: "What this service is",
          body: "FlirtPulse is an informational catalog of services and platforms. We describe what each service does and which countries it is available in. We do not operate those services ourselves and we are not a party to any agreement between you and them.",
        },
        {
          heading: "Accuracy of the catalog",
          body: "Descriptions, country availability and categories are indicative and can change on the service side at any moment. Always check the current terms on the service's own website before signing up.",
        },
        {
          heading: "Acceptable use",
          body: "You agree not to scrape the catalog at scale, not to use the AI assistant to generate illegal content, and to follow the rules of every service you use through this catalog.",
        },
        {
          heading: "Availability",
          body: "The service is provided \"as is\". We may change, suspend or discontinue any part of the catalog, including individual cards, without prior notice.",
        },
      ]}
    />
  );
}
