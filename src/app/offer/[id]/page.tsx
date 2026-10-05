import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { detectGeo } from "@/lib/server/geo";
import { offerImages } from "@/lib/catalog";
import { getPublicOffer } from "./offer-data";
import { ShowcaseView } from "./ShowcaseView";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const offer = await getPublicOffer(id, "ru");
    if (!offer) return { title: "FlirtPulse", robots: { index: false } };
    const title = `${offer.short_name || offer.name} — FlirtPulse`;
    const description = clip(offer.description || offer.tags || offer.name, 160);
    const image = offerImages(offer)[0];
    return {
      title,
      description,
      alternates: { canonical: `/offer/${id}` },
      openGraph: { title, description, type: "website", ...(image ? { images: [{ url: image }] } : {}) },
      twitter: { card: image ? "summary_large_image" : "summary", title, description },
    };
  } catch (err) {
    console.error(`[offer-page] metadata for ${id} failed:`, err);
    return { title: "FlirtPulse" };
  }
}

export default async function OfferPage({ params }: Props) {
  const { id } = await params;
  const geo = detectGeo(await headers());
  const offer = await getPublicOffer(id, "ru", geo);
  if (!offer) notFound();
  console.log(`[offer-page] rendering ${id}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: offer.name,
    description: offer.description || undefined,
    applicationCategory: (offer.category ?? [])[0] || undefined,
    image: offerImages(offer)[0] || undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ShowcaseView initial={offer} />
    </>
  );
}
