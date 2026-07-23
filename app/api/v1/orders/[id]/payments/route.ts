import { assertCsrf } from "@/app/lib/api/security";
import {
  ApiError,
  apiSuccess,
  enumValue,
  handleApiError,
  isUuid,
  optionalString,
  readJsonObject,
  requiredNumber,
  requireStaff,
  requireStaffRole,
  supabaseError,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };
const methods = ["UPI", "CASH", "CARD"] as const;

export async function GET(request: Request, context: RouteContext) {
  try {
    const access = await requireStaff(request, "manage_payments");
    requireStaffRole(access.staff, ["OWNER", "MANAGER", "CASHIER"]);
    const { id } = await context.params;
    validateId(id);
    const result = await access.supabase
      .from("payments")
      .select("id,order_id,method,amount,status,provider_reference,recorded_by,created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: false });
    if (result.error) throw supabaseError(result.error, "Unable to load payments.");
    return apiSuccess(result.data ?? []);
  } catch (problem) {
    return handleApiError(problem);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertCsrf(request);
    const { supabase, staff } = await requireStaff(request, "manage_payments");
    requireStaffRole(staff, ["OWNER", "MANAGER", "CASHIER"]);
    const { id } = await context.params;
    validateId(id);
    const body = await readJsonObject(request);
    const result = await supabase.rpc("record_payment", {
      p_order_id: id,
      p_method: enumValue(body, "method", methods),
      p_amount: requiredNumber(body, "amount", { min: 0.01, max: 10_000_000 }),
      p_provider_reference: optionalString(body, "providerReference", { max: 120, nullable: true }) ?? null,
    });
    if (result.error) throw supabaseError(result.error, "Unable to record the payment.");
    return apiSuccess(result.data, 201);
  } catch (problem) {
    return handleApiError(problem);
  }
}

function validateId(id: string) {
  if (!isUuid(id)) throw new ApiError(400, "invalid_id", "The order id must be a UUID.");
}
