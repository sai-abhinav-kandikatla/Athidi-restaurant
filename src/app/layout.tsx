import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import Providers from "@/app/providers";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Athidi | Premium Family Restaurant",
  description: "Experience Michelin-star Indian fine dining at Athidi. Scan your table QR code, browse our curated signature dishes, order online, and track your food live.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F0F0F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0F0F0F] text-white">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}


