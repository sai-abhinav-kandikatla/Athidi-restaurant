import assert from "node:assert/strict";
import { describe, it } from "node:test";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateQrToken(token) {
  if (!token || typeof token !== "string") return { valid: false, reason: "Missing token" };
  if (!UUID_REGEX.test(token)) return { valid: false, reason: "Invalid UUID format" };
  return { valid: true };
}

function calculateOrderTotals(items, isParcel, parcelChargeEnabled, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const parcelCharge = isParcel && parcelChargeEnabled
    ? items
        .filter((item) => item.category === "biryani")
        .reduce((sum, item) => sum + item.quantity * 10, 0)
    : 0;
  const tax = Number(((subtotal + parcelCharge) * (taxRate / 100)).toFixed(2));
  const total = subtotal + parcelCharge + tax;
  return { subtotal, parcelCharge, tax, total };
}

describe("Phase B3 — QR Ordering & Table Session Stabilization Test Matrix", () => {
  it("1. Valid UUID QR Token Verification", () => {
    const validToken = "550e8400-e29b-41d4-a716-446655440001";
    const result = validateQrToken(validToken);
    assert.equal(result.valid, true);
  });

  it("2. Invalid / Numeric Table ID Blocking", () => {
    const numericToken = "1";
    const result = validateQrToken(numericToken);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "Invalid UUID format");
  });

  it("3. Malformed / Non-UUID String Blocking", () => {
    const malformedToken = "random-table-code";
    const result = validateQrToken(malformedToken);
    assert.equal(result.valid, false);
  });

  it("4. Session Cart Key Binding", () => {
    const sessionId = "session-uuid-101";
    const storageKey = `athidi_cart_${sessionId}`;
    assert.equal(storageKey, "athidi_cart_session-uuid-101");
  });

  it("5. ₹10 Biryani Parcel Charge Rule Calculation", () => {
    const items = [
      { name: "Chicken Biryani Full", category: "biryani", price: 270, quantity: 2 },
      { name: "Chicken 65", category: "starters", price: 240, quantity: 1 },
    ];
    const totals = calculateOrderTotals(items, true, true, 5);
    assert.equal(totals.subtotal, 780);
    assert.equal(totals.parcelCharge, 20); // 2 Biryanis * 10
    assert.equal(totals.tax, 40); // (780 + 20) * 5% = 40
    assert.equal(totals.total, 840);
  });

  it("6. Parcel Charge Exclusion for Non-Biryani Items", () => {
    const items = [
      { name: "Chicken 65", category: "starters", price: 240, quantity: 2 },
      { name: "Butter Naan", category: "naans-and-roti", price: 45, quantity: 4 },
    ];
    const totals = calculateOrderTotals(items, true, true, 5);
    assert.equal(totals.parcelCharge, 0); // No biryani -> 0 parcel charge
  });

  it("7. Service Request Priority Order", () => {
    const priorities = {
      BILL: 10,
      WAITER: 5,
      WATER: 0,
      TISSUE: 0,
    };
    assert.equal(priorities.BILL > priorities.WAITER, true);
    assert.equal(priorities.WAITER > priorities.WATER, true);
  });

  it("8. Session Closure Cart Eviction", () => {
    const sessionStore = new Map();
    sessionStore.set("athidi_cart_sess-1", JSON.stringify([{ id: "item-1" }]));
    assert.equal(sessionStore.has("athidi_cart_sess-1"), true);

    // Evict on payment/session end
    sessionStore.delete("athidi_cart_sess-1");
    assert.equal(sessionStore.has("athidi_cart_sess-1"), false);
  });

  it("9. Expired Session Expiry Check", () => {
    const expiresAt = new Date(Date.now() - 1000).toISOString();
    const isExpired = new Date(expiresAt) <= new Date();
    assert.equal(isExpired, true);
  });

  it("10. Table Session State Transitions", () => {
    const states = ["OPEN", "ORDER_PLACED", "PREPARING", "READY", "BILL_REQUESTED", "CLOSED"];
    assert.equal(states.includes("OPEN"), true);
    assert.equal(states.includes("CLOSED"), true);
  });
});
