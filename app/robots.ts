import type { MetadataRoute } from "next";
import { SITE_ORIGIN, siteUrl } from "./lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: siteUrl("/sitemap.xml"),
    host: SITE_ORIGIN,
  };
}
