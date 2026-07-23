import { apiSuccess } from "@/app/lib/api/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return apiSuccess({
    name: "Athidhi Restaurant API",
    version: "1.0.0",
    documentation: `${origin}/api/v1/openapi`,
    authentication: {
      staffBrowser: "Secure HttpOnly Supabase session cookie",
      staffExternalClient: "Authorization: Bearer <supabase-access-token>",
      guest:
        "POST /table-sessions issues a secure HttpOnly table capability cookie; customers do not create accounts or Supabase sessions",
      csrf:
        "Browser mutations require the x-csrf-token returned by GET /security/csrf; bearer-token clients are exempt",
    },
    resources: {
      restaurant: `${origin}/api/v1/restaurant`,
      menu: `${origin}/api/v1/menu`,
      tableSessions: `${origin}/api/v1/table-sessions`,
      orders: `${origin}/api/v1/orders`,
      serviceRequests: `${origin}/api/v1/service-requests`,
      tables: `${origin}/api/v1/tables`,
      analytics: `${origin}/api/v1/analytics`,
      authSession: `${origin}/api/v1/auth/session`,
      operations: `${origin}/api/v1/operations`,
      operationsStream: `${origin}/api/v1/operations/stream`,
      waiterTaskAssignment: `${origin}/api/v1/waiter-tasks/{id}/assignment`,
      csrf: `${origin}/api/v1/security/csrf`,
    },
  });
}
