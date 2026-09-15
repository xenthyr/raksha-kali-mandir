import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim();

const PUBLIC_INDEXABLE_PATHS = [
  "/",
  "/today",
  "/temple",
  "/temple/about",
  "/temple/history",
  "/temple/heritage",
  "/temple/timeline",
  "/temple/traditions",
  "/temple/priests",
  "/temple/committee",
  "/temple/facilities",
  "/panjika",
  "/panjika/today",
  "/panjika/calendar",
  "/panjika/tithi",
  "/panjika/amavasya",
  "/panjika/annual",
  "/puja-festivals",
  "/puja-festivals/daily-rituals",
  "/puja-festivals/amavasya",
  "/puja-festivals/kaushiki",
  "/puja-festivals/mahalaya",
  "/puja-festivals/shyama-puja",
  "/puja-festivals/rattanti",
  "/puja-festivals/archive",
  "/darshan",
  "/darshan/latest-special",
  "/darshan/amavasya",
  "/darshan/festivals",
  "/darshan/archive",
  "/live",
  "/live/live-puja",
  "/live/aarti",
  "/live/video-archive",
  "/media",
  "/media/photos",
  "/media/videos",
  "/media/audio",
  "/media/social-cards",
  "/music",
  "/music/archive",
  "/seva",
  "/seva/sankalp",
  "/seva/puja",
  "/seva/bhog",
  "/seva/annadanam",
  "/seva/deep-seva",
  "/seva/donation",
  "/seva/jaba",
  "/seva/jaba/daily",
  "/seva/jaba/monthly",
  "/seva/jaba/archive",
  "/transparency",
  "/transparency/income",
  "/transparency/expenses",
  "/transparency/monthly-reports",
  "/transparency/annual-reports",
  "/notices",
  "/notices/official",
  "/notices/festival",
  "/notices/traffic",
  "/notices/archive",
  "/community",
  "/community/volunteer",
  "/community/annadanam",
  "/community/emergency",
  "/community/blood-support",
  "/community/devotee-stories",
  "/community/whatsapp",
  "/archive",
  "/archive/historical-photos",
  "/archive/documents",
  "/archive/oral-history",
  "/archive/old-notices",
  "/archive/publications",
  "/documents",
  "/visit",
  "/visit/location",
  "/visit/directions",
  "/visit/parking",
  "/visit/facilities",
  "/visit/visitor-guide",
  "/faq",
  "/assistant",
  "/contact",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  if (!SITE_URL) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required to build the public sitemap");
  }

  const origin = new URL(ensureHttpSiteUrl(SITE_URL));
  origin.pathname = "";
  origin.search = "";
  origin.hash = "";

  return PUBLIC_INDEXABLE_PATHS.map((path) => ({
    url: new URL(path, origin).toString(),
  }));
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
