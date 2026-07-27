import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "./lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/about", "/menu", "/gallery", "/reviews", "/contact", "/location", "/privacy", "/terms"].map((path) => ({ url: `${SITE_ORIGIN}${path}`, lastModified: new Date(), changeFrequency: path === "/menu" ? "daily" as const : "monthly" as const, priority: path === "" ? 1 : .7 }));
}
