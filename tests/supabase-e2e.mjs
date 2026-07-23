import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
}

const options = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};
const service = createClient(url, serviceRoleKey, options);
const guest = createClient(url, anonKey, options);
const staff = createClient(url, anonKey, options);

let guestUserId;
let staffUserId;
let sessionId;
let tableId;
let orderId;
let requestId;

try {
  const guestAuth = await guest.auth.signInAnonymously();
  assert.ifError(guestAuth.error);
  guestUserId = guestAuth.data.user.id;
  guest.realtime.setAuth(guestAuth.data.session.access_token);

  const tableSession = await guest.rpc("open_table_session", {
    p_qr_token: "a0000000-0000-4000-8000-000000000001",
  });
  assert.ifError(tableSession.error);
  sessionId = tableSession.data.session_id;
  tableId = tableSession.data.table_id;
  assert.equal(tableSession.data.table_number, 1);

  const menu = await guest
    .from("menu_items")
    .select("id,name,price")
    .eq("id", "60000000-0000-4000-8000-000000000001")
    .single();
  assert.ifError(menu.error);
  assert.equal(Number(menu.data.price), 289);

  const placed = await guest.rpc("place_table_order", {
    p_table_session_id: sessionId,
    p_items: [{ menu_item_id: menu.data.id, quantity: 2 }],
    p_notes: "E2E verification",
    p_spice_level: "Medium",
    p_is_parcel: true,
  });
  assert.ifError(placed.error);
  orderId = placed.data.id;
  assert.equal(Number(placed.data.subtotal), 578);
  assert.equal(Number(placed.data.parcel_charge), 20);
  assert.equal(Number(placed.data.tax), 29.9);
  assert.equal(Number(placed.data.total), 627.9);

  const serviceRequest = await guest.rpc("create_service_request", {
    p_table_session_id: sessionId,
    p_request_type: "WATER",
  });
  assert.ifError(serviceRequest.error);
  requestId = serviceRequest.data.id;

  const staffEmail = `e2e-${randomBytes(8).toString("hex")}@athidhi.local`;
  const staffPassword = `${randomBytes(16).toString("base64url")}!Aa1`;
  const createdStaff = await service.auth.admin.createUser({
    email: staffEmail,
    password: staffPassword,
    email_confirm: true,
    user_metadata: { full_name: "E2E Owner" },
  });
  assert.ifError(createdStaff.error);
  staffUserId = createdStaff.data.user.id;

  const staffProfile = await service.from("staff").insert({
    id: staffUserId,
    restaurant_id: "10000000-0000-4000-8000-000000000001",
    branch_id: "20000000-0000-4000-8000-000000000001",
    role_id: "70000000-0000-4000-8000-000000000001",
    full_name: "E2E Owner",
  });
  assert.ifError(staffProfile.error);

  const staffAuth = await staff.auth.signInWithPassword({
    email: staffEmail,
    password: staffPassword,
  });
  assert.ifError(staffAuth.error);

  const staffOrder = await staff
    .from("orders")
    .select("id,status,total")
    .eq("id", orderId)
    .single();
  assert.ifError(staffOrder.error);
  assert.equal(staffOrder.data.status, "PLACED");

  const realtimeStatus = new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(
      () => reject(new Error("Realtime order update was not received")),
      10_000,
    );
    const channel = guest
      .channel(`e2e-order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          clearTimeout(timeout);
          settled = true;
          resolve(payload.new.status);
          void guest.removeChannel(channel);
        },
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await new Promise((resolve) => setTimeout(resolve, 2_000));
          const accepted = await staff.rpc("advance_order_status", {
            p_order_id: orderId,
            p_status: "ACCEPTED",
          });
          if (accepted.error) reject(accepted.error);
        }
        if (
          !settled &&
          ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)
        ) {
          reject(new Error(`Realtime subscription failed with status ${status}`));
        }
      });
  });
  assert.equal(await realtimeStatus, "ACCEPTED");

  for (const status of ["PREPARING", "READY", "SERVED", "BILLED"]) {
    const advanced = await staff.rpc("advance_order_status", {
      p_order_id: orderId,
      p_status: status,
    });
    assert.ifError(advanced.error);
  }

  const payment = await staff.rpc("record_payment", {
    p_order_id: orderId,
    p_method: "UPI",
    p_amount: 627.9,
    p_provider_reference: "LOCAL-E2E",
  });
  assert.ifError(payment.error);
  assert.equal(payment.data.status, "SUCCESS");

  const paidOrder = await guest
    .from("orders")
    .select("status,total")
    .eq("id", orderId)
    .single();
  assert.ifError(paidOrder.error);
  assert.equal(paidOrder.data.status, "PAID");

  const finalTable = await staff
    .from("tables")
    .select("state")
    .eq("id", tableId)
    .single();
  assert.ifError(finalTable.error);
  assert.equal(finalTable.data.state, "CLEANING");

  console.log(
    JSON.stringify({
      ok: true,
      guestAuth: "anonymous",
      tableSession: "opened",
      order: "placed-and-paid",
      realtime: "received",
      serviceRequest: "created",
      staffRls: "verified",
      payment: "recorded",
    }),
  );
} finally {
  if (orderId) {
    await service.from("payments").delete().eq("order_id", orderId);
    await service.from("activity_logs").delete().eq("entity_id", orderId);
    await service.from("orders").delete().eq("id", orderId);
  }
  if (requestId) await service.from("notifications").delete().eq("id", requestId);
  if (sessionId) await service.from("table_sessions").delete().eq("id", sessionId);
  if (tableId) await service.from("tables").update({ state: "AVAILABLE" }).eq("id", tableId);
  if (staffUserId) await service.auth.admin.deleteUser(staffUserId);
  if (guestUserId) await service.auth.admin.deleteUser(guestUserId);
  await Promise.all([guest.auth.signOut(), staff.auth.signOut()]);
  guest.realtime.disconnect();
  staff.realtime.disconnect();
  service.realtime.disconnect();
}
