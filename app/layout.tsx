import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import "./responsive.css";
import { SITE_ORIGIN, siteUrl } from "./lib/site-url";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: { default: "Athidi Family Restaurant", template: "%s · Athidi" },
    description: "Family recipes, generous hospitality and effortless table ordering at Athidi Family Restaurant.",
    alternates: { canonical: siteUrl("/") },
    manifest: siteUrl("/manifest.webmanifest"),
    icons: { icon: siteUrl("/athidi-logo.png"), shortcut: siteUrl("/athidi-logo.png") },
    openGraph: {
      type: "website",
      url: siteUrl("/"),
      siteName: "Athidi Family Restaurant",
      title: "Athidi Family Restaurant",
      description: "Made with heart. Served like family.",
      images: [{ url: siteUrl("/og-v2.png"), width: 1734, height: 907, alt: "Athidi Family Restaurant — made with heart, served like family" }],
    },
    twitter: { card: "summary_large_image", title: "Athidi Family Restaurant", description: "Made with heart. Served like family.", images: [siteUrl("/og-v2.png")] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${siteUrl("/")}#restaurant`,
    name: "Athidi Family Restaurant",
    url: siteUrl("/"),
    logo: siteUrl("/athidi-logo.png"),
    image: siteUrl("/og-v2.png"),
  };

  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }}
        />
        {children}
      </body>
    </html>
  );
}
