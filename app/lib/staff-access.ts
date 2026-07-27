export const STAFF_ROLES = [
  "OWNER",
  "MANAGER",
  "CHEF",
  "WAITER",
  "CASHIER",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const ADMIN_WORKSPACES = [
  "dashboard",
  "orders",
  "live-tables",
  "kitchen",
  "waiter",
  "billing",
  "settings",
] as const;

export type AdminWorkspace = (typeof ADMIN_WORKSPACES)[number];

const ROLE_ALIASES: Readonly<Record<string, StaffRole>> = {
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  KITCHEN: "CHEF",
  CHEF: "CHEF",
  WAITER: "WAITER",
  CASHIER: "CASHIER",
};

const WORKSPACE_ROLES: Readonly<
  Record<AdminWorkspace, readonly StaffRole[]>
> = {
  dashboard: ["OWNER", "MANAGER"],
  orders: ["OWNER", "MANAGER"],
  "live-tables": ["OWNER", "MANAGER"],
  kitchen: ["OWNER", "MANAGER", "CHEF"],
  waiter: ["OWNER", "MANAGER", "WAITER"],
  billing: ["OWNER", "MANAGER", "CASHIER"],
  settings: ["OWNER", "MANAGER"],
};

const DEFAULT_WORKSPACE: Readonly<Record<StaffRole, AdminWorkspace>> = {
  OWNER: "dashboard",
  MANAGER: "dashboard",
  CHEF: "kitchen",
  WAITER: "waiter",
  CASHIER: "billing",
};

export function normalizeStaffRole(value: unknown): StaffRole | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return ROLE_ALIASES[normalized] ?? null;
}

export function isAdminWorkspace(value: string): value is AdminWorkspace {
  return (ADMIN_WORKSPACES as readonly string[]).includes(value);
}

export function canAccessWorkspace(
  role: StaffRole | null,
  workspace: AdminWorkspace,
): boolean {
  return role !== null && WORKSPACE_ROLES[workspace].includes(role);
}

export function defaultWorkspaceForRole(
  role: StaffRole | null,
): AdminWorkspace | null {
  return role === null ? null : DEFAULT_WORKSPACE[role];
}
