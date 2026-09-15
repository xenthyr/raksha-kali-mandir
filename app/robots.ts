import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export default function robots(): MetadataRoute.Robots {
  const rules: MetadataRoute.Robots["rules"] = {
    userAgent: "*",
    allow: "/",
    disallow: [
      "/admin/",
      "/api/",
      "/track-ticket",
      "/verify/receipt/",
      "/search",
    ],
  };

  return {
    rules,
    ...(siteUrl
      ? { sitemap: new URL("/sitemap.xml", ensureHttpSiteUrl(siteUrl)).toString() }
      : {}),
  };
}

function ensureHttpSiteUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a valid URL");
  }
  if (url.protocol !== "https:" || url.hostname === "localhost") {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTPS non-local URL");
  }
  return url.toString().replace(/\/$/, "");
}
