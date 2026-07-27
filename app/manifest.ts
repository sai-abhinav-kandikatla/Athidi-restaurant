import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Athidi Family Restaurant",
    short_name: "Athidi",
    description: "Restaurant ordering and operations for Athidi Family Restaurant.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffdf8",
    theme_color: "#8b0b0b",
    icons: [{ src: "/athidi-logo.png", sizes: "1600x800", type: "image/png", purpose: "any" }],
  };
}
