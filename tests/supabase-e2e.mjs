import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey || !process.env.JWT_SECRET) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and JWT_SECRET are required.",
  );
}

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("e2e", `${process.pid}-${Date.now()}`);
const application = (await import(workerUrl.href)).default;
const environment = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};
const context = { waitUntil() {}, passThroughOnException() {} };

const guest = createBrowserSession();
const otherTable = createBrowserSession();
const staff = createBrowserSession();
let staffUserId;
let sessionId;
let otherSessionId;
let tableId;
let otherTableId;
let orderId;
let requestId;

try {
  await guest.initializeCsrf();
  const menu = await guest.request("GET", "/api/v1/menu");
  const menuItem = menu.items.find((item) => item.available);
  assert.ok(menuItem, "A seeded available menu item is required.");

  const tableSession = await guest.request("POST", "/api/v1/table-sessions", {
    tableNumber: 1,
  }, 201);
  sessionId = tableSession.session_id;
  tableId = tableSession.table_id;
  assert.equal(tableSession.table_number, 1);

  await otherTable.initializeCsrf();
  const secondSession = await otherTable.request("POST", "/api/v1/table-sessions", {
    tableNumber: 2,
  }, 201);
  otherSessionId = secondSession.session_id;
  otherTableId = secondSession.table_id;

  const mismatch = await otherTable.raw(
    "GET",
    `/api/v1/orders?tableSessionId=${encodeURIComponent(sessionId)}`,
  );
  assert.equal(mismatch.status, 403);
  assert.equal((await mismatch.json()).error.code, "table_session_mismatch");

  const placed = await guest.request("POST", "/api/v1/orders", {
    tableSessionId: sessionId,
    items: [{ menuItemId: menuItem.id, quantity: 2 }],
    notes: "Secure API E2E verification",
    spiceLevel: "Medium",
    isParcel: true,
  }, 201);
  orderId = placed.id;
  assert.equal(placed.table_session_id, sessionId);
  assert.ok(Number(placed.total) > 0);

  const serviceRequest = await guest.request("POST", "/api/v1/service-requests", {
    tableSessionId: sessionId,
    requestType: "WATER",
  }, 201);
  requestId = serviceRequest.id;

  const staffEmail = `e2e-${randomBytes(8).toString("hex")}@athidhi.local`;
  const staffPassword = `${randomBytes(18).toString("base64url")}!Aa1`;
  const createdStaff = await service.auth.admin.createUser({
    email: staffEmail,
    password: staffPassword,
    email_confirm: true,
    user_metadata: { full_name: "Secure API E2E Owner" },
  });
  assert.ifError(createdStaff.error);
  staffUserId = createdStaff.data.user.id;

  const staffProfile = await service.from("staff").insert({
    id: staffUserId,
    restaurant_id: "10000000-0000-4000-8000-000000000001",
    branch_id: "20000000-0000-4000-8000-000000000001",
    role_id: "70000000-0000-4000-8000-000000000001",
    full_name: "Secure API E2E Owner",
  });
  assert.ifError(staffProfile.error);

  await staff.initializeCsrf();
  const login = await staff.request("POST", "/api/v1/auth/session", {
    email: staffEmail,
    password: staffPassword,
  });
  assert.equal(login.staff.roleName, "Owner");

  const operations = await staff.request("GET", "/api/v1/operations");
  assert.ok(operations.orders.some((order) => order.id === orderId));
  assert.equal(operations.health.authentication, "healthy");
  assert.equal(operations.health.database, "healthy");

  for (const status of ["ACCEPTED", "PREPARING", "READY", "SERVED", "BILLED"]) {
    const advanced = await staff.request(
      "PATCH",
      `/api/v1/orders/${orderId}/status`,
      { status },
    );
    assert.equal(advanced.status, status);
  }

  const resolved = await staff.request(
    "PATCH",
    `/api/v1/service-requests/${requestId}`,
    { status: "RESOLVED" },
  );
  assert.equal(resolved.status, "RESOLVED");

  const guestOrdersBeforePayment = await guest.request(
    "GET",
    `/api/v1/orders?tableSessionId=${encodeURIComponent(sessionId)}`,
  );
  assert.equal(
    guestOrdersBeforePayment.find((order) => order.id === orderId)?.status,
    "BILLED",
  );

  const payment = await staff.request(
    "POST",
    `/api/v1/orders/${orderId}/payments`,
    {
      method: "UPI",
      amount: Number(placed.total),
      providerReference: "SECURE-API-E2E",
    },
    201,
  );
  assert.equal(payment.status, "SUCCESS");

  const closedGuestSession = await guest.raw(
    "GET",
    `/api/v1/orders?tableSessionId=${encodeURIComponent(sessionId)}`,
  );
  assert.equal(closedGuestSession.status, 401);
  assert.equal(
    (await closedGuestSession.json()).error.code,
    "table_session_expired",
  );

  const paidOrder = await service
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();
  assert.ifError(paidOrder.error);
  assert.equal(paidOrder.data.status, "PAID");

  const audit = await service
    .from("activity_logs")
    .select("action")
    .in("entity_id", [orderId, sessionId]);
  assert.ifError(audit.error);
  const actions = new Set(audit.data.map((event) => event.action));
  for (const expected of ["ORDER_ACCEPTED", "ORDER_READY", "FOOD_SERVED", "SESSION_CLOSED"]) {
    assert.ok(actions.has(expected), `Missing audit action ${expected}`);
  }

  console.log(JSON.stringify({
    ok: true,
    guestAuth: "capability-cookie",
    tableIsolation: "verified",
    order: "placed-and-paid",
    staffRbac: "verified",
    serviceRequest: "created-and-resolved",
    audit: "verified",
  }));
} finally {
  if (orderId) {
    await service.from("payments").delete().eq("order_id", orderId);
    await service.from("activity_logs").delete().eq("entity_id", orderId);
    await service.from("orders").delete().eq("id", orderId);
  }
  if (requestId) await service.from("notifications").delete().eq("id", requestId);
  for (const candidate of [sessionId, otherSessionId].filter(Boolean)) {
    await service.from("table_sessions").delete().eq("id", candidate);
  }
  for (const candidate of [tableId, otherTableId].filter(Boolean)) {
    await service.from("tables").update({ state: "AVAILABLE" }).eq("id", candidate);
  }
  if (staffUserId) await service.auth.admin.deleteUser(staffUserId);
  service.realtime.disconnect();
}

function createBrowserSession() {
  const cookies = new Map();
  let csrfToken;

  return {
    async initializeCsrf() {
      const response = await this.raw("GET", "/api/v1/security/csrf");
      assert.equal(response.status, 200);
      const payload = await response.json();
      csrfToken = payload.data.token;
    },
    async raw(method, path, body) {
      const headers = new Headers({ host: "localhost" });
      if (cookies.size) {
        headers.set(
          "cookie",
          [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; "),
        );
      }
      if (!["GET", "HEAD"].includes(method)) {
        headers.set("origin", "http://localhost");
        headers.set("content-type", "application/json");
        if (csrfToken) headers.set("x-csrf-token", csrfToken);
      }
      const response = await application.fetch(
        new Request(`http://localhost${path}`, {
          method,
          headers,
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
        environment,
        context,
      );
      captureCookies(response.headers, cookies);
      return response;
    },
    async request(method, path, body, expectedStatus = 200) {
      const response = await this.raw(method, path, body);
      const payload = await response.json();
      assert.equal(
        response.status,
        expectedStatus,
        `${method} ${path}: ${JSON.stringify(payload)}`,
      );
      return payload.data;
    },
  };
}

function captureCookies(headers, jar) {
  const values = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : (headers.get("set-cookie") ?? "").split(/,(?=\s*[^;,]+=)/);
  for (const value of values) {
    if (!value) continue;
    const [pair] = value.split(";");
    const separator = pair.indexOf("=");
    if (separator < 1) continue;
    const name = pair.slice(0, separator).trim();
    const cookieValue = pair.slice(separator + 1);
    if (/max-age=0/i.test(value)) jar.delete(name);
    else jar.set(name, cookieValue);
  }
}
