"use client";

import { LegalPage } from "@/components/LegalPage";

export default function AboutPage() {
  return (
    <LegalPage
      titleKey="prof_about"
      sections={[
        {
          heading: "What FlirtPulse is",
          body: "FlirtPulse is a curated catalog of services and platforms across four sections: Dating, Webcam, Live cams and Useful — everyday tools that make online life simpler and safer. Every card links straight to the service so you can try it yourself.",
        },
        {
          heading: "How items are selected",
          body: "Each entry is reviewed by hand before it appears in the catalog: the service has to work, be available in the regions shown on the card, and be understandable without reading a manual. Entries that stop working are removed.",
        },
        {
          heading: "How the ranking works",
          body: "The default \"Relevance\" order combines an internal quality score with how often visitors open a service. \"Popular\" sorts purely by how many people opened it, and \"Newest\" by when it was added to the catalog.",
        },
        {
          heading: "The AI assistant",
          body: "The assistant answers in the language you write in and only recommends services that are actually in the catalog. It never asks for personal details and it does not store anything beyond the conversation you can clear yourself.",
        },
        {
          heading: "Age restriction",
          body: "Parts of this catalog contain adult content and are intended for people aged 18 and over. If you are below that age, please close this site.",
        },
      ]}
    />
  );
}
