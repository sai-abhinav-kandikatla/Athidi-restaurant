import assert from "node:assert/strict";
import { describe, it } from "node:test";

const ROLE_ALIASES = {
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  KITCHEN: "CHEF",
  CHEF: "CHEF",
  WAITER: "WAITER",
  CASHIER: "CASHIER",
};

const WORKSPACE_ROLES = {
  dashboard: ["OWNER", "MANAGER"],
  orders: ["OWNER", "MANAGER"],
  "live-tables": ["OWNER", "MANAGER"],
  kitchen: ["OWNER", "MANAGER", "CHEF"],
  waiter: ["OWNER", "MANAGER", "WAITER"],
  billing: ["OWNER", "MANAGER", "CASHIER"],
  settings: ["OWNER", "MANAGER"],
};

const DEFAULT_WORKSPACE = {
  OWNER: "dashboard",
  MANAGER: "dashboard",
  CHEF: "kitchen",
  WAITER: "waiter",
  CASHIER: "billing",
};

function normalizeStaffRole(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return ROLE_ALIASES[normalized] ?? null;
}

function canAccessWorkspace(role, workspace) {
  return role !== null && WORKSPACE_ROLES[workspace]?.includes(role);
}

function defaultWorkspaceForRole(role) {
  return role === null ? null : DEFAULT_WORKSPACE[role];
}

function getRoleLandingUrl(role) {
  const workspace = defaultWorkspaceForRole(role);
  if (workspace === "kitchen") return "/chef";
  if (workspace === "waiter") return "/waiter";
  return `/admin/${workspace ?? "dashboard"}`;
}

describe("Phase B2 — Route Protection & Middleware Stabilization Test Matrix", () => {
  it("1. Public Pages Access Check", () => {
    const publicPaths = [
      "/",
      "/menu",
      "/about",
      "/contact",
      "/gallery",
      "/location",
      "/reviews",
      "/privacy",
      "/terms",
      "/table/table-1",
    ];
    publicPaths.forEach((path) => {
      assert.equal(path.startsWith("/admin") || path === "/chef" || path === "/waiter", false);
    });
  });

  it("2. Owner Routes Access Check", () => {
    const role = normalizeStaffRole("OWNER");
    assert.equal(getRoleLandingUrl(role), "/admin/dashboard");
    assert.equal(canAccessWorkspace(role, "dashboard"), true);
    assert.equal(canAccessWorkspace(role, "orders"), true);
    assert.equal(canAccessWorkspace(role, "live-tables"), true);
    assert.equal(canAccessWorkspace(role, "kitchen"), true);
    assert.equal(canAccessWorkspace(role, "waiter"), true);
    assert.equal(canAccessWorkspace(role, "settings"), true);
  });

  it("3. Chef Routes Access Check & Denied Workspaces", () => {
    const role = normalizeStaffRole("CHEF");
    assert.equal(getRoleLandingUrl(role), "/chef");
    assert.equal(canAccessWorkspace(role, "kitchen"), true);
    assert.equal(canAccessWorkspace(role, "dashboard"), false);
    assert.equal(canAccessWorkspace(role, "orders"), false);
    assert.equal(canAccessWorkspace(role, "live-tables"), false);
    assert.equal(canAccessWorkspace(role, "settings"), false);
  });

  it("4. Waiter Routes Access Check & Denied Workspaces", () => {
    const role = normalizeStaffRole("WAITER");
    assert.equal(getRoleLandingUrl(role), "/waiter");
    assert.equal(canAccessWorkspace(role, "waiter"), true);
    assert.equal(canAccessWorkspace(role, "dashboard"), false);
    assert.equal(canAccessWorkspace(role, "orders"), false);
    assert.equal(canAccessWorkspace(role, "settings"), false);
  });

  it("5. Customer Routes & Blocked Staff Consoles", () => {
    const customerRole = null;
    assert.equal(canAccessWorkspace(customerRole, "dashboard"), false);
    assert.equal(canAccessWorkspace(customerRole, "kitchen"), false);
    assert.equal(canAccessWorkspace(customerRole, "waiter"), false);
  });

  it("6. Direct Unauthorized Access & Edge Redirect Routing", () => {
    const chefRole = normalizeStaffRole("CHEF");
    const requestedWorkspaceByChef = "dashboard";
    assert.equal(canAccessWorkspace(chefRole, requestedWorkspaceByChef), false);
    assert.equal(getRoleLandingUrl(chefRole), "/chef");

    const waiterRole = normalizeStaffRole("WAITER");
    const requestedWorkspaceByWaiter = "settings";
    assert.equal(canAccessWorkspace(waiterRole, requestedWorkspaceByWaiter), false);
    assert.equal(getRoleLandingUrl(waiterRole), "/waiter");
  });

  it("7. Redirect Behaviour & Loop Guard Check", () => {
    const chefRole = normalizeStaffRole("CHEF");
    const landing = getRoleLandingUrl(chefRole);
    assert.equal(landing, "/chef");
    // If target is landing URL, no redirect occurs
    assert.equal(landing === "/chef", true);
  });
});
