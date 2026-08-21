// lib/jsonld.ts
//
// Schema.org JSON-LD builders. This is the machine-readable layer that lets
// Google show rich results and lets AI answer engines (ChatGPT, Perplexity,
// Google AI Overviews) cite our scores and sources directly.
//
// Honesty note: we emit a single editorial `Review` authored by
// TubeBenderReviews with our own 0–100 rating — NOT a faked aggregateRating of
// user reviews we don't have. That keeps it defensible and policy-clean.

import { siteBase, absoluteUrl } from "./site";
import { titleOf, slugForProduct } from "./ids";

export function organizationJsonLd() {
  const base = siteBase();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TubeBenderReviews",
    url: base,
    logo: `${base}/icon.svg`,
    description:
      "Independent, transparent tube bender reviews with a 100-point scoring system — every score backed by cited sources.",
    founder: { "@type": "Person", name: "Joseph Gambino" },
  };
}

export function websiteJsonLd() {
  const base = siteBase();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "TubeBenderReviews",
    url: base,
    publisher: { "@type": "Organization", name: "TubeBenderReviews" },
  };
}

/** Editorial review of a product (we are the author; the maker's machine is itemReviewed). */
export function reviewJsonLd(product: any, score: number | null) {
  const base = siteBase();
  const title = titleOf(product);
  const url = `${base}/reviews/${slugForProduct(product)}`;
  const img = absoluteUrl(product?.image);

  const itemReviewed: Record<string, unknown> = {
    "@type": "Product",
    name: title,
    category: "Tube bender",
    ...(product?.brand ? { brand: { "@type": "Brand", name: String(product.brand) } } : {}),
    ...(product?.model ? { model: String(product.model) } : {}),
    ...(img ? { image: img } : {}),
  };

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Review",
    name: `${title} Review`,
    itemReviewed,
    author: { "@type": "Organization", name: "TubeBenderReviews", url: base },
    publisher: { "@type": "Organization", name: "TubeBenderReviews" },
    url,
  };

  if (typeof score === "number" && Number.isFinite(score)) {
    data.reviewRating = {
      "@type": "Rating",
      ratingValue: score,
      bestRating: 100,
      worstRating: 0,
    };
  }

  return data;
}

export function breadcrumbJsonLd(product: any) {
  const base = siteBase();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: base },
      { "@type": "ListItem", position: 2, name: "Reviews", item: `${base}/reviews` },
      {
        "@type": "ListItem",
        position: 3,
        name: titleOf(product),
        item: `${base}/reviews/${slugForProduct(product)}`,
      },
    ],
  };
}

/** Ranked list of reviews (for the /reviews index). */
export function itemListJsonLd(items: Array<{ slug: string; name: string }>) {
  const base = siteBase();
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${base}/reviews/${it.slug}`,
      name: it.name,
    })),
  };
}
