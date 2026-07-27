import { expect, test } from "@playwright/test";
import { tableOrderUrl } from "../app/lib/site-url";

const productionOrigin = "https://athidirestaurant.vercel.app";
const legacySpelling = ["athi", "dhi"].join("");

test("publishes canonical metadata on the Athidi production domain", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", productionOrigin);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", productionOrigin);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    `${productionOrigin}/og-v2.png`,
  );
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    `${productionOrigin}/og-v2.png`,
  );

  const structuredData = await page.locator('script[type="application/ld+json"]').textContent();
  expect(structuredData).toContain(`${productionOrigin}/`);
  expect((await page.content()).toLowerCase()).not.toContain(legacySpelling);
});

test("publishes corrected sitemap, robots, and manifest URLs", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const sitemapBody = await sitemap.text();
  expect(sitemapBody).toContain(productionOrigin);
  expect(sitemapBody.toLowerCase()).not.toContain(legacySpelling);

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  const robotsBody = await robots.text();
  expect(robotsBody).toContain(`Host: ${productionOrigin}`);
  expect(robotsBody).toContain(`Sitemap: ${productionOrigin}/sitemap.xml`);
  expect(robotsBody.toLowerCase()).not.toContain(legacySpelling);

  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  const manifestBody = await manifest.text();
  expect(manifestBody).toContain(`${productionOrigin}/`);
  expect(manifestBody.toLowerCase()).not.toContain(legacySpelling);
});

test("generates table QR destinations on the Athidi production domain", () => {
  expect(tableOrderUrl("a/b c")).toBe(`${productionOrigin}/table/a%2Fb%20c`);
});
