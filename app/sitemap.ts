import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://athidi-family-restaurant.com";
  return ["", "/about", "/menu", "/gallery", "/reviews", "/contact", "/location", "/privacy", "/terms"].map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: path === "/menu" ? "daily" as const : "monthly" as const, priority: path === "" ? 1 : .7 }));
}
