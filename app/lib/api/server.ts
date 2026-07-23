import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabasePublicConfig } from "../supabase/config";
import { getServerSupabase } from "../supabase/server";

export const RESTAURANT_SLUG = "athidhi-family-restaurant";

type JsonRecord = Record<string, unknown>;

export type StaffContext = {
  id: string;
  restaurantId: string;
  branchId: string;
  fullName: string;
  roleName: string;
  permissions: Record<string, boolean>;
};

export type StaffRole = "OWNER" | "MANAGER" | "CHEF" | "WAITER" | "CASHIER";

export type AuthenticatedApiContext = {
  supabase: SupabaseClient;
  user: User;
  staff: StaffContext | null;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function apiSuccess(data: unknown, status = 200, meta?: JsonRecord) {
  return NextResponse.json(meta ? { data, meta } : { data }, { status });
}

export function apiNoContent() {
  return new NextResponse(null, { status: 204 });
}

export function handleApiError(problem: unknown) {
  if (problem instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: problem.code,
          message: problem.message,
          ...(problem.details === undefined ? {} : { details: problem.details }),
        },
      },
      { status: problem.status },
    );
  }

  console.error("Unhandled API error", problem);
  return NextResponse.json(
    { error: { code: "internal_error", message: "The request could not be completed." } },
    { status: 500 },
  );
}

export async function getApiSupabase(request: Request): Promise<SupabaseClient> {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new ApiError(
      503,
      "backend_unconfigured",
      "The restaurant backend is not configured.",
    );
  }

  const authorization = request.headers.get("authorization")?.trim();
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return createClient(config.url, config.anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    throw new ApiError(
      503,
      "backend_unconfigured",
      "The restaurant backend is not configured.",
    );
  }
  return supabase;
}

export async function requireUser(request: Request): Promise<AuthenticatedApiContext> {
  const supabase = await getApiSupabase(request);
  const bearerToken = getBearerToken(request);
  const userResult = bearerToken
    ? await supabase.auth.getUser(bearerToken)
    : await supabase.auth.getUser();

  if (userResult.error || !userResult.data.user) {
    throw new ApiError(401, "authentication_required", "Authentication is required.");
  }

  const staffResult = await supabase
    .from("staff")
    .select("id,restaurant_id,branch_id,full_name,active,role:roles(name,permissions)")
    .eq("id", userResult.data.user.id)
    .maybeSingle();

  if (staffResult.error) throw supabaseError(staffResult.error, "Unable to load staff access.");

  const rawStaff = staffResult.data as unknown as
    | {
        id: string;
        restaurant_id: string;
        branch_id: string | null;
        full_name: string;
        active: boolean;
        role: { name: string; permissions: Record<string, boolean> } | null;
      }
    | null;

  const staff = rawStaff?.active && rawStaff.branch_id && rawStaff.role
    ? {
        id: rawStaff.id,
        restaurantId: rawStaff.restaurant_id,
        branchId: rawStaff.branch_id,
        fullName: rawStaff.full_name,
        roleName: rawStaff.role.name,
        permissions: rawStaff.role.permissions ?? {},
      }
    : null;

  return { supabase, user: userResult.data.user, staff };
}

export async function requireStaff(request: Request, permission?: string) {
  const context = await requireUser(request);
  if (!context.staff) {
    throw new ApiError(403, "staff_access_required", "An active staff account is required.");
  }
  if (permission && !context.staff.permissions[permission]) {
    throw new ApiError(403, "permission_denied", `The ${permission} permission is required.`);
  }
  return context as AuthenticatedApiContext & { staff: StaffContext };
}

export function normalizeStaffRole(roleName: string): StaffRole | null {
  const role = roleName.trim().toUpperCase();
  if (role === "KITCHEN") return "CHEF";
  if (["OWNER", "MANAGER", "CHEF", "WAITER", "CASHIER"].includes(role)) {
    return role as StaffRole;
  }
  return null;
}

export function requireStaffRole(staff: StaffContext, allowed: readonly StaffRole[]) {
  const role = normalizeStaffRole(staff.roleName);
  if (!role || !allowed.includes(role)) {
    throw new ApiError(403, "role_forbidden", "Your staff role cannot perform this operation.");
  }
  return role;
}

export async function readJsonObject(request: Request): Promise<JsonRecord> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 128_000) {
    throw new ApiError(413, "payload_too_large", "The request body is too large.");
  }

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "The request body must be valid JSON.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "invalid_body", "The request body must be a JSON object.");
  }
  return value as JsonRecord;
}

export function requiredString(
  body: JsonRecord,
  field: string,
  options: { max?: number; min?: number } = {},
) {
  const value = body[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(422, "validation_error", `${field} is required.`);
  }
  const trimmed = value.trim();
  const min = options.min ?? 1;
  const max = options.max ?? 500;
  if (trimmed.length < min || trimmed.length > max) {
    throw new ApiError(
      422,
      "validation_error",
      `${field} must be between ${min} and ${max} characters.`,
    );
  }
  return trimmed;
}

export function optionalString(
  body: JsonRecord,
  field: string,
  options: { max?: number; nullable?: boolean } = {},
) {
  const value = body[field];
  if (value === undefined) return undefined;
  if (value === null && options.nullable) return null;
  if (typeof value !== "string") {
    throw new ApiError(422, "validation_error", `${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > (options.max ?? 500)) {
    throw new ApiError(422, "validation_error", `${field} is too long.`);
  }
  return trimmed || (options.nullable ? null : "");
}

export function requiredNumber(
  body: JsonRecord,
  field: string,
  options: { integer?: boolean; min?: number; max?: number } = {},
) {
  const value = body[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiError(422, "validation_error", `${field} must be a number.`);
  }
  if (options.integer && !Number.isInteger(value)) {
    throw new ApiError(422, "validation_error", `${field} must be an integer.`);
  }
  if (options.min !== undefined && value < options.min) {
    throw new ApiError(422, "validation_error", `${field} must be at least ${options.min}.`);
  }
  if (options.max !== undefined && value > options.max) {
    throw new ApiError(422, "validation_error", `${field} must be at most ${options.max}.`);
  }
  return value;
}

export function optionalNumber(
  body: JsonRecord,
  field: string,
  options: { integer?: boolean; min?: number; max?: number } = {},
) {
  if (body[field] === undefined) return undefined;
  return requiredNumber(body, field, options);
}

export function optionalBoolean(body: JsonRecord, field: string) {
  const value = body[field];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new ApiError(422, "validation_error", `${field} must be a boolean.`);
  }
  return value;
}

export function requiredUuid(body: JsonRecord, field: string) {
  const value = requiredString(body, field, { max: 36 });
  if (!isUuid(value)) {
    throw new ApiError(422, "validation_error", `${field} must be a valid UUID.`);
  }
  return value;
}

export function optionalUuid(body: JsonRecord, field: string, nullable = false) {
  const value = body[field];
  if (value === undefined) return undefined;
  if (value === null && nullable) return null;
  if (typeof value !== "string" || !isUuid(value)) {
    throw new ApiError(422, "validation_error", `${field} must be a valid UUID.`);
  }
  return value;
}

export function enumValue<T extends string>(
  body: JsonRecord,
  field: string,
  allowed: readonly T[],
) {
  const value = body[field];
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ApiError(
      422,
      "validation_error",
      `${field} must be one of: ${allowed.join(", ")}.`,
    );
  }
  return value as T;
}

export function optionalEnumValue<T extends string>(
  body: JsonRecord,
  field: string,
  allowed: readonly T[],
) {
  if (body[field] === undefined) return undefined;
  return enumValue(body, field, allowed);
}

export function listOptions(request: Request, maximum = 100) {
  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? 50);
  const rawOffset = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), maximum) : 50;
  const offset = Number.isInteger(rawOffset) ? Math.min(Math.max(rawOffset, 0), 10_000) : 0;
  return { limit, offset };
}

export function slugify(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (!slug) throw new ApiError(422, "validation_error", "A valid slug could not be created.");
  return slug;
}

export function supabaseError(
  error: { code?: string; message?: string; details?: string | null },
  fallbackMessage = "The database request failed.",
) {
  const code = error.code ?? "database_error";
  console.error("Database operation rejected", { code });
  if (code === "23505") return new ApiError(409, "conflict", "A record with those details already exists.");
  if (code === "23503") return new ApiError(409, "related_record_exists", "This record is still in use and cannot be changed.");
  if (code === "23514" || code === "22P02") return new ApiError(422, "validation_error", "One or more values are invalid.");
  if (code === "PGRST116") return new ApiError(404, "not_found", "The requested record was not found.");
  const message = error.message?.toLowerCase() ?? "";
  if (message.includes("waiter task is already assigned")) {
    return new ApiError(409, "task_already_assigned", "This waiter task is already assigned.");
  }
  if (message.includes("waiter task is unavailable")) {
    return new ApiError(409, "task_unavailable", "This waiter task is no longer available.");
  }
  if (message.includes("waiter task assignment not found")) {
    return new ApiError(409, "assignment_not_found", "This waiter task is not currently assigned.");
  }
  if (message.includes("waiter task is assigned to another staff member")) {
    return new ApiError(409, "task_owned_by_another_waiter", "This waiter task is assigned to another staff member.");
  }
  if (message.includes("service request not found")) {
    return new ApiError(404, "not_found", "The service request was not found.");
  }
  if (message.includes("service request belongs to another branch")) {
    return new ApiError(403, "permission_denied", "You do not have access to this service request.");
  }
  if (message.includes("invalid service request status")) {
    return new ApiError(422, "validation_error", "The service request status is invalid.");
  }
  if (code === "42501" || message.includes("permission denied")) {
    return new ApiError(403, "permission_denied", "You do not have access to this operation.");
  }
  const safeBusinessMessages = [
    "authentication is required",
    "table qr code is invalid",
    "table number is invalid",
    "table ordering is temporarily unavailable",
    "at least one menu item is required",
    "order is too large",
    "invalid spice level",
    "table session is invalid or closed",
    "invalid item quantity",
    "one or more dishes are unavailable",
    "order not found",
    "staff access required",
    "order belongs to another branch",
    "invalid order status transition",
    "order cannot be paid",
    "payment amount must be positive",
    "payment amount exceeds outstanding balance",
    "bill cannot be requested before all food is served",
    "staff role cannot manage waiter tasks",
  ];
  const safeMessage = safeBusinessMessages.find((item) => message.includes(item));
  if (safeMessage) {
    return new ApiError(400, "request_rejected", safeMessage[0].toUpperCase() + safeMessage.slice(1) + ".");
  }
  return new ApiError(500, "database_error", fallbackMessage);
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization?.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token || null;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
