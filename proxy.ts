import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabasePublicConfig, isProductionRuntime } from "./app/lib/supabase/config";

type StaffAccess = {
  active: boolean;
  role: { name: string } | null;
};

const adminRouteRoles: Record<string, readonly string[]> = {
  "/admin/dashboard": ["OWNER", "MANAGER"],
  "/admin/orders": ["OWNER", "MANAGER"],
  "/admin/live-tables": ["OWNER", "MANAGER"],
  "/admin/kitchen": ["OWNER", "MANAGER", "CHEF"],
  "/admin/waiter": ["OWNER", "MANAGER", "WAITER"],
  "/admin/settings": ["OWNER", "MANAGER"],
  "/admin/billing": ["OWNER", "CASHIER"],
};

export async function proxy(request: NextRequest) {
  if (shouldRequireHttps(request)) {
    const destination = request.nextUrl.clone();
    destination.protocol = "https:";
    return secureResponse(NextResponse.redirect(destination, 308), request);
  }

  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const config = getSupabasePublicConfig();
  if (!config || !pathname.startsWith("/admin")) {
    return secureResponse(response, request);
  }

  const supabase = createServerClient(config.url, config.anonKey, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, { ...options, ...authCookieOptions() });
        }
      },
    },
  });

  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  const isLogin = pathname === "/admin/login";
  if (!user || user.is_anonymous) {
    if (isLogin) return secureResponse(response, request);
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = "";
    login.searchParams.set("next", safeAdminReturnPath(pathname + request.nextUrl.search));
    return secureResponse(copyCookies(NextResponse.redirect(login), response), request);
  }

  const staffResult = await supabase
    .from("staff")
    .select("active,role:roles(name)")
    .eq("id", user.id)
    .maybeSingle();
  const staff = staffResult.data as unknown as StaffAccess | null;
  if (!staff?.active || !staff.role) {
    await supabase.auth.signOut();
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = "?error=access";
    return secureResponse(copyCookies(NextResponse.redirect(login), response), request);
  }

  const role = normalizeRole(staff.role.name);
  if (isLogin || pathname === "/admin") {
    const destination = request.nextUrl.clone();
    destination.pathname = defaultAdminRoute(role);
    destination.search = "";
    return secureResponse(copyCookies(NextResponse.redirect(destination), response), request);
  }

  const allowedRoles = adminRouteRoles[pathname];
  if (allowedRoles && !allowedRoles.includes(role)) {
    return secureResponse(forbiddenResponse(), request);
  }

  return secureResponse(response, request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|athidhi-logo.png|og.png|og-v2.png).*)"],
};

function authCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProductionRuntime(),
  };
}

function normalizeRole(role: string) {
  const normalized = role.trim().toUpperCase();
  return normalized === "KITCHEN" ? "CHEF" : normalized;
}

function defaultAdminRoute(role: string) {
  if (role === "CHEF") return "/admin/kitchen";
  if (role === "WAITER") return "/admin/waiter";
  if (role === "CASHIER") return "/admin/billing";
  return "/admin/dashboard";
}

function safeAdminReturnPath(value: string) {
  if (!value.startsWith("/admin/") || value.startsWith("//")) return "/admin";
  return value;
}

function copyCookies(target: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  return target;
}

function forbiddenResponse() {
  return new NextResponse(
    "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Forbidden · Athidhi</title></head><body style=\"font-family:system-ui;background:#fff8ee;color:#35140f;display:grid;place-items:center;min-height:100vh;margin:0\"><main style=\"max-width:34rem;padding:3rem;text-align:center\"><p style=\"letter-spacing:.14em;font-weight:700;color:#8b1e24\">403 · FORBIDDEN</p><h1>This workspace is not assigned to your role.</h1><p>Ask the restaurant owner if you believe your staff permissions should be changed.</p><a href=\"/admin\" style=\"color:#8b1e24;font-weight:700\">Return to your workspace</a></main></body></html>",
    { status: 403, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function shouldRequireHttps(request: NextRequest) {
  if (!isProductionRuntime()) return false;
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) return false;
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return protocol !== "https";
}

function secureResponse(response: NextResponse, request: NextRequest) {
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.headers.set("cross-origin-opener-policy", "same-origin");
  response.headers.set("content-security-policy", contentSecurityPolicy());
  if (isProductionRuntime() && !shouldRequireHttps(request)) {
    response.headers.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  }
  if (request.nextUrl.pathname.startsWith("/api/") || request.nextUrl.pathname.startsWith("/admin")) {
    response.headers.set("cache-control", "no-store");
  }
  return response;
}

function contentSecurityPolicy() {
  const production = isProductionRuntime();
  const development = production ? "" : " 'unsafe-eval'";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${development}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://images.unsplash.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co http://127.0.0.1:* ws://127.0.0.1:*",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];
  if (production) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}
