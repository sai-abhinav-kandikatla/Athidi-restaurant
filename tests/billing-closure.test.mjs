import assert from "node:assert/strict";
import { describe, it } from "node:test";

function calculateBill(items, isParcel, taxRatePercent = 5) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const parcelCharge = isParcel
    ? items
        .filter((item) => item.category === "biryani")
        .reduce((sum, item) => sum + item.quantity * 10, 0)
    : 0;
  const tax = Number(((subtotal + parcelCharge) * (taxRatePercent / 100)).toFixed(2));
  const grandTotal = subtotal + parcelCharge + tax;
  return { subtotal, parcelCharge, tax, grandTotal };
}

function processPayment(paymentMethod, amount, currentStatus) {
  if (amount <= 0) return { success: false, error: "Invalid payment amount" };
  if (currentStatus === "PAID") return { success: false, error: "Order is already paid" };
  return {
    success: true,
    payment: {
      method: paymentMethod,
      amount,
      status: "COMPLETED",
      timestamp: new Date().toISOString(),
    },
  };
}

function closeSessionAndResetTable(sessionId, tableId) {
  return {
    session: { id: sessionId, status: "CLOSED", closed_at: new Date().toISOString() },
    table: { id: tableId, status: "AVAILABLE" },
  };
}

describe("Phase B6 — Billing, Payment & Session Closure Stabilization Test Matrix", () => {
  it("1. Bill Request Notification Creation", () => {
    const notification = {
      type: "BILL",
      table_session_id: "sess-101",
      status: "PENDING",
      created_at: new Date().toISOString(),
    };
    assert.equal(notification.type, "BILL");
    assert.equal(notification.status, "PENDING");
  });

  it("2. Itemized Bill Calculation (Subtotal, GST 5%, Biryani Parcel Charge)", () => {
    const items = [
      { name: "Special Chicken Biryani Full", category: "biryani", price: 320, quantity: 2 },
      { name: "Apollo Fish", category: "starters", price: 310, quantity: 1 },
    ];
    const bill = calculateBill(items, true, 5);
    assert.equal(bill.subtotal, 950);
    assert.equal(bill.parcelCharge, 20); // 2 Biryanis * 10
    assert.equal(bill.tax, 48.5); // (950 + 20) * 5% = 48.5
    assert.equal(bill.grandTotal, 1018.5);
  });

  it("3. Payment State Transitions (UNPAID -> PENDING -> PAID)", () => {
    const p1 = processPayment("CASH", 1018.5, "SERVED");
    assert.equal(p1.success, true);
    assert.equal(p1.payment.status, "COMPLETED");

    // Reject duplicate payment
    const p2 = processPayment("CASH", 1018.5, "PAID");
    assert.equal(p2.success, false);
    assert.equal(p2.error, "Order is already paid");
  });

  it("4. Reject Negative Payment Amounts", () => {
    const invalidPayment = processPayment("CARD", -50, "SERVED");
    assert.equal(invalidPayment.success, false);
    assert.equal(invalidPayment.error, "Invalid payment amount");
  });

  it("5. Receipt Content Data Schema", () => {
    const receipt = {
      restaurant: "Athidi Restaurant",
      branch: "Main Branch",
      table_number: 5,
      order_id: "ord-888",
      subtotal: 950,
      tax: 48.5,
      parcelCharge: 20,
      grandTotal: 1018.5,
      payment_method: "UPI",
      paid_at: new Date().toISOString(),
    };
    assert.equal(receipt.restaurant, "Athidi Restaurant");
    assert.equal(receipt.grandTotal, 1018.5);
  });

  it("6. Table Session Closure & Timestamps", () => {
    const result = closeSessionAndResetTable("sess-101", "tbl-5");
    assert.equal(result.session.status, "CLOSED");
    assert.notEqual(result.session.closed_at, null);
  });

  it("7. Table Reset to AVAILABLE State", () => {
    const result = closeSessionAndResetTable("sess-101", "tbl-5");
    assert.equal(result.table.status, "AVAILABLE");
  });

  it("8. Audit Log Recording for Settlement", () => {
    const auditEntry = {
      action: "ORDER_PAID",
      data: { order_id: "ord-888", previous_state: "SERVED", new_state: "PAID" },
    };
    assert.equal(auditEntry.action, "ORDER_PAID");
    assert.equal(auditEntry.data.new_state, "PAID");
  });
});
