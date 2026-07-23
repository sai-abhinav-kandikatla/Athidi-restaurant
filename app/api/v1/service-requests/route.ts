import {
  assertCsrf,
  enforceRateLimit,
  hasTableSessionCredential,
  requireTableSession,
} from "@/app/lib/api/security";
import {
  ApiError,
  apiSuccess,
  enumValue,
  handleApiError,
  isUuid,
  listOptions,
  readJsonObject,
  requiredUuid,
  requireUser,
  supabaseError,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";
const requestTypes = ["BILL", "WAITER", "WATER", "SPOON", "TISSUE"] as const;
const requestStatuses = ["OPEN", "ACKNOWLEDGED", "RESOLVED"] as const;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { limit, offset } = listOptions(request, 250);
    const tableAccess = hasTableSessionCredential(request)
      ? await requireTableSession(request, url.searchParams.get("tableSessionId") ?? undefined)
      : null;
    const supabase = tableAccess ? tableAccess.admin : (await requireUser(request)).supabase;
    let query = supabase
      .from("notifications")
      .select("id,branch_id,table_session_id,request_type,status,priority,created_at,acknowledged_at,resolved_at,table_session:table_sessions(id,table:tables(id,number))")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (tableAccess) query = query.eq("table_session_id", tableAccess.session.id);
    const tableSessionId = url.searchParams.get("tableSessionId");
    if (tableSessionId && !tableAccess) {
      if (!isUuid(tableSessionId)) throw new ApiError(400, "invalid_query", "tableSessionId must be a UUID.");
      query = query.eq("table_session_id", tableSessionId);
    }
    const status = url.searchParams.get("status");
    if (status) {
      if (!requestStatuses.includes(status as (typeof requestStatuses)[number])) {
        throw new ApiError(400, "invalid_query", "status is invalid.");
      }
      query = query.eq("status", status);
    }
    const result = await query;
    if (result.error) throw supabaseError(result.error, "Unable to load service requests.");
    return apiSuccess(result.data ?? [], 200, { limit, offset });
  } catch (problem) {
    return handleApiError(problem);
  }
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const body = await readJsonObject(request);
    const tableSessionId = requiredUuid(body, "tableSessionId");
    const requestType = enumValue(body, "requestType", requestTypes);
    const tableAccess = await requireTableSession(request, tableSessionId);
    await enforceRateLimit(
      request,
      requestType === "BILL" ? "bill_request" : "service_request",
      requestType === "BILL" ? 3 : 6,
      300,
      tableSessionId,
    );
    const result = await tableAccess.admin.rpc("create_service_request_for_session", {
      p_table_session_id: tableSessionId,
      p_session_token_hash: tableAccess.tokenHash,
      p_request_type: requestType,
    });
    if (result.error) throw supabaseError(result.error, "Unable to create the service request.");
    return apiSuccess(result.data, 201);
  } catch (problem) {
    return handleApiError(problem);
  }
}
