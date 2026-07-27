import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeRedirectPath } from "./app/lib/site-url";
import {
  canAccessWorkspace,
  defaultWorkspaceForRole,
  normalizeStaffRole,
} from "./app/lib/staff-access";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
          }),
        );
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/admin/login";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Unauthenticated or Anonymous User trying to access staff routes
  if (!isLoginPage && (!user || user.is_anonymous)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.searchParams.set("next", safeRedirectPath(pathname));
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Authenticated Staff User checks
  if (user && !user.is_anonymous) {
    const { data: staff } = await supabase
      .from("staff")
      .select("id, restaurant_id, branch_id, role_id, active")
      .eq("id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (!staff && !isLoginPage) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin/login";
      redirectUrl.searchParams.set("error", "access");
      return NextResponse.redirect(redirectUrl);
    }

    if (staff) {
      const { data: role } = await supabase
        .from("roles")
        .select("name")
        .eq("id", staff.role_id)
        .maybeSingle();

      const roleName = normalizeStaffRole(role?.name);

      // Logged in staff accessing login page -> redirect to role default workspace
      if (isLoginPage && roleName) {
        const workspace = defaultWorkspaceForRole(roleName);
        const redirectUrl = request.nextUrl.clone();
        if (workspace === "kitchen") {
          redirectUrl.pathname = "/chef";
        } else if (workspace === "waiter") {
          redirectUrl.pathname = "/waiter";
        } else {
          redirectUrl.pathname = `/admin/${workspace ?? "dashboard"}`;
        }
        redirectUrl.searchParams.delete("error");
        return NextResponse.redirect(redirectUrl);
      }

      // Check RBAC permissions for /chef and /waiter
      if (pathname === "/chef" && !canAccessWorkspace(roleName, "kitchen")) {
        const workspace = defaultWorkspaceForRole(roleName);
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = `/admin/${workspace ?? "dashboard"}`;
        redirectUrl.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(redirectUrl);
      }

      if (pathname === "/waiter" && !canAccessWorkspace(roleName, "waiter")) {
        const workspace = defaultWorkspaceForRole(roleName);
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = `/admin/${workspace ?? "dashboard"}`;
        redirectUrl.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/chef", "/waiter"],
};
