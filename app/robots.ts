import type { MetadataRoute } from "next";

function siteBase(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.tubebenderreviews.com"
  ).replace(/\/+$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const base = siteBase();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep crawlers out of the private admin and API surfaces.
        disallow: ["/admin", "/admin/", "/api/", "/__debug", "/dev/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
