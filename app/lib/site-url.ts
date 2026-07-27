const DEFAULT_SITE_ORIGIN = "https://athidirestaurant.vercel.app";
const LOCAL_URL_ORIGIN = "https://internal.athidi.invalid";
const UNSAFE_URL_CHARACTERS = /[\u0000-\u001f\u007f\\]/;
const ENCODED_REDIRECT_SEPARATOR = /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i;

function normalizeOrigin(value: string | undefined) {
  const candidate = value?.trim() || DEFAULT_SITE_ORIGIN;
  if (UNSAFE_URL_CHARACTERS.test(candidate)) return DEFAULT_SITE_ORIGIN;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return DEFAULT_SITE_ORIGIN;
    }
    return url.origin;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

function normalizeLocalPath(value: string | undefined, fallback: string) {
  if (!value || UNSAFE_URL_CHARACTERS.test(value)) return fallback;
  const candidate = value.startsWith("/") ? value : `/${value}`;
  if (candidate.startsWith("//")) return fallback;

  try {
    const url = new URL(candidate, LOCAL_URL_ORIGIN);
    if (url.origin !== LOCAL_URL_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export const SITE_ORIGIN = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);
export const ADMIN_ORIGIN = new URL(
  normalizeOrigin(process.env.NEXT_PUBLIC_ADMIN_URL || SITE_ORIGIN),
).origin;

export function siteUrl(path = "/") {
  const normalizedPath = normalizeLocalPath(path, "/");
  return new URL(normalizedPath, `${SITE_ORIGIN}/`).toString();
}

export function tableOrderUrl(qrToken: string) {
  return siteUrl(`/table/${encodeURIComponent(qrToken)}`);
}

export function adminUrl(path = "/admin") {
  const normalizedPath = normalizeLocalPath(path, "/admin");
  return new URL(normalizedPath, `${ADMIN_ORIGIN}/`).toString();
}

export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/",
) {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    ENCODED_REDIRECT_SEPARATOR.test(value)
  ) {
    return fallback;
  }
  return normalizeLocalPath(value, fallback);
}
