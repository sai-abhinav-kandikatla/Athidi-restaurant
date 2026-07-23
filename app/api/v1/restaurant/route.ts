import { assertCsrf, auditStaffEvent } from "@/app/lib/api/security";
import {
  ApiError,
  RESTAURANT_SLUG,
  apiSuccess,
  getApiSupabase,
  handleApiError,
  optionalBoolean,
  optionalNumber,
  optionalString,
  readJsonObject,
  requireStaff,
  requireStaffRole,
  supabaseError,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";

const restaurantSelect =
  "id,name,slug,phone,whatsapp,branches(id,name,address,timezone,opens_at,closes_at,gstin,tax_rate,qr_ordering_enabled,parcel_charge_enabled,realtime_alerts_enabled)";

export async function GET(request: Request) {
  try {
    const supabase = await getApiSupabase(request);
    const result = await supabase
      .from("restaurants")
      .select(restaurantSelect)
      .eq("slug", RESTAURANT_SLUG)
      .maybeSingle();
    if (result.error) throw supabaseError(result.error, "Unable to load the restaurant.");
    if (!result.data) throw new ApiError(404, "not_found", "The restaurant was not found.");
    return apiSuccess(result.data);
  } catch (problem) {
    return handleApiError(problem);
  }
}

export async function PATCH(request: Request) {
  try {
    assertCsrf(request);
    const { supabase, staff } = await requireStaff(request, "manage_settings");
    const role = requireStaffRole(staff, ["OWNER", "MANAGER"]);
    const body = await readJsonObject(request);
    const restaurantPatch = compact({
      name: optionalString(body, "name", { max: 120 }),
      phone: optionalString(body, "phone", { max: 30, nullable: true }),
      whatsapp: optionalString(body, "whatsapp", { max: 30, nullable: true }),
    });
    const branchPatch = compact({
      name: optionalString(body, "branchName", { max: 120 }),
      address: optionalString(body, "address", { max: 500, nullable: true }),
      timezone: optionalString(body, "timezone", { max: 80 }),
      opens_at: optionalString(body, "opensAt", { max: 8, nullable: true }),
      closes_at: optionalString(body, "closesAt", { max: 8, nullable: true }),
      gstin: optionalString(body, "gstin", { max: 20, nullable: true }),
      tax_rate: optionalNumber(body, "taxRate", { min: 0, max: 100 }),
      qr_ordering_enabled: optionalBoolean(body, "qrOrderingEnabled"),
      parcel_charge_enabled: optionalBoolean(body, "parcelChargeEnabled"),
      realtime_alerts_enabled: optionalBoolean(body, "realtimeAlertsEnabled"),
    });
    if (role === "MANAGER") {
      const ownerOnlyFields = [
        ...Object.keys(restaurantPatch),
        ...["name", "gstin", "tax_rate"].filter((field) => field in branchPatch),
      ];
      if (ownerOnlyFields.length) {
        throw new ApiError(403, "owner_required", "Only the owner can change identity, GST, or tax settings.");
      }
    }
    if (!Object.keys(restaurantPatch).length && !Object.keys(branchPatch).length) {
      throw new ApiError(422, "validation_error", "At least one setting must be provided.");
    }

    if (Object.keys(restaurantPatch).length) {
      const result = await supabase
        .from("restaurants")
        .update(restaurantPatch)
        .eq("id", staff.restaurantId);
      if (result.error) throw supabaseError(result.error, "Unable to update restaurant settings.");
    }
    if (Object.keys(branchPatch).length) {
      const result = await supabase
        .from("branches")
        .update(branchPatch)
        .eq("id", staff.branchId);
      if (result.error) throw supabaseError(result.error, "Unable to update branch settings.");
    }

    const updated = await supabase
      .from("restaurants")
      .select(restaurantSelect)
      .eq("id", staff.restaurantId)
      .single();
    if (updated.error) throw supabaseError(updated.error, "Unable to reload restaurant settings.");
    await auditStaffEvent(staff, "SETTINGS_UPDATED", {
      restaurantFields: Object.keys(restaurantPatch),
      branchFields: Object.keys(branchPatch),
    }, "branch", staff.branchId);
    return apiSuccess(updated.data);
  } catch (problem) {
    return handleApiError(problem);
  }
}

function compact(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
