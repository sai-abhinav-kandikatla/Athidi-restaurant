import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Athidhi Family Restaurant",
    short_name: "Athidhi",
    description: "Restaurant ordering and operations for Athidhi Family Restaurant.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffdf8",
    theme_color: "#8b0b0b",
    icons: [{ src: "/athidhi-logo.png", sizes: "1600x800", type: "image/png", purpose: "any" }],
  };
}
