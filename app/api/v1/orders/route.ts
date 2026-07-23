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
  optionalBoolean,
  optionalString,
  readJsonObject,
  requiredNumber,
  requiredUuid,
  requireUser,
  supabaseError,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";

const orderStatuses = [
  "PLACED", "ACCEPTED", "PREPARING", "READY", "SERVED", "BILLED", "PAID", "CANCELLED",
] as const;
const spiceLevels = ["Mild", "Medium", "Spicy", "Extra spicy"] as const;
const select =
  "id,order_number,branch_id,table_session_id,status,subtotal,parcel_charge,tax,total,notes,spice_level,placed_at,accepted_at,preparing_at,ready_at,served_at,billed_at,paid_at,cancelled_at,order_items(*),table_session:table_sessions(id,table:tables(id,number))";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { limit, offset } = listOptions(request, 250);
    const tableAccess = hasTableSessionCredential(request)
      ? await requireTableSession(request, url.searchParams.get("tableSessionId") ?? undefined)
      : null;
    const supabase = tableAccess ? tableAccess.admin : (await requireUser(request)).supabase;
    let query = supabase
      .from("orders")
      .select(select)
      .order("placed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (tableAccess) query = query.eq("table_session_id", tableAccess.session.id);

    const tableSessionId = url.searchParams.get("tableSessionId");
    if (tableSessionId && !tableAccess) {
      if (!isUuid(tableSessionId)) throw new ApiError(400, "invalid_query", "tableSessionId must be a UUID.");
      query = query.eq("table_session_id", tableSessionId);
    }
    const branchId = url.searchParams.get("branchId");
    if (branchId) {
      if (!isUuid(branchId)) throw new ApiError(400, "invalid_query", "branchId must be a UUID.");
      query = query.eq("branch_id", branchId);
    }
    const statuses = url.searchParams.get("status")?.split(",").filter(Boolean) ?? [];
    if (statuses.length) {
      if (statuses.some((status) => !orderStatuses.includes(status as (typeof orderStatuses)[number]))) {
        throw new ApiError(400, "invalid_query", "One or more order statuses are invalid.");
      }
      query = query.in("status", statuses);
    }
    const result = await query;
    if (result.error) throw supabaseError(result.error, "Unable to load orders.");
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
    const tableAccess = await requireTableSession(request, tableSessionId);
    await enforceRateLimit(request, "order_placement", 6, 300, tableSessionId);
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
      throw new ApiError(422, "validation_error", "items must contain between 1 and 50 dishes.");
    }
    const items = body.items.map((rawItem, index) => {
      if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
        throw new ApiError(422, "validation_error", `items[${index}] must be an object.`);
      }
      const item = rawItem as Record<string, unknown>;
      return {
        menu_item_id: requiredUuid(item, "menuItemId"),
        quantity: requiredNumber(item, "quantity", { integer: true, min: 1, max: 50 }),
      };
    });
    const spiceLevel = body.spiceLevel === undefined
      ? "Medium"
      : enumValue(body, "spiceLevel", spiceLevels);
    const result = await tableAccess.admin.rpc("place_table_order_for_session", {
      p_table_session_id: tableSessionId,
      p_session_token_hash: tableAccess.tokenHash,
      p_items: items,
      p_notes: optionalString(body, "notes", { max: 500, nullable: true }) ?? null,
      p_spice_level: spiceLevel,
      p_is_parcel: optionalBoolean(body, "isParcel") ?? false,
    });
    if (result.error) throw supabaseError(result.error, "Unable to place the order.");
    return apiSuccess(
      {
        ...(result.data as Record<string, unknown>),
        table_session_id: tableSessionId,
      },
      201,
    );
  } catch (problem) {
    return handleApiError(problem);
  }
}
