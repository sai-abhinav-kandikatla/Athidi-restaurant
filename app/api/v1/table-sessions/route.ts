import { getServiceSupabase } from "@/app/lib/supabase/admin";
import {
  assertCsrf,
  enforceRateLimit,
  hasTableSessionCredential,
  hashTableSessionToken,
  randomToken,
  requireTableSession,
  setTableSessionCookie,
} from "@/app/lib/api/security";
import {
  ApiError,
  RESTAURANT_SLUG,
  apiSuccess,
  handleApiError,
  optionalUuid,
  readJsonObject,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    await enforceRateLimit(request, "table_session", 10, 600);
    const body = await readJsonObject(request);
    const qrToken = optionalUuid(body, "qrToken");
    const branchId = optionalUuid(body, "branchId");
    if (!qrToken || body.tableNumber !== undefined) {
      throw new ApiError(422, "validation_error", "A valid QR token is required.");
    }

    const admin = getServiceSupabase();
    if (!admin) throw new ApiError(503, "security_unconfigured", "Security services are not configured.");
    const restaurant = await admin
      .from("restaurants")
      .select("id")
      .eq("slug", RESTAURANT_SLUG)
      .maybeSingle();
    if (restaurant.error || !restaurant.data) {
      throw new ApiError(503, "restaurant_unavailable", "The restaurant is temporarily unavailable.");
    }
    let branchesQuery = admin
      .from("branches")
      .select("id,name,tax_rate,parcel_charge_enabled,qr_ordering_enabled")
      .eq("restaurant_id", restaurant.data.id);
    if (branchId) branchesQuery = branchesQuery.eq("id", branchId);
    const branches = await branchesQuery;
    if (branches.error || !branches.data?.length) {
      throw new ApiError(404, "table_not_found", "The table could not be found.");
    }
    const branchIds = branches.data.map((branch) => branch.id);
    const tableQuery = admin
      .from("tables")
      .select("id,branch_id,number,state")
      .in("branch_id", branchIds)
      .eq("qr_token", qrToken);
    const tableResult = await tableQuery.maybeSingle();
    const table = tableResult.data;
    if (tableResult.error || !table) {
      throw new ApiError(404, "table_not_found", "The table could not be found.");
    }
    const branch = branches.data.find((item) => item.id === table.branch_id);
    if (!branch?.qr_ordering_enabled) {
      throw new ApiError(503, "ordering_unavailable", "Table ordering is temporarily unavailable.");
    }

    if (hasTableSessionCredential(request)) {
      try {
        const current = await requireTableSession(request);
        if (current.session.table_id === table.id) {
          return tableSessionResponse(current.session, current.session.table!.branch!, request, false);
        }
      } catch {
        // An expired or different-table credential is replaced below.
      }
    }

    const token = randomToken();
    const tokenHash = await hashTableSessionToken(token);
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    const inserted = await admin
      .from("table_sessions")
      .insert({
        table_id: table.id,
        auth_user_id: null,
        session_token_hash: tokenHash,
        state: "BROWSING",
        expires_at: expiresAt,
      })
      .select("id,table_id,state,opened_at,expires_at")
      .single();
    if (inserted.error || !inserted.data) {
      console.error("Unable to create table session", { code: inserted.error?.code });
      throw new ApiError(503, "table_session_unavailable", "The table session could not be created.");
    }
    if (table.state === "AVAILABLE") {
      await admin.from("tables").update({ state: "BROWSING" }).eq("id", table.id).eq("state", "AVAILABLE");
    }

    const response = apiSuccess({
      session_id: inserted.data.id,
      table_id: table.id,
      table_number: table.number,
      branch_id: branch.id,
      branch_name: branch.name,
      tax_rate: Number(branch.tax_rate),
      parcel_charge_enabled: branch.parcel_charge_enabled,
      session_opened_at: inserted.data.opened_at,
      session_state: inserted.data.state,
      expires_at: inserted.data.expires_at,
    }, 201);
    setTableSessionCookie(response, `${inserted.data.id}.${token}`);
    return response;
  } catch (problem) {
    return handleApiError(problem);
  }
}

function tableSessionResponse(
  session: {
    id: string;
    table_id: string;
    state: string;
    opened_at: string;
    expires_at: string;
    table: { id: string; number: number; branch_id: string } | null;
  },
  branch: { id: string; name: string; tax_rate: number | string; parcel_charge_enabled: boolean },
  request: Request,
  created: boolean,
) {
  const response = apiSuccess({
    session_id: session.id,
    table_id: session.table_id,
    table_number: session.table?.number,
    branch_id: branch.id,
    branch_name: branch.name,
    tax_rate: Number(branch.tax_rate),
    parcel_charge_enabled: branch.parcel_charge_enabled,
    session_opened_at: session.opened_at,
    session_state: session.state,
    expires_at: session.expires_at,
  }, created ? 201 : 200);
  const cookieHeader = request.headers.get("cookie") ?? "";
  const currentCookie = cookieHeader.split(";").map((item) => item.trim()).find((item) => item.startsWith("athidhi_table_session=") || item.startsWith("__Host-athidhi_table_session="));
  if (currentCookie) {
    const value = decodeURIComponent(currentCookie.slice(currentCookie.indexOf("=") + 1));
    setTableSessionCookie(response, value);
  }
  return response;
}
