"use client";

import { LegalPage } from "@/components/LegalPage";

export default function PartnerDisclosurePage() {
  return (
    <LegalPage
      titleKey="prof_disclosure"
      sections={[
        {
          heading: "Affiliate relationship",
          body: "FlirtPulse AI is an affiliate catalog. Links marked \"Open offer\" are affiliate links. If you register or purchase through them, we may receive a commission from the partner network at no additional cost to you.",
        },
        {
          heading: "CrakRevenue",
          body: "The core of this catalog is built on the CrakRevenue partner network — 106 approved offers across the dating, webcam and live cam verticals, with PPS, SOI, DOI, RevShare and Multi-CPA payout models. Additional vitrines come from other partner networks listed on each card.",
        },
        {
          heading: "How offers are ranked",
          body: "The default \"Relevance\" sorting uses an internal quality score based on payout size, conversion flow and GEO coverage. Commission level alone never moves an offer to the top of the list, and every card shows its network so you always know who pays.",
        },
        {
          heading: "No guarantees",
          body: "Nothing in this catalog is a promise of earnings. Real results depend on your traffic sources, creatives and the current terms of the network.",
        },
      ]}
    />
  );
}
