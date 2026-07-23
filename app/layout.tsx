import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import "./responsive.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  return {
    metadataBase,
    title: { default: "Athidhi Family Restaurant", template: "%s · Athidhi" },
    description: "Family recipes, generous hospitality and effortless table ordering at Athidhi Family Restaurant.",
    icons: { icon: "/athidhi-logo.png", shortcut: "/athidhi-logo.png" },
    openGraph: {
      type: "website",
      siteName: "Athidhi Family Restaurant",
      title: "Athidhi Family Restaurant",
      description: "Made with heart. Served like family.",
      images: [{ url: "/og-v2.png", width: 1734, height: 907, alt: "Athidhi Family Restaurant — made with heart, served like family" }],
    },
    twitter: { card: "summary_large_image", title: "Athidhi Family Restaurant", description: "Made with heart. Served like family.", images: ["/og-v2.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${inter.variable} ${playfair.variable}`}>{children}</body></html>;
}
