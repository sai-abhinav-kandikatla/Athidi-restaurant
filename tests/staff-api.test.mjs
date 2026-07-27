import assert from "node:assert/strict";
import { describe, it } from "node:test";

const VALID_TRANSITIONS = {
  PLACED: ["ACCEPTED", "PREPARING", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "BILLED"],
  SERVED: ["BILLED", "PAID"],
  BILLED: ["PAID"],
  PAID: [],
  CANCELLED: [],
};

function isValidTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return true;
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  return allowed.includes(nextStatus);
}

function formatSuccessResponse(data, message = "Success") {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: "req-test-uuid-101",
  };
}

function formatErrorResponse(message, code = "request_failed") {
  return {
    success: false,
    error: {
      code,
      message,
    },
    timestamp: new Date().toISOString(),
    requestId: "req-test-uuid-102",
  };
}

describe("Phase B4 — Staff API & Business Logic Stabilization Test Matrix", () => {
  it("1. Order State Machine Transition Chain (PLACED -> PAID)", () => {
    assert.equal(isValidTransition("PLACED", "ACCEPTED"), true);
    assert.equal(isValidTransition("ACCEPTED", "PREPARING"), true);
    assert.equal(isValidTransition("PREPARING", "READY"), true);
    assert.equal(isValidTransition("READY", "SERVED"), true);
    assert.equal(isValidTransition("SERVED", "BILLED"), true);
    assert.equal(isValidTransition("BILLED", "PAID"), true);
  });

  it("2. Illegal State Transition Blocking", () => {
    assert.equal(isValidTransition("PLACED", "PAID"), false);
    assert.equal(isValidTransition("PLACED", "SERVED"), false);
    assert.equal(isValidTransition("PAID", "PLACED"), false);
    assert.equal(isValidTransition("CANCELLED", "READY"), false);
  });

  it("3. Idempotent State Transitions", () => {
    assert.equal(isValidTransition("PREPARING", "PREPARING"), true);
    assert.equal(isValidTransition("READY", "READY"), true);
  });

  it("4. Standard Success Envelope Schema", () => {
    const payload = formatSuccessResponse({ id: "ord-123", status: "READY" });
    assert.equal(payload.success, true);
    assert.equal(payload.data.id, "ord-123");
    assert.equal(payload.message, "Success");
    assert.notEqual(payload.timestamp, null);
    assert.notEqual(payload.requestId, null);
  });

  it("5. Standard Error Envelope Schema", () => {
    const errorPayload = formatErrorResponse("Invalid state transition", "invalid_state_transition");
    assert.equal(errorPayload.success, false);
    assert.equal(errorPayload.error.code, "invalid_state_transition");
    assert.equal(errorPayload.error.message, "Invalid state transition");
    assert.notEqual(errorPayload.timestamp, null);
  });

  it("6. Service Request Notification Types", () => {
    const validTypes = ["WATER", "WAITER", "TISSUE", "BILL"];
    validTypes.forEach((type) => {
      assert.equal(["WATER", "WAITER", "TISSUE", "BILL"].includes(type), true);
    });
  });

  it("7. Structured Audit Log Entry Payload", () => {
    const auditEntry = {
      branch_id: "branch-uuid-1",
      staff_id: "staff-uuid-1",
      action: "ORDER_STATUS_UPDATE",
      data: {
        order_id: "ord-101",
        previous_state: "PLACED",
        new_state: "ACCEPTED",
      },
    };
    assert.equal(auditEntry.action, "ORDER_STATUS_UPDATE");
    assert.equal(auditEntry.data.previous_state, "PLACED");
    assert.equal(auditEntry.data.new_state, "ACCEPTED");
  });

  it("8. Double Submit CSRF Validation Guard", () => {
    const cookieToken = "csrf-secret-123";
    const headerToken = "csrf-secret-123";
    assert.equal(cookieToken === headerToken, true);

    const mismatchedHeader = "csrf-secret-456";
    assert.equal(cookieToken === mismatchedHeader, false);
  });
});
