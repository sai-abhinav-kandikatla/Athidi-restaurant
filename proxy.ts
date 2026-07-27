import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeRedirectPath } from "./app/lib/site-url";
import {
  type AdminWorkspace,
  canAccessWorkspace,
  defaultWorkspaceForRole,
  isAdminWorkspace,
  normalizeStaffRole,
} from "./app/lib/staff-access";

export async function proxy(request: NextRequest) {
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

      // Function to resolve role default workspace URL
      const getRoleLandingUrl = () => {
        const workspace = defaultWorkspaceForRole(roleName);
        if (workspace === "kitchen") return "/chef";
        if (workspace === "waiter") return "/waiter";
        return `/admin/${workspace ?? "dashboard"}`;
      };

      // Logged in staff accessing login page -> redirect to default landing URL
      if (isLoginPage && roleName) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = getRoleLandingUrl();
        redirectUrl.searchParams.delete("error");
        return NextResponse.redirect(redirectUrl);
      }

      // Determine requested workspace
      let targetWorkspace: AdminWorkspace | null = null;
      if (pathname === "/chef" || pathname === "/admin/kitchen") {
        targetWorkspace = "kitchen";
      } else if (pathname === "/waiter" || pathname === "/admin/waiter") {
        targetWorkspace = "waiter";
      } else if (pathname.startsWith("/admin/")) {
        const seg = pathname.replace("/admin/", "").split("/")[0];
        if (isAdminWorkspace(seg)) targetWorkspace = seg;
      }

      // Check RBAC permissions if target workspace identified
      if (targetWorkspace && !canAccessWorkspace(roleName, targetWorkspace)) {
        const landingPath = getRoleLandingUrl();
        // Prevent redirect loop if already at landing path
        if (pathname !== landingPath) {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = landingPath;
          redirectUrl.searchParams.set("error", "unauthorized");
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
  }

  return response;
}

export default proxy;

export const config = {
  matcher: ["/admin/:path*", "/chef", "/waiter"],
};
