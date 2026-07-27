const DEFAULT_SITE_ORIGIN = "https://athidirestaurant.vercel.app";

function normalizeOrigin(value: string | undefined) {
  const candidate = value?.trim() || DEFAULT_SITE_ORIGIN;
  return candidate.replace(/\/+$/, "");
}

export const SITE_ORIGIN = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);
export const ADMIN_ORIGIN = new URL(
  normalizeOrigin(process.env.NEXT_PUBLIC_ADMIN_URL || SITE_ORIGIN),
).origin;

export function siteUrl(path = "/") {
  const normalizedPath = `/${path.replace(/^\/+/, "")}`;
  return new URL(normalizedPath, `${SITE_ORIGIN}/`).toString();
}

export function tableOrderUrl(qrToken: string) {
  return siteUrl(`/table/${encodeURIComponent(qrToken)}`);
}

export function adminUrl(path = "/admin") {
  const normalizedPath = `/${path.replace(/^\/+/, "")}`;
  return new URL(normalizedPath, `${ADMIN_ORIGIN}/`).toString();
}
