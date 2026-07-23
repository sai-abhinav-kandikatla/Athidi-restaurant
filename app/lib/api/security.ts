import { NextResponse } from "next/server";
import { getServiceSupabase } from "../supabase/admin";
import { isProductionRuntime } from "../supabase/config";
import {
  ApiError,
  RESTAURANT_SLUG,
  getBearerToken,
  type StaffContext,
} from "./server";

const CSRF_HEADER = "x-csrf-token";

export function createCsrfResponse() {
  const token = randomToken();
  const response = NextResponse.json({ data: { token } });
  response.cookies.set(csrfCookieName(), token, {
    httpOnly: false,
    sameSite: "strict",
    secure: isProductionRuntime(),
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  response.headers.set("cache-control", "no-store");
  return response;
}

export function assertCsrf(request: Request) {
  if (getBearerToken(request)) return;
  const origin = request.headers.get("origin");
  const expectedOrigin = requestOrigin(request);
  if (!origin || origin !== expectedOrigin) {
    throw new ApiError(403, "csrf_rejected", "The request origin could not be verified.");
  }
  const headerToken = request.headers.get(CSRF_HEADER);
  const cookieToken = readCookie(request, csrfCookieName());
  if (!headerToken || !cookieToken || !constantTimeEqual(headerToken, cookieToken)) {
    throw new ApiError(403, "csrf_rejected", "The security token is missing or invalid.");
  }
}

export async function enforceRateLimit(
  request: Request,
  scope: "admin_login" | "order_placement" | "service_request" | "bill_request" | "table_session",
  limit: number,
  windowSeconds: number,
  subject?: string,
) {
  const admin = getServiceSupabase();
  const secret = process.env.JWT_SECRET?.trim();
  if (!admin || !secret) {
    throw new ApiError(503, "security_unconfigured", "Security services are not configured.");
  }
  const clientAddress = getClientAddress(request);
  const keyHash = await hmacHex(secret, `${scope}:${clientAddress}:${subject ?? ""}`);
  const result = await admin.rpc("check_rate_limit", {
    p_key_hash: keyHash,
    p_scope: scope,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (result.error) {
    console.error("Rate limit check failed", { scope, code: result.error.code });
    throw new ApiError(503, "security_unavailable", "The security check is temporarily unavailable.");
  }
  const decision = result.data as { allowed: boolean; retry_after_seconds: number };
  if (!decision.allowed) {
    throw new ApiError(
      429,
      "rate_limit_exceeded",
      "Too many requests. Please wait before trying again.",
      { retryAfterSeconds: decision.retry_after_seconds },
    );
  }
}

export async function auditStaffEvent(
  staff: StaffContext,
  action: string,
  metadata: Record<string, unknown> = {},
  entityType?: string,
  entityId?: string,
) {
  const admin = getServiceSupabase();
  if (!admin) return false;
  const result = await admin.from("activity_logs").insert({
    restaurant_id: staff.restaurantId,
    branch_id: staff.branchId,
    staff_id: staff.id,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    data: safeMetadata(metadata),
  });
  if (result.error) {
    console.error("Audit write failed", { action, code: result.error.code });
    return false;
  }
  return true;
}

export async function auditLoginEvent(
  action: "STAFF_LOGIN" | "LOGIN_FAILED",
  email: string,
  request: Request,
  staff?: StaffContext,
) {
  const admin = getServiceSupabase();
  const secret = process.env.JWT_SECRET?.trim();
  if (!admin || !secret) return false;
  const emailHash = await hmacHex(secret, email.trim().toLowerCase());
  const ipHash = await hmacHex(secret, getClientAddress(request));
  if (staff) return auditStaffEvent(staff, action, { emailHash, ipHash });

  const profile = await admin
    .from("restaurants")
    .select("id,branches(id)")
    .eq("slug", RESTAURANT_SLUG)
    .maybeSingle();
  const raw = profile.data as unknown as { id: string; branches: { id: string }[] | null } | null;
  if (!raw) return false;
  const result = await admin.from("activity_logs").insert({
    restaurant_id: raw.id,
    branch_id: raw.branches?.[0]?.id ?? null,
    staff_id: null,
    action,
    data: { emailHash, ipHash },
  });
  return !result.error;
}

export function tableSessionCookieName() {
  return isProductionRuntime() ? "__Host-athidhi_table_session" : "athidhi_table_session";
}

export function setTableSessionCookie(response: NextResponse, value: string) {
  response.cookies.set(tableSessionCookieName(), value, {
    httpOnly: true,
    sameSite: "strict",
    secure: isProductionRuntime(),
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export function clearTableSessionCookie(response: NextResponse) {
  response.cookies.set(tableSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "strict",
    secure: isProductionRuntime(),
    path: "/",
    maxAge: 0,
  });
}

export function readTableSessionCredential(request: Request) {
  const value = readCookie(request, tableSessionCookieName());
  if (!value) throw new ApiError(401, "table_session_required", "The table session is missing or expired.");
  const separator = value.indexOf(".");
  if (separator < 1) throw new ApiError(401, "table_session_invalid", "The table session is invalid.");
  return { sessionId: value.slice(0, separator), token: value.slice(separator + 1) };
}

export function hasTableSessionCredential(request: Request) {
  return Boolean(readCookie(request, tableSessionCookieName()));
}

export async function requireTableSession(request: Request, expectedSessionId?: string) {
  const credential = readTableSessionCredential(request);
  if (expectedSessionId && credential.sessionId !== expectedSessionId) {
    throw new ApiError(403, "table_session_mismatch", "The table session does not match this request.");
  }
  const admin = getServiceSupabase();
  if (!admin) throw new ApiError(503, "security_unconfigured", "Security services are not configured.");
  const tokenHash = await hashTableSessionToken(credential.token);
  const result = await admin
    .from("table_sessions")
    .select("id,table_id,state,opened_at,expires_at,closed_at,table:tables(id,number,branch_id,state,branch:branches(id,name,tax_rate,parcel_charge_enabled,qr_ordering_enabled))")
    .eq("id", credential.sessionId)
    .eq("session_token_hash", tokenHash)
    .is("closed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (result.error) {
    console.error("Table session verification failed", { code: result.error.code });
    throw new ApiError(503, "session_verification_unavailable", "The table session could not be verified.");
  }
  const session = result.data as unknown as {
    id: string;
    table_id: string;
    state: string;
    opened_at: string;
    expires_at: string;
    closed_at: string | null;
    table: {
      id: string;
      number: number;
      branch_id: string;
      state: string;
      branch: {
        id: string;
        name: string;
        tax_rate: number | string;
        parcel_charge_enabled: boolean;
        qr_ordering_enabled: boolean;
      } | null;
    } | null;
  } | null;
  if (!session?.table?.branch || !session.table.branch.qr_ordering_enabled) {
    throw new ApiError(401, "table_session_expired", "The table session is invalid or expired.");
  }
  void admin
    .from("table_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", session.id);
  return { admin, session, tokenHash };
}

export async function hashTableSessionToken(token: string) {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new ApiError(503, "security_unconfigured", "Security services are not configured.");
  return hmacHex(secret, `table-session:${token}`);
}

export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64Url(bytes);
}

function csrfCookieName() {
  return isProductionRuntime() ? "__Host-athidhi_csrf" : "athidhi_csrf";
}

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) return `${forwardedProto ?? url.protocol.slice(0, -1)}://${forwardedHost}`;
  return url.origin;
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) return decodeURIComponent(rawValue.join("="));
  }
  return null;
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function getClientAddress(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

async function hmacHex(secret: string, value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !/password|secret|token|authorization|cookie/i.test(key))
      .slice(0, 30),
  );
}
