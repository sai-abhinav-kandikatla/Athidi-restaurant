"use client";

import {
  Activity,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChefHat,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock,
  Flame,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Table2,
  Timer,
  UserCheck,
  Utensils,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../lib/api/client";
import { formatCurrency, normalizeMenuItem } from "../lib/menu";
import type {
  DiningTable,
  MenuCategory,
  MenuItem,
  OrderStatus,
  Payment,
  RestaurantOrder,
  ServiceRequest,
  StaffIdentity,
} from "../lib/restaurant-types";
import { Brand } from "./brand";

/* ─────────── Types ─────────── */

export type AdminSection =
  | "Dashboard"
  | "Live Tables"
  | "Orders"
  | "Kitchen"
  | "Waiter"
  | "Menu"
  | "Settings";

type Section = AdminSection;

type ConnectionStatus = "connected" | "reconnecting" | "offline";

type ActivityLogItem = {
  id: string;
  time: string;
  type: "order" | "request" | "kitchen" | "waiter" | "session" | "system";
  icon: string;
  message: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  data: Record<string, unknown>;
};

type AuditRecord = {
  id: number;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  data: Record<string, unknown>;
  created_at: string;
};

type OrderLifecycle = RestaurantOrder & {
  accepted_at?: string | null;
  preparing_at?: string | null;
  ready_at?: string | null;
  billed_at?: string | null;
};

type WaiterMetrics = {
  asOf: string;
  todayDeliveries: number;
  averageFoodDeliverySeconds: number;
  averageWaterResponseSeconds: number;
  averageBillResponseSeconds: number;
  averageWaiterResponseSeconds: number;
  pendingReadyOrders: number;
  pendingServiceRequests: number;
  activeWaiterTasks: number;
  pendingTasks: number;
  completedTasks: number;
};

type WaiterAssignment = {
  entityType: "order" | "service_request";
  entityId: string;
  assignedStaffId: string;
  assignedStaffName: string;
  assignedAt: string;
};

type RestaurantProfile = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
};

type BranchProfile = {
  id: string;
  name: string;
  address: string | null;
  opens_at: string | null;
  closes_at: string | null;
  gstin: string | null;
  tax_rate: number;
  qr_ordering_enabled: boolean;
  parcel_charge_enabled: boolean;
  realtime_alerts_enabled: boolean;
};

type OperationalData = {
  orders: RestaurantOrder[];
  requests: ServiceRequest[];
  tables: DiningTable[];
  categories: MenuCategory[];
  menu: MenuItem[];
  payments: Payment[];
  restaurant: RestaurantProfile | null;
  branch: BranchProfile | null;
  health: SystemHealth;
  waiterMetrics: WaiterMetrics;
};

type SystemHealth = {
  authentication: "healthy" | "disabled";
  database: "healthy" | "disabled";
  realtime: "healthy" | "disabled";
  notifications: "healthy" | "disabled";
  connection: "healthy" | "disabled";
};

type OperationsResponse = Omit<OperationalData, "health" | "waiterMetrics"> & {
  health: SystemHealth;
  audit: AuditRecord[];
  serverTime: string;
  waiterMetrics: WaiterMetrics;
  assignments: WaiterAssignment[];
};

const emptyWaiterMetrics: WaiterMetrics = {
  asOf: "",
  todayDeliveries: 0,
  averageFoodDeliverySeconds: 0,
  averageWaterResponseSeconds: 0,
  averageBillResponseSeconds: 0,
  averageWaiterResponseSeconds: 0,
  pendingReadyOrders: 0,
  pendingServiceRequests: 0,
  activeWaiterTasks: 0,
  pendingTasks: 0,
  completedTasks: 0,
};

const emptyData: OperationalData = {
  orders: [],
  requests: [],
  tables: [],
  categories: [],
  menu: [],
  payments: [],
  restaurant: null,
  branch: null,
  waiterMetrics: emptyWaiterMetrics,
  health: {
    authentication: "disabled",
    database: "disabled",
    realtime: "disabled",
    notifications: "disabled",
    connection: "disabled",
  },
};

const navItems: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Live Tables", icon: Table2 },
  { label: "Orders", icon: ShoppingBag },
  { label: "Kitchen", icon: ChefHat },
  { label: "Waiter", icon: UserCheck },
  { label: "Menu", icon: Utensils },
  { label: "Settings", icon: Settings },
];

/* ─────────── Main AdminOS Component ─────────── */

export function AdminOS({ staff, initialSection = "Dashboard" }: { staff: StaffIdentity; initialSection?: AdminSection }) {
  const router = useRouter();
  const [section, setSection] = useState<Section>(initialSection);
  const [data, setData] = useState<OperationalData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [connection, setConnection] = useState<ConnectionStatus>("connected");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [nowTime, setNowTime] = useState(() => Date.now());
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<string>("all");
  const [serveConfirmOrder, setServeConfirmOrder] = useState<RestaurantOrder | null>(null);
  const [assignments, setAssignments] = useState<Record<string, WaiterAssignment>>({});
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const tickerTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverClockOffset = useRef(0);
  const previousOrderStatuses = useRef<Map<string, OrderStatus>>(new Map());
  const previousRequestStatuses = useRef<Map<string, ServiceRequest["status"]>>(new Map());
  const operationalSnapshotReady = useRef(false);
  const visibleNavItems = useMemo(() => {
    if (staff.roleName === "CHEF") return navItems.filter((item) => item.label === "Kitchen");
    if (staff.roleName === "WAITER") return navItems.filter((item) => item.label === "Waiter");
    if (staff.roleName === "CASHIER") return [];
    return navItems;
  }, [staff.roleName]);

  function navigateSection(next: Section) {
    setSection(next);
    const slug = next.toLowerCase().replaceAll(" ", "-");
    router.push(`/admin/${slug}`);
  }

  const appendActivities = useCallback((items: ActivityLogItem[]) => {
    if (!items.length) return;
    setActivityLogs((current) => mergeActivityLogs(items, current));
  }, []);

  /* ─── Web Audio Chime Helper ─── */
  const playChime = useCallback(
    (freq = 880, duration = 0.25) => {
      if (!soundEnabled || typeof window === "undefined") return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch { /* ignore audio restrictions */ }
    },
    [soundEnabled],
  );

  /* ─── 1-Second Ticker for Timers & Clock ─── */
  useEffect(() => {
    tickerTimer.current = setInterval(() => {
      setNowTime(Date.now() + serverClockOffset.current);
    }, 1000);
    return () => {
      if (tickerTimer.current) clearInterval(tickerTimer.current);
    };
  }, []);

  /* ─── Data Loader ─── */
  const loadData = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const payload = await apiRequest<OperationsResponse>("/api/v1/operations");
        const serverTimestamp = new Date(payload.serverTime).getTime();
        if (Number.isFinite(serverTimestamp)) {
          serverClockOffset.current = serverTimestamp - Date.now();
          setNowTime(serverTimestamp);
        }
        const orders = (payload.orders ?? []).map((order) => ({
          ...order,
          subtotal: Number(order.subtotal),
          parcel_charge: Number(order.parcel_charge),
          tax: Number(order.tax),
          total: Number(order.total),
          order_items: order.order_items?.map((item) => ({
            ...item,
            unit_price: Number(item.unit_price),
            parcel_charge: Number(item.parcel_charge),
            line_total: Number(item.line_total),
          })),
        }));
        const requests = payload.requests ?? [];
        const transitionActivities: ActivityLogItem[] = [];

        if (operationalSnapshotReady.current) {
          for (const order of orders) {
            const previousStatus = previousOrderStatuses.current.get(order.id);
            if (order.status === "READY" && previousStatus !== "READY") {
              transitionActivities.push(
                makeActivityLog({
                  id: `live-order-ready-${order.id}`,
                  action: "ORDER_READY",
                  entityType: "order",
                  entityId: order.id,
                  createdAt: orderTimestamp(order, "ready_at") ?? new Date().toISOString(),
                  message: `Food ready · Table ${tableNumber(order)} · Order #AT-${order.order_number}`,
                }),
              );
            }
            if (order.status === "SERVED" && previousStatus && previousStatus !== "SERVED") {
              transitionActivities.push(
                makeActivityLog({
                  id: `live-food-served-${order.id}`,
                  action: "FOOD_SERVED",
                  entityType: "order",
                  entityId: order.id,
                  createdAt: order.served_at ?? new Date().toISOString(),
                  message: `Serve completed · Table ${tableNumber(order)} · Order #AT-${order.order_number}`,
                }),
              );
            }
          }

          for (const request of requests) {
            const previousStatus = previousRequestStatuses.current.get(request.id);
            if (request.status !== "RESOLVED" && previousStatus === undefined) {
              transitionActivities.push(
                makeActivityLog({
                  id: `live-request-created-${request.id}`,
                  action: "REQUEST_CREATED",
                  entityType: "service_request",
                  entityId: request.id,
                  createdAt: request.created_at,
                  message: `${requestTypeLabel(request.request_type)} · Table ${request.table_session?.table?.number ?? "—"}`,
                }),
              );
            }
            if (request.status === "RESOLVED" && previousStatus && previousStatus !== "RESOLVED") {
              transitionActivities.push(
                makeActivityLog({
                  id: `live-request-resolved-${request.id}`,
                  action: "REQUEST_RESOLVED",
                  entityType: "service_request",
                  entityId: request.id,
                  createdAt: request.resolved_at ?? new Date().toISOString(),
                  message: `Resolve completed · ${requestTypeLabel(request.request_type)} · Table ${request.table_session?.table?.number ?? "—"}`,
                }),
              );
            }
          }
        }

        previousOrderStatuses.current = new Map(orders.map((order) => [order.id, order.status]));
        previousRequestStatuses.current = new Map(requests.map((request) => [request.id, request.status]));
        operationalSnapshotReady.current = true;

        if (transitionActivities.length) {
          const hasFoodReady = transitionActivities.some((entry) => entry.action === "ORDER_READY");
          const hasGuestRequest = transitionActivities.some((entry) => entry.action === "REQUEST_CREATED");
          if (hasFoodReady) playChime(880, 0.32);
          else if (hasGuestRequest) playChime(660, 0.3);
          setToast(transitionActivities[0].message);
        }

        const categories = payload.categories ?? [];
        const categoryMap = new Map(categories.map((category) => [category.id, category]));
        const menu = (payload.menu ?? []).map((item) =>
          normalizeMenuItem({ ...item, category: item.category ?? categoryMap.get(item.category_id) ?? null }),
        );
        const branch = payload.branch
          ? { ...payload.branch, tax_rate: Number(payload.branch.tax_rate) }
          : null;
        const payments = (payload.payments ?? []).map((payment) => ({
          ...payment,
          amount: Number(payment.amount),
        }));
        setData({
          orders,
          requests,
          tables: payload.tables ?? [],
          categories,
          menu,
          payments,
          restaurant: payload.restaurant,
          branch,
          health: payload.health,
          waiterMetrics: payload.waiterMetrics ?? emptyWaiterMetrics,
        });
        setServeConfirmOrder((current) => {
          if (!current) return null;
          return orders.find((order) => order.id === current.id && order.status === "READY") ?? null;
        });
        setAssignments(
          Object.fromEntries(
            (payload.assignments ?? []).map((assignment) => [assignment.entityId, assignment]),
          ),
        );

        const auditActivities = (payload.audit ?? []).map((entry) =>
          makeActivityLog({
            id: `audit-${entry.id}`,
            action: entry.action,
            entityType: entry.entity_type,
            entityId: entry.entity_id,
            createdAt: entry.created_at,
            data: entry.data,
          }),
        );
        setActivityLogs((current) => mergeActivityLogs(transitionActivities, current, auditActivities));
        setError(null);
        setConnection(payload.health.connection === "healthy" ? "connected" : "reconnecting");
      } catch (problem) {
        setError(problem instanceof Error ? problem.message : "The operations workspace could not be loaded.");
        setConnection("offline");
      } finally {
        setLoading(false);
      }
    },
    [playChime],
  );

  useEffect(() => {
    queueMicrotask(() => void loadData());
  }, [loadData]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.EventSource === "undefined") return;
    const stream = new EventSource("/api/v1/operations/stream");

    const markConnected = () => setConnection("connected");
    const refreshFromRealtime = () => {
      setConnection("connected");
      if (realtimeRefreshTimer.current) clearTimeout(realtimeRefreshTimer.current);
      realtimeRefreshTimer.current = setTimeout(() => void loadData(true), 120);
    };

    stream.addEventListener("connected", markConnected);
    stream.addEventListener("keepalive", markConnected);
    stream.addEventListener("invalidation", refreshFromRealtime);
    stream.onerror = () => setConnection("reconnecting");

    return () => {
      stream.removeEventListener("connected", markConnected);
      stream.removeEventListener("keepalive", markConnected);
      stream.removeEventListener("invalidation", refreshFromRealtime);
      stream.close();
      if (realtimeRefreshTimer.current) clearTimeout(realtimeRefreshTimer.current);
    };
  }, [loadData]);

  useEffect(() => {
    pollTimer.current = setInterval(() => void loadData(true), 5_000);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [loadData]);

  /* ─── Toast Dismiss ─── */
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ─── Metrics Calculations ─── */
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayOrders = useMemo(() => data.orders.filter((o) => new Date(o.placed_at) >= today), [data.orders, today]);
  const activeOrders = useMemo(() => data.orders.filter((o) => ["PLACED", "ACCEPTED", "PREPARING", "READY"].includes(o.status)), [data.orders]);
  const completedOrders = useMemo(() => data.orders.filter((o) => ["SERVED", "BILLED", "PAID"].includes(o.status)), [data.orders]);
  const openRequests = useMemo(() => data.requests.filter((r) => r.status !== "RESOLVED"), [data.requests]);
  const paidToday = useMemo(() => data.payments.filter((p) => p.status === "SUCCESS" && new Date(p.created_at) >= today), [data.payments, today]);
  const revenueToday = useMemo(() => paidToday.reduce((sum, p) => sum + p.amount, 0), [paidToday]);
  const occupiedTables = useMemo(() => data.tables.filter((t) => t.state !== "AVAILABLE"), [data.tables]);
  const availableTables = useMemo(() => data.tables.filter((t) => t.state === "AVAILABLE"), [data.tables]);

  const mostOrderedToday = useMemo(() => {
    const map = new Map<string, number>();
    todayOrders.forEach((o) => {
      o.order_items?.forEach((item) => {
        map.set(item.item_name, (map.get(item.item_name) ?? 0) + item.quantity);
      });
    });
    let topName = "—";
    let maxCount = 0;
    map.forEach((count, name) => {
      if (count > maxCount) {
        maxCount = count;
        topName = name;
      }
    });
    return topName;
  }, [todayOrders]);

  const kitchenTimes = useMemo(() => {
    const readyOrServed = data.orders.filter((o) => o.served_at || o.status === "READY");
    const prepMins = readyOrServed
      .map((o) => (o.served_at ? new Date(o.served_at).getTime() - new Date(o.placed_at).getTime() : nowTime - new Date(o.placed_at).getTime()))
      .map((ms) => Math.floor(ms / 60000));
    const avg = prepMins.length ? Math.round(prepMins.reduce((a, b) => a + b, 0) / prepMins.length) : 0;
    const activePrepMins = activeOrders.map((o) => Math.floor((nowTime - new Date(o.placed_at).getTime()) / 60000));
    const longest = activePrepMins.length ? Math.max(...activePrepMins) : 0;
    return { avg, longest };
  }, [data.orders, activeOrders, nowTime]);

  /* ─── State Mutation Helper ─── */
  async function mutate(
    work: () => Promise<{ error: { message: string } | null }>,
    successMessage: string,
  ) {
    setError(null);
    const result = await work();
    if (result.error) {
      setError(result.error.message);
      return false;
    }
    setToast(successMessage);
    await loadData(true);
    return true;
  }

  /* ─── Advance Order Status ─── */
  async function advanceOrder(order: RestaurantOrder): Promise<boolean> {
    const sequence: OrderStatus[] = ["PLACED", "ACCEPTED", "PREPARING", "READY", "SERVED", "BILLED"];
    const currIndex = sequence.indexOf(order.status);
    const next = sequence[currIndex + 1];
    if (!next) return false;

    setPendingActionId(order.id);
    try {
      const succeeded = await mutate(async () => {
        try {
          await apiRequest(`/api/v1/orders/${order.id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: next }),
          });
          return { error: null };
        } catch (problem) {
          return { error: { message: problem instanceof Error ? problem.message : "The order could not be updated." } };
        }
      }, `Order #AT-${order.order_number} is now ${statusLabel(next).toLowerCase()}.`);

      if (succeeded && (next === "READY" || next === "SERVED")) {
        const action = next === "READY" ? "ORDER_READY" : "FOOD_SERVED";
        appendActivities([
          makeActivityLog({
            id: `local-${action.toLowerCase()}-${order.id}`,
            action,
            entityType: "order",
            entityId: order.id,
            createdAt: new Date().toISOString(),
            message: next === "READY"
              ? `Food ready · Table ${tableNumber(order)} · Order #AT-${order.order_number}`
              : `Serve completed · Table ${tableNumber(order)} · Order #AT-${order.order_number}`,
          }),
        ]);
      }
      return succeeded;
    } finally {
      setPendingActionId(null);
    }
  }

  /* ─── Resolve Service Request ─── */
  async function resolveRequest(req: ServiceRequest): Promise<boolean> {
    setPendingActionId(req.id);
    try {
      const succeeded = await mutate(async () => {
        try {
          await apiRequest(`/api/v1/service-requests/${req.id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "RESOLVED" }),
          });
          return { error: null };
        } catch (problem) {
          return { error: { message: problem instanceof Error ? problem.message : "The request could not be resolved." } };
        }
      }, `${requestTypeLabel(req.request_type)} for Table ${req.table_session?.table?.number ?? "—"} resolved.`);

      if (succeeded) {
        appendActivities([
          makeActivityLog({
            id: `local-request-resolved-${req.id}`,
            action: "REQUEST_RESOLVED",
            entityType: "service_request",
            entityId: req.id,
            createdAt: new Date().toISOString(),
            message: `Resolve completed · ${requestTypeLabel(req.request_type)} · Table ${req.table_session?.table?.number ?? "—"}`,
          }),
        ]);
      }
      return succeeded;
    } finally {
      setPendingActionId(null);
    }
  }

  /* ─── Toggle Waiter Assignment ─── */
  async function toggleAssign(id: string, entityType: "order" | "service_request"): Promise<boolean> {
    const assigned = !assignments[id];
    setPendingActionId(id);
    try {
      const succeeded = await mutate(async () => {
        try {
          await apiRequest(`/api/v1/waiter-tasks/${id}/assignment`, {
            method: "PATCH",
            body: JSON.stringify({ entityType, assigned }),
          });
          return { error: null };
        } catch (problem) {
          return { error: { message: problem instanceof Error ? problem.message : "The waiter assignment could not be updated." } };
        }
      }, assigned ? `Task assigned to ${staff.fullName}.` : "Task assignment released.");

      if (succeeded) {
        appendActivities([
          makeActivityLog({
            id: `local-waiter-${assigned ? "assigned" : "unassigned"}-${id}`,
            action: assigned ? "WAITER_ASSIGNED" : "WAITER_UNASSIGNED",
            entityType,
            entityId: id,
            createdAt: new Date().toISOString(),
            data: { assignedStaffName: assigned ? staff.fullName : null },
            message: assigned ? `Waiter assigned · ${staff.fullName}` : "Waiter assignment released",
          }),
        ]);
      }
      return succeeded;
    } finally {
      setPendingActionId(null);
    }
  }

  /* ─── Sign Out ─── */
  async function signOut() {
    try {
      await apiRequest("/api/v1/auth/session", { method: "DELETE" });
    } finally {
      window.location.assign("/admin/login");
    }
  }

  /* ─── Selected Table Context ─── */
  const selectedTable = useMemo(() => data.tables.find((t) => t.id === selectedTableId), [data.tables, selectedTableId]);
  const selectedTableOrders = useMemo(
    () => (selectedTable ? data.orders.filter((o) => o.table_session?.table?.id === selectedTable.id) : []),
    [data.orders, selectedTable],
  );
  const selectedTableRequests = useMemo(
    () => (selectedTable ? data.requests.filter((r) => r.table_session?.table?.id === selectedTable.id) : []),
    [data.requests, selectedTable],
  );
  const serveConfirmAssignment = serveConfirmOrder ? assignments[serveConfirmOrder.id] : undefined;
  const serveConfirmLocked = Boolean(
    serveConfirmAssignment &&
    serveConfirmAssignment.assignedStaffId !== staff.id &&
    staff.roleName === "WAITER",
  );

  return (
    <main className="admin-shell">
      {/* Persistent Sidebar */}
      <aside className="admin-sidebar">
        <Brand compact />
        <div className="branch-switch">
          <Store size={17} />
          <span>
            <small>ACTIVE RESTAURANT</small>
            <strong>Athidhi Restaurant</strong>
          </span>
        </div>

        <nav aria-label="ROS navigation">
          {visibleNavItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => navigateSection(label)}
              className={section === label ? "active" : ""}
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === "Kitchen" && activeOrders.length > 0 && <b>{activeOrders.length}</b>}
              {label === "Waiter" && openRequests.length + data.orders.filter((o) => o.status === "READY").length > 0 && (
                <b>{openRequests.length + data.orders.filter((o) => o.status === "READY").length}</b>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="staff-avatar">
            {staff.fullName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <strong>{staff.fullName}</strong>
            <span>{staff.roleName}</span>
          </div>
          <button aria-label="Sign out" onClick={() => void signOut()}>
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <section className="admin-main">
        {/* Topbar */}
        <header className="admin-header">
          <div>
            <span className="admin-breadcrumb">ATHIDHI ROS / {section.toUpperCase()}</span>
            <h1>{section === "Dashboard" ? `Control Center — Welcome, ${staff.fullName.split(" ")[0]}.` : section}</h1>
          </div>

          <div className="admin-header__actions">
            {/* Live Clock */}
            <div className="admin-clock">
              <Clock size={15} />
              <span>{formatLiveClock(nowTime)}</span>
            </div>

            {/* Global Search */}
            <label className="admin-search-label">
              <Search size={16} />
              <input
                placeholder="Search table, order, notes…"
                aria-label="Global Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </label>

            {/* Connection Status */}
            <div className={`admin-live admin-live--${connection}`}>
              <span />
              {connection === "connected"
                ? "🟢 Connected"
                : connection === "reconnecting"
                  ? "🟡 Reconnecting…"
                  : "🔴 Offline Mode"}
            </div>

            {/* Notification Bell */}
            <button
              className="admin-notification"
              onClick={() => setNotifOpen(!notifOpen)}
              aria-label="Open notifications"
            >
              <BellRing size={19} />
              {openRequests.length + data.orders.filter((order) => order.status === "READY").length > 0 && (
                <i>{openRequests.length + data.orders.filter((order) => order.status === "READY").length}</i>
              )}
            </button>

            {/* Sound Toggle */}
            <button
              className="admin-notification"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute alert sounds" : "Enable alert sounds"}
            >
              {soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
            </button>
          </div>
        </header>

        {/* Offline Banner */}
        {connection === "offline" && (
          <div className="admin-offline-banner">
            <AlertTriangle size={18} />
            <span>Realtime stream unavailable. Secure polling fallback remains active.</span>
            <button onClick={() => void loadData(true)}>
              <RefreshCw size={14} /> Retry Now
            </button>
          </div>
        )}

        {/* Workspace Content */}
        <div className="admin-content">
          {error && (
            <div className="admin-error" role="alert">
              <div>
                <strong>Operation error</strong>
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          )}

          {loading ? (
            section === "Waiter" ? (
              <WaiterWorkspaceSkeleton />
            ) : (
              <div className="admin-loading">
                <LoaderCircle className="spin" size={32} />
                <strong>Loading ROS Control Center…</strong>
              </div>
            )
          ) : (
            <>
              {section === "Dashboard" && (
                <DashboardWorkspace
                  data={data}
                  occupiedTables={occupiedTables.length}
                  availableTables={availableTables.length}
                  todayOrders={todayOrders.length}
                  activeOrders={activeOrders.length}
                  completedOrders={completedOrders.length}
                  openRequests={openRequests.length}
                  revenueToday={revenueToday}
                  mostOrderedToday={mostOrderedToday}
                  kitchenTimes={kitchenTimes}
                  activityLogs={activityLogs}
                  search={search}
                  onSection={navigateSection}
                  onSelectTable={(id) => setSelectedTableId(id)}
                />
              )}

              {section === "Live Tables" && (
                <LiveTablesWorkspace
                  tables={data.tables}
                  orders={data.orders}
                  search={search}
                  onSelectTable={(id) => setSelectedTableId(id)}
                />
              )}

              {section === "Orders" && (
                <OrdersWorkspace
                  orders={data.orders}
                  search={search}
                  advance={advanceOrder}
                />
              )}

              {section === "Kitchen" && (
                <KitchenWorkspace
                  orders={data.orders}
                  search={search}
                  nowTime={nowTime}
                  kitchenTimes={kitchenTimes}
                  advance={advanceOrder}
                />
              )}

              {section === "Waiter" && (
                <WaiterWorkspace
                  orders={data.orders}
                  requests={data.requests}
                  search={search}
                  nowTime={nowTime}
                  staffId={staff.id}
                  staffRole={staff.roleName}
                  connection={connection}
                  activityLogs={activityLogs}
                  metrics={data.waiterMetrics}
                  assignments={assignments}
                  toggleAssign={toggleAssign}
                  onServePrompt={(order) => setServeConfirmOrder(order)}
                  resolveRequest={resolveRequest}
                  pendingActionId={pendingActionId}
                />
              )}

              {section === "Menu" && (
                <MenuWorkspace
                  data={data}
                  search={search}
                  mutate={mutate}
                  roleName={staff.roleName}
                />
              )}

              {section === "Settings" && data.restaurant && data.branch && (
                <SettingsWorkspace
                  restaurant={data.restaurant}
                  branch={data.branch}
                  soundEnabled={soundEnabled}
                  setSoundEnabled={setSoundEnabled}
                  mutate={mutate}
                  roleName={staff.roleName}
                  health={data.health}
                />
              )}
            </>
          )}
        </div>
      </section>

      {/* Serve Food Confirmation Modal */}
      {serveConfirmOrder && (
        <div
          className="admin-modal-backdrop"
          onClick={() => {
            if (pendingActionId !== serveConfirmOrder.id) setServeConfirmOrder(null);
          }}
        >
          <div
            className="admin-modal waiter-confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="serve-food-title"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="waiter-status-badge waiter-status-badge--ready">Ready for handoff</span>
            <h3 id="serve-food-title">Serve Food?</h3>
            <p>Confirm the complete order has reached the guest before closing the kitchen handoff.</p>

            <div className="waiter-ready-meta">
              <strong>Table {tableNumber(serveConfirmOrder)}</strong>
              <span>Order #AT-{serveConfirmOrder.order_number}</span>
            </div>
            {serveConfirmAssignment && (
              <p className="waiter-status-badge waiter-status-badge--assigned">
                Assigned to {serveConfirmAssignment.assignedStaffName}
              </p>
            )}

            <div className="modal-items-list">
              {serveConfirmOrder.order_items?.map((item) => (
                <div key={item.id}>
                  <span>{item.item_name}</span>
                  <strong>×{item.quantity}</strong>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button
                className="secondary"
                disabled={pendingActionId === serveConfirmOrder.id}
                onClick={() => setServeConfirmOrder(null)}
              >
                Cancel
              </button>
              <button
                className="primary"
                disabled={pendingActionId === serveConfirmOrder.id || serveConfirmLocked}
                onClick={() => {
                  const target = serveConfirmOrder;
                  void advanceOrder(target).then((succeeded) => {
                    if (succeeded) setServeConfirmOrder(null);
                  });
                }}
              >
                {serveConfirmLocked
                  ? `Assigned to ${serveConfirmAssignment?.assignedStaffName}`
                  : pendingActionId === serveConfirmOrder.id
                    ? "Confirming…"
                    : "Confirm Served"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Center Flyout */}
      {notifOpen && (
        <div className="admin-notif-flyout">
          <header>
            <strong>Notification History</strong>
            <button onClick={() => setNotifOpen(false)}>
              <X size={16} />
            </button>
          </header>
          <div className="admin-notif-tabs">
            {[
              ["all", "All"],
              ["kitchen", "Food Ready"],
              ["request", "Requests"],
              ["waiter", "Waiter"],
              ["order", "Orders"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={notifFilter === value ? "active" : ""}
                onClick={() => setNotifFilter(value)}
              >
                {label.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="admin-notif-list">
            {activityLogs
              .filter((log) => notifFilter === "all" || log.type === notifFilter)
              .map((log) => (
                <div key={log.id} className="admin-notif-item">
                  <span>{log.icon}</span>
                  <div>
                    <p>{log.message}</p>
                    <small>{log.time}</small>
                  </div>
                </div>
              ))}
            {!activityLogs.length && <div className="admin-empty">No notifications yet</div>}
          </div>
        </div>
      )}

      {/* Table Details Side Drawer */}
      {selectedTable && (
        <TableDetailsDrawer
          table={selectedTable}
          orders={selectedTableOrders}
          requests={selectedTableRequests}
          assignments={assignments}
          activityLogs={activityLogs}
          onClose={() => setSelectedTableId(null)}
        />
      )}

      {/* Toast Feedback */}
      {toast && (
        <div className="admin-toast" role="status">
          <CheckCircle2 size={16} />
          {toast}
        </div>
      )}
    </main>
  );
}

/* ─────────── 1. Dashboard Workspace ─────────── */

function DashboardWorkspace({
  data,
  occupiedTables,
  availableTables,
  todayOrders,
  activeOrders,
  completedOrders,
  openRequests,
  revenueToday,
  mostOrderedToday,
  kitchenTimes,
  activityLogs,
  search,
  onSection,
  onSelectTable,
}: {
  data: OperationalData;
  occupiedTables: number;
  availableTables: number;
  todayOrders: number;
  activeOrders: number;
  completedOrders: number;
  openRequests: number;
  revenueToday: number;
  mostOrderedToday: string;
  kitchenTimes: { avg: number; longest: number };
  activityLogs: ActivityLogItem[];
  search: string;
  onSection: (s: Section) => void;
  onSelectTable: (id: string) => void;
}) {
  const cards = [
    { label: "Today’s Revenue", value: formatCurrency(revenueToday), sub: "Settled payments", icon: CircleDollarSign },
    { label: "Total Tables", value: String(data.tables.length), sub: `${occupiedTables} occupied · ${availableTables} available`, icon: Table2 },
    { label: "Orders Today", value: String(todayOrders), sub: `${completedOrders} completed · ${activeOrders} pending`, icon: ShoppingBag },
    { label: "Service Requests", value: String(openRequests), sub: openRequests ? "Requires staff action" : "All clear", icon: BellRing },
  ];

  const filteredLogs = activityLogs.filter((l) => l.message.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="admin-dashboard-layout">
      {/* Live Operational Stats Strip */}
      <div className="admin-stats-strip">
        <div>
          <Flame size={18} style={{ color: "var(--gold)" }} />
          <span>
            <strong>Most Ordered Today:</strong> {mostOrderedToday}
          </span>
        </div>
        <div>
          <Clock size={18} style={{ color: "var(--gold)" }} />
          <span>
            <strong>Avg Prep:</strong> {kitchenTimes.avg}m · <strong>Longest Wait:</strong> {kitchenTimes.longest}m
          </span>
        </div>
        <div>
          <Activity size={18} style={{ color: "var(--gold)" }} />
          <span>
            <strong>Active Kitchen Orders:</strong> {activeOrders}
          </span>
        </div>
      </div>

      <div className="admin-stats-strip" aria-label="System health">
        {Object.entries(data.health).map(([name, status]) => (
          <div key={name}>
            <CheckCircle2 size={17} style={{ color: status === "healthy" ? "#2f8f46" : "#c47b20" }} />
            <span><strong>{name.charAt(0).toUpperCase() + name.slice(1)}:</strong> {status}</span>
          </div>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {cards.map(({ label, value, sub, icon: Icon }) => (
          <article key={label}>
            <div>
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <strong>{value}</strong>
            <small>{sub}</small>
          </article>
        ))}
      </div>

      {/* 4 Dashboard Sections Grid */}
      <div className="dashboard-grid-4">
        {/* Section A: Live Tables Overview */}
        <section className="admin-card">
          <div className="admin-card__head">
            <div>
              <h2>Live Tables</h2>
              <span>{occupiedTables} occupied right now</span>
            </div>
            <button onClick={() => onSection("Live Tables")}>
              View floor <ChevronRight size={15} />
            </button>
          </div>
          <div className="dashboard-tables-grid">
            {data.tables.map((t) => (
              <div
                key={t.id}
                className={`dashboard-table-tile state-${t.state.toLowerCase()}`}
                onClick={() => onSelectTable(t.id)}
              >
                <strong>T{t.number}</strong>
                <small>{t.state.replaceAll("_", " ")}</small>
              </div>
            ))}
          </div>
        </section>

        {/* Section B: Recent Orders */}
        <section className="admin-card">
          <div className="admin-card__head">
            <div>
              <h2>Recent Orders</h2>
              <span>{activeOrders} in preparation</span>
            </div>
            <button onClick={() => onSection("Orders")}>
              All orders <ChevronRight size={15} />
            </button>
          </div>
          <div className="admin-card-list">
            {data.orders.slice(0, 5).map((o) => (
              <div className="live-order-row" key={o.id}>
                <span className="table-bubble">T{o.table_session?.table?.number ?? "?"}</span>
                <div>
                  <strong>#AT-{o.order_number}</strong>
                  <small>{o.order_items?.map((i) => `${i.quantity}× ${i.item_name}`).join(", ") || "Items loading"}</small>
                </div>
                <span className={`status-pill status-pill--${o.status.toLowerCase()}`}>{statusLabel(o.status)}</span>
                <strong>{formatCurrency(o.total)}</strong>
              </div>
            ))}
            {!data.orders.length && <div className="admin-empty">No orders placed today.</div>}
          </div>
        </section>

        {/* Section C: Live Activity Timeline */}
        <section className="admin-card">
          <div className="admin-card__head">
            <div>
              <h2>Live Activity Feed</h2>
              <span>Realtime event log</span>
            </div>
          </div>
          <div className="admin-timeline">
            {filteredLogs.map((log) => (
              <div key={log.id} className="admin-timeline-item">
                <span className="timeline-icon">{log.icon}</span>
                <div>
                  <p>{log.message}</p>
                  <small>{log.time}</small>
                </div>
              </div>
            ))}
            {!filteredLogs.length && <div className="admin-empty">No activity recorded.</div>}
          </div>
        </section>

        {/* Section D: Active Service Requests */}
        <section className="admin-card">
          <div className="admin-card__head">
            <div>
              <h2>Active Requests</h2>
              <span>{data.requests.filter((r) => r.status !== "RESOLVED").length} open</span>
            </div>
            <button onClick={() => onSection("Waiter")}>
              Queue <ChevronRight size={15} />
            </button>
          </div>
          <div className="admin-card-list">
            {data.requests.filter((r) => r.status !== "RESOLVED").slice(0, 5).map((req) => (
              <div className="request-row" key={req.id}>
                <span className="table-bubble">T{req.table_session?.table?.number ?? "—"}</span>
                <div>
                  <strong>{req.request_type}</strong>
                  <small>{relativeTime(req.created_at)}</small>
                </div>
              </div>
            ))}
            {!data.requests.filter((r) => r.status !== "RESOLVED").length && (
              <div className="admin-empty">All service requests resolved.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─────────── 2. Live Tables Workspace ─────────── */

function LiveTablesWorkspace({
  tables,
  orders,
  search,
  onSelectTable,
}: {
  tables: DiningTable[];
  orders: RestaurantOrder[];
  search: string;
  onSelectTable: (id: string) => void;
}) {
  const [viewMode, setViewMode] = useState<"grid" | "floor">("grid");
  const [filterState, setFilterState] = useState<string>("ALL");

  const filtered = useMemo(() => {
    return tables.filter((t) => {
      const matchSearch = `${t.number} ${t.state}`.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filterState === "ALL" || t.state === filterState;
      return matchSearch && matchFilter;
    });
  }, [tables, search, filterState]);

  return (
    <div>
      <div className="view-intro">
        <div>
          <p className="eyebrow eyebrow--maroon"><span /> Live Floor Overview</p>
          <h2>{tables.length} tables configured</h2>
        </div>
        <div className="view-toggle">
          <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}>
            Grid View
          </button>
          <button className={viewMode === "floor" ? "active" : ""} onClick={() => setViewMode("floor")}>
            Visual Floor Map
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="table-filter-bar">
        {["ALL", "AVAILABLE", "ORDERING", "PREPARING", "READY", "DINING", "BILL_REQUESTED"].map((st) => (
          <button
            key={st}
            className={filterState === st ? "active" : ""}
            onClick={() => setFilterState(st)}
          >
            {st.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      {viewMode === "grid" ? (
        <div className="tables-grid">
          {filtered.map((t) => {
            const tableOrders = orders.filter((o) => o.table_session?.table?.id === t.id && o.status !== "PAID");
            const totalSpend = tableOrders.reduce((sum, o) => sum + o.total, 0);

            return (
              <article
                key={t.id}
                className={`table-tile state-${t.state.toLowerCase().replaceAll("_", "-")}`}
                onClick={() => onSelectTable(t.id)}
              >
                <div className="table-tile__head">
                  <span>TABLE</span>
                  <strong>{String(t.number).padStart(2, "0")}</strong>
                </div>
                <span className="table-state-badge">
                  <i /> {t.state.replaceAll("_", " ")}
                </span>
                <div className="table-tile__info">
                  <span>{tableOrders.length} active orders</span>
                  <strong>{formatCurrency(totalSpend)}</strong>
                </div>
                <button>Manage Table <ChevronRight size={14} /></button>
              </article>
            );
          })}
        </div>
      ) : (
        /* Visual Floor Map */
        <div className="visual-floor-map">
          <h3>Restaurant Main Dining Map</h3>
          <div className="floor-map-grid">
            {filtered.map((t) => (
              <div
                key={t.id}
                className={`floor-node state-${t.state.toLowerCase().replaceAll("_", "-")}`}
                onClick={() => onSelectTable(t.id)}
              >
                <strong>T{t.number}</strong>
                <small>{t.capacity} seats</small>
                <span>{t.state.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── 3. Orders Workspace ─────────── */

function OrdersWorkspace({
  orders,
  search,
  advance,
}: {
  orders: RestaurantOrder[];
  search: string;
  advance: (o: RestaurantOrder) => Promise<boolean>;
}) {
  const filtered = useMemo(() => {
    if (!search) return orders;
    return orders.filter((o) =>
      `${o.order_number} ${o.table_session?.table?.number ?? ""} ${o.status} ${o.notes ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [orders, search]);

  return (
    <div>
      <div className="view-intro">
        <div>
          <p className="eyebrow eyebrow--maroon"><span /> Orders Feed</p>
          <h2>{filtered.length} total orders recorded</h2>
        </div>
      </div>

      <div className="orders-feed-list">
        {filtered.map((o) => (
          <article className="order-feed-card" key={o.id}>
            <div className="order-feed-card__head">
              <div>
                <strong>Order #AT-{o.order_number}</strong>
                <span>Table {o.table_session?.table?.number ?? "—"}</span>
              </div>
              <span className={`status-pill status-pill--${o.status.toLowerCase()}`}>
                {statusLabel(o.status)}
              </span>
            </div>
            <div className="order-feed-card__items">
              {o.order_items?.map((item) => (
                <div key={item.id}>
                  <span>
                    {item.quantity}× {item.item_name}
                  </span>
                  <span>{formatCurrency(item.line_total)}</span>
                </div>
              ))}
            </div>
            <div className="order-feed-card__footer">
              <small>{relativeTime(o.placed_at)}</small>
              <strong>{formatCurrency(o.total)}</strong>
              {["PLACED", "ACCEPTED", "PREPARING"].includes(o.status) && (
                <button onClick={() => void advance(o)}>
                  Advance Status <ChevronRight size={15} />
                </button>
              )}
            </div>
          </article>
        ))}
        {!filtered.length && <div className="admin-empty">No orders found.</div>}
      </div>
    </div>
  );
}

/* ─────────── 4. Kitchen Workspace (KDS) ─────────── */

function KitchenWorkspace({
  orders,
  search,
  nowTime,
  kitchenTimes,
  advance,
}: {
  orders: RestaurantOrder[];
  search: string;
  nowTime: number;
  kitchenTimes: { avg: number; longest: number };
  advance: (o: RestaurantOrder) => Promise<boolean>;
}) {
  const active = useMemo(
    () =>
      orders.filter(
        (o) =>
          ["PLACED", "ACCEPTED", "PREPARING", "READY"].includes(o.status) &&
          orderMatches(o, search),
      ),
    [orders, search],
  );

  const lanes: { status: string[]; title: string }[] = [
    { status: ["PLACED"], title: "New Orders" },
    { status: ["ACCEPTED", "PREPARING"], title: "Preparing" },
    { status: ["READY"], title: "Ready" },
  ];

  return (
    <div>
      {/* Kitchen Summary Header */}
      <div className="kitchen-kpi-bar">
        <div>
          <span>New Orders</span>
          <strong>{active.filter((o) => o.status === "PLACED").length}</strong>
        </div>
        <div>
          <span>Preparing</span>
          <strong>{active.filter((o) => ["ACCEPTED", "PREPARING"].includes(o.status)).length}</strong>
        </div>
        <div>
          <span>Ready</span>
          <strong>{active.filter((o) => o.status === "READY").length}</strong>
        </div>
        <div>
          <span>Avg Prep Time</span>
          <strong>{kitchenTimes.avg}m</strong>
        </div>
        <div>
          <span>Longest Waiting</span>
          <strong>{kitchenTimes.longest}m</strong>
        </div>
      </div>

      {/* KDS Kanban Board */}
      <div className="kitchen-board">
        {lanes.map((lane) => {
          const laneOrders = active
            .filter((o) => lane.status.includes(o.status))
            .sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime()); // Oldest first priority

          return (
            <section key={lane.title} className="kitchen-column">
              <header>
                <div>
                  <span />
                  <strong>{lane.title}</strong>
                </div>
                <b>{laneOrders.length}</b>
              </header>
              <div className="kitchen-column__cards">
                {laneOrders.map((o) => {
                  const elapsedMins = Math.floor((nowTime - new Date(o.placed_at).getTime()) / 60000);
                  const elapsedSecs = Math.floor(((nowTime - new Date(o.placed_at).getTime()) % 60000) / 1000);
                  const priorityClass = elapsedMins >= 20 ? "priority-red" : elapsedMins >= 10 ? "priority-orange" : "priority-green";

                  return (
                    <article key={o.id} className={`kitchen-ticket ${priorityClass}`}>
                      <div className="ticket-head">
                        <span className="table-bubble">T{tableNumber(o)}</span>
                        <div>
                          <strong>Order #AT-{o.order_number}</strong>
                          <small>Placed {formatTime(o.placed_at)}</small>
                        </div>
                        <span className="ticket-timer">
                          {elapsedMins}m {elapsedSecs}s
                        </span>
                      </div>

                      <ul>
                        {o.order_items?.map((item) => (
                          <li key={item.id}>
                            <b>{item.quantity}×</b> {item.item_name}
                            {item.is_parcel && <small className="parcel-tag">PARCEL</small>}
                          </li>
                        ))}
                      </ul>

                      {(o.spice_level || o.notes) && (
                        <div className="ticket-notes">
                          {o.spice_level && <span>🔥 {o.spice_level} spice</span>}
                          {o.notes && <p>📝 {o.notes}</p>}
                        </div>
                      )}

                      {o.status === "READY" ? (
                        <span className="waiter-status-badge waiter-status-badge--ready">Awaiting waiter</span>
                      ) : (
                        <button onClick={() => void advance(o)}>
                          {o.status === "PLACED"
                            ? "Accept Order"
                            : o.status === "ACCEPTED"
                              ? "Start Preparing"
                              : "Mark Ready"}
                          <ChevronRight size={15} />
                        </button>
                      )}
                    </article>
                  );
                })}
                {!laneOrders.length && <div className="admin-empty">No {lane.title.toLowerCase()}.</div>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── 5. Waiter Workspace (Phase 4) ─────────── */

function WaiterWorkspaceSkeleton() {
  return (
    <div className="waiter-workspace" aria-busy="true" aria-label="Loading waiter workspace">
      <div className="waiter-workspace__header">
        <div>
          <span className="waiter-skeleton waiter-skeleton--meta" />
          <span className="waiter-skeleton waiter-skeleton--title" />
        </div>
      </div>
      <div className="waiter-skeleton-grid">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="waiter-skeleton-card" key={index}>
            <span className="waiter-skeleton waiter-skeleton--meta" />
            <span className="waiter-skeleton waiter-skeleton--title" />
            <span className="waiter-skeleton waiter-skeleton--line" />
          </div>
        ))}
      </div>
      <div className="waiter-ready-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="waiter-skeleton-card" key={index}>
            <span className="waiter-skeleton waiter-skeleton--title" />
            <span className="waiter-skeleton waiter-skeleton--meta" />
            <span className="waiter-skeleton waiter-skeleton--line" />
            <span className="waiter-skeleton waiter-skeleton--line" />
          </div>
        ))}
      </div>
    </div>
  );
}

function WaiterWorkspace({
  orders,
  requests,
  search,
  nowTime,
  staffId,
  staffRole,
  connection,
  activityLogs,
  metrics,
  assignments,
  toggleAssign,
  onServePrompt,
  resolveRequest,
  pendingActionId,
}: {
  orders: RestaurantOrder[];
  requests: ServiceRequest[];
  search: string;
  nowTime: number;
  staffId: string;
  staffRole: string;
  connection: ConnectionStatus;
  activityLogs: ActivityLogItem[];
  metrics: WaiterMetrics;
  assignments: Record<string, WaiterAssignment>;
  toggleAssign: (id: string, entityType: "order" | "service_request") => Promise<boolean>;
  onServePrompt: (o: RestaurantOrder) => void;
  resolveRequest: (r: ServiceRequest) => Promise<boolean>;
  pendingActionId: string | null;
}) {
  const [tab, setTab] = useState<"ready" | "requests" | "tasks" | "performance">("ready");

  const readyActivityByOrder = useMemo(() => {
    const timestamps = new Map<string, string>();
    for (const entry of activityLogs) {
      if (
        entry.entityId &&
        (entry.action === "ORDER_READY" || entry.action === "FOOD_READY") &&
        !timestamps.has(entry.entityId)
      ) {
        timestamps.set(entry.entityId, entry.createdAt);
      }
    }
    return timestamps;
  }, [activityLogs]);

  const readyOrders = useMemo(() => {
    return orders
      .filter((order) => order.status === "READY" && orderMatches(order, search))
      .sort((left, right) => {
        const leftTime = readyTimestamp(left, readyActivityByOrder);
        const rightTime = readyTimestamp(right, readyActivityByOrder);
        return new Date(leftTime).getTime() - new Date(rightTime).getTime();
      });
  }, [orders, readyActivityByOrder, search]);

  const openRequests = useMemo(() => {
    return requests
      .filter(
        (r) =>
          r.status !== "RESOLVED" &&
          `${r.request_type} ${r.table_session?.table?.number ?? ""}`.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
  }, [requests, search]);

  const taskQueue = useMemo(() => {
    type TaskItem = {
      id: string;
      entityId: string;
      entityType: "order" | "service_request";
      priority: number;
      priorityLabel: string;
      kind: string;
      tableNumber: number | string;
      title: string;
      subtitle: string;
      createdTime: number;
      onAction: () => void;
      actionLabel: string;
    };

    const list: TaskItem[] = [];

    readyOrders.forEach((o) => {
      list.push({
        id: `ready-${o.id}`,
        entityId: o.id,
        entityType: "order",
        priority: 1,
        priorityLabel: "Food ready",
        kind: "food",
        tableNumber: tableNumber(o),
        title: `Order #AT-${o.order_number}`,
        subtitle: o.order_items?.map((i) => `${i.quantity}× ${i.item_name}`).join(", ") || "Items ready",
        createdTime: new Date(readyTimestamp(o, readyActivityByOrder)).getTime(),
        onAction: () => onServePrompt(o),
        actionLabel: "Serve Food",
      });
    });

    openRequests.forEach((r) => {
      const typePrio = requestTaskPriority(r.request_type);

      list.push({
        id: `req-${r.id}`,
        entityId: r.id,
        entityType: "service_request",
        priority: typePrio,
        priorityLabel: requestTypeLabel(r.request_type),
        kind: requestKind(r.request_type),
        tableNumber: r.table_session?.table?.number ?? "—",
        title: requestTypeLabel(r.request_type),
        subtitle: `Waiting ${formatElapsed(nowTime - new Date(r.created_at).getTime())}`,
        createdTime: new Date(r.created_at).getTime(),
        onAction: () => void resolveRequest(r),
        actionLabel: "Resolve",
      });
    });

    return list.sort((a, b) => a.priority - b.priority || a.createdTime - b.createdTime);
  }, [nowTime, onServePrompt, openRequests, readyActivityByOrder, readyOrders, resolveRequest]);

  const assignedTaskCount = Object.keys(assignments).length;
  const averageFoodDeliveryMs = metrics.averageFoodDeliverySeconds > 0
    ? metrics.averageFoodDeliverySeconds * 1000
    : null;
  const kpis = [
    {
      label: "Today's Deliveries",
      value: String(metrics.todayDeliveries),
      hint: "Orders served today",
      icon: Utensils,
      className: "waiter-kpi-card--ready",
    },
    {
      label: "Average Delivery Time",
      value: formatMetricDuration(averageFoodDeliveryMs),
      hint: "Ready to served",
      icon: Timer,
      className: "",
    },
    {
      label: "Pending Ready Orders",
      value: String(metrics.pendingReadyOrders),
      hint: metrics.pendingReadyOrders ? "Food needs collection" : "Kitchen handoff clear",
      icon: ChefHat,
      className: "waiter-kpi-card--ready",
    },
    {
      label: "Pending Service Requests",
      value: String(metrics.pendingServiceRequests),
      hint: metrics.pendingServiceRequests ? "Guest action required" : "Guest requests clear",
      icon: BellRing,
      className: metrics.pendingServiceRequests ? "waiter-kpi-card--requests" : "",
    },
    {
      label: "Active Waiter Tasks",
      value: String(metrics.activeWaiterTasks),
      hint: `${assignedTaskCount} currently assigned`,
      icon: ClipboardList,
      className: "waiter-kpi-card--active",
    },
  ];

  const tabs = [
    { id: "ready" as const, label: "Ready Orders", count: readyOrders.length },
    { id: "requests" as const, label: "Service Requests", count: openRequests.length },
    { id: "tasks" as const, label: "Live Tasks", count: taskQueue.length },
    { id: "performance" as const, label: "Performance", count: metrics.completedTasks },
  ];

  return (
    <div className="waiter-workspace">
      <div className="waiter-workspace__header">
        <div>
          <p className="eyebrow eyebrow--maroon"><span /> Waiter Workspace</p>
          <h2>Food ready queue & guest assistance</h2>
          <p>Kitchen handoffs, guest requests, and the next highest-priority action in one live workspace.</p>
        </div>
        <span className={`waiter-live-indicator waiter-live-indicator--${connection}`}>
          {connection === "connected" ? "Live · 5s sync" : connection === "reconnecting" ? "Reconnecting" : "Offline"}
        </span>
      </div>

      <section aria-label="Waiter key performance indicators" className="waiter-kpi-grid" aria-live="polite">
        {kpis.map(({ label, value, hint, icon: Icon, className }) => (
          <article key={label} className={`waiter-kpi-card ${className}`}>
            <div className="waiter-kpi-card__top">
              <span className="waiter-kpi-card__label">{label}</span>
              <span className="waiter-kpi-card__icon"><Icon size={17} /></span>
            </div>
            <strong className="waiter-kpi-card__value">{value}</strong>
            <small className={`waiter-kpi-card__hint ${(metrics.pendingReadyOrders || metrics.pendingServiceRequests) && label.includes("Pending") ? "is-warning" : ""}`}>
              {hint}
            </small>
          </article>
        ))}
      </section>

      <div className="waiter-tabs" role="tablist" aria-label="Waiter workspace modules">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      {tab === "ready" && (
        <section className="waiter-section" role="tabpanel" aria-label="Food ready queue">
          <header className="waiter-section__header">
            <div>
              <h3>Food Ready Queue</h3>
              <p>Only kitchen-complete orders appear here, oldest handoff first.</p>
            </div>
            <span className="waiter-section__count">{readyOrders.length}</span>
          </header>
          <div className="waiter-ready-grid" aria-live="polite">
          {readyOrders.map((o) => {
            const readyAt = readyTimestamp(o, readyActivityByOrder);
            const elapsed = Math.max(0, nowTime - new Date(readyAt).getTime());
            const priority = readyPriority(elapsed);
            const assignment = assignments[o.id];
            const assignedToCurrentStaff = assignment?.assignedStaffId === staffId;
            const canOverrideAssignment = staffRole === "OWNER" || staffRole === "MANAGER";
            const lockedByAnotherWaiter = Boolean(assignment && !assignedToCurrentStaff && !canOverrideAssignment);
            const actionPending = pendingActionId === o.id;

            return (
              <article
                key={o.id}
                className={`waiter-food-card ${priority === "high" ? "waiter-food-card--urgent" : ""}`}
                data-priority={priority}
              >
                <div className="waiter-food-card__head">
                  <div>
                    <strong className="waiter-food-card__table">Table {tableNumber(o)}</strong>
                    <small>Order #AT-{o.order_number}</small>
                  </div>
                  <span className="waiter-ready-time">{formatElapsed(elapsed)}</span>
                </div>

                <div className="waiter-ready-meta">
                  <span><Clock size={13} /> Ready since {formatTime(readyAt)}</span>
                  <span className={`waiter-priority-badge waiter-priority-badge--${priority}`}>
                    {priority === "high" ? "High priority" : priority === "medium" ? "Medium priority" : "Normal priority"}
                  </span>
                </div>

                <div className="waiter-food-card__items">
                  {o.order_items?.map((item) => (
                    <div key={item.id} className="waiter-food-item">
                      <span>{item.item_name}</span>
                      <strong className="waiter-food-item__quantity">×{item.quantity}</strong>
                    </div>
                  ))}
                </div>

                <div className="waiter-food-card__actions">
                  <button
                    type="button"
                    className="waiter-action waiter-action--secondary"
                    disabled={actionPending || lockedByAnotherWaiter}
                    onClick={() => void toggleAssign(o.id, "order")}
                  >
                    {actionPending
                      ? "Updating…"
                      : assignedToCurrentStaff
                        ? "Release task"
                        : assignment
                          ? canOverrideAssignment
                            ? `Release: ${assignment.assignedStaffName}`
                            : `Assigned: ${assignment.assignedStaffName}`
                          : "Assign to me"}
                  </button>
                  <button
                    type="button"
                    className="waiter-action waiter-action--primary"
                    disabled={actionPending || lockedByAnotherWaiter}
                    onClick={() => onServePrompt(o)}
                    title={lockedByAnotherWaiter ? `Assigned to ${assignment?.assignedStaffName}` : undefined}
                  >
                    Serve Food <ChevronRight size={15} />
                  </button>
                </div>
              </article>
            );
          })}
          {!readyOrders.length && (
            <div className="waiter-empty">
              <div>
                <CheckCircle2 className="waiter-empty__icon" size={28} />
                <h3>Kitchen handoff is clear</h3>
                <p>New READY orders will appear here automatically.</p>
              </div>
            </div>
          )}
          </div>
        </section>
      )}

      {tab === "requests" && (
        <section className="waiter-section" role="tabpanel" aria-label="Guest service requests">
          <header className="waiter-section__header">
            <div>
              <h3>Guest Service Requests</h3>
              <p>Bill, waiter, water, tissue, and cutlery requests in one queue.</p>
            </div>
            <span className="waiter-section__count">{openRequests.length}</span>
          </header>
          <div className="waiter-request-grid" aria-live="polite">
          {openRequests.map((req) => {
            const assignment = assignments[req.id];
            const assignedToCurrentStaff = assignment?.assignedStaffId === staffId;
            const canOverrideAssignment = staffRole === "OWNER" || staffRole === "MANAGER";
            const lockedByAnotherWaiter = Boolean(assignment && !assignedToCurrentStaff && !canOverrideAssignment);
            const actionPending = pendingActionId === req.id;
            const requestAge = Math.max(0, nowTime - new Date(req.created_at).getTime());
            return (
              <article
                key={req.id}
                className={`waiter-request-card waiter-request-card--${requestKind(req.request_type)}`}
                data-request-type={req.request_type}
              >
                <div className="waiter-request-card__head">
                  <strong className="waiter-request-card__table">Table {req.table_session?.table?.number ?? "—"}</strong>
                  <span className={`waiter-request-type waiter-request-type--${requestKind(req.request_type)}`}>
                    {requestTypeLabel(req.request_type)}
                  </span>
                </div>

                <span className="waiter-request-card__time">
                  Requested {formatTime(req.created_at)} · waiting {formatElapsed(requestAge)}
                </span>

                <div className="waiter-ready-meta">
                  <span className={`waiter-priority-badge waiter-priority-badge--${requestPriorityLevel(req, requestAge)}`}>
                    {requestPriorityLabel(req, requestAge)}
                  </span>
                  {req.status === "ACKNOWLEDGED" && <span className="waiter-status-badge waiter-status-badge--serving">Acknowledged</span>}
                </div>

                <div className="waiter-food-card__actions">
                  <button
                    type="button"
                    className="waiter-action waiter-action--secondary"
                    disabled={actionPending || lockedByAnotherWaiter}
                    onClick={() => void toggleAssign(req.id, "service_request")}
                  >
                    {actionPending
                      ? "Updating…"
                      : assignedToCurrentStaff
                        ? "Release task"
                        : assignment
                          ? canOverrideAssignment
                            ? `Release: ${assignment.assignedStaffName}`
                            : `Assigned: ${assignment.assignedStaffName}`
                          : "Assign to me"}
                  </button>
                  <button
                    type="button"
                    className="waiter-action waiter-action--primary"
                    disabled={actionPending || lockedByAnotherWaiter}
                    onClick={() => void resolveRequest(req)}
                    title={lockedByAnotherWaiter ? `Assigned to ${assignment?.assignedStaffName}` : undefined}
                  >
                    {actionPending ? "Resolving…" : "Resolve"}
                  </button>
                </div>
              </article>
            );
          })}
          {!openRequests.length && (
            <div className="waiter-empty">
              <div>
                <CheckCircle2 className="waiter-empty__icon" size={28} />
                <h3>All guests assisted</h3>
                <p>New guest requests will enter this queue automatically.</p>
              </div>
            </div>
          )}
          </div>
        </section>
      )}

      {tab === "tasks" && (
        <section className="waiter-section" role="tabpanel" aria-label="Prioritized waiter tasks">
          <header className="waiter-section__header">
            <div>
              <h3>Live Task Queue</h3>
              <p>Food ready, bill, waiter, water, then tissue; oldest first within each priority.</p>
            </div>
            <span className="waiter-section__count">{taskQueue.length}</span>
          </header>
          <div className="waiter-task-queue" aria-live="polite">
          {taskQueue.map((task) => {
            const assignment = assignments[task.entityId];
            const assignedToCurrentStaff = assignment?.assignedStaffId === staffId;
            const canOverrideAssignment = staffRole === "OWNER" || staffRole === "MANAGER";
            const lockedByAnotherWaiter = Boolean(assignment && !assignedToCurrentStaff && !canOverrideAssignment);
            return (
              <article
                key={task.id}
                className={`waiter-task-card waiter-task-card--${task.kind}`}
                data-priority={task.priority}
              >
                <span className="waiter-priority-badge">{task.priority}. {task.priorityLabel}</span>
                <div>
                  <strong className="waiter-task-card__title">Table {task.tableNumber} · {task.title}</strong>
                  <p className="waiter-task-card__detail">
                    {task.subtitle}
                    {assignment ? ` · Assigned to ${assignment.assignedStaffName}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="waiter-action waiter-action--primary"
                  disabled={pendingActionId === task.entityId || lockedByAnotherWaiter}
                  onClick={task.onAction}
                  title={lockedByAnotherWaiter ? `Assigned to ${assignment?.assignedStaffName}` : undefined}
                >
                  {task.actionLabel}
                </button>
              </article>
            );
          })}
          {!taskQueue.length && (
            <div className="waiter-empty">
              <div>
                <CheckCircle2 className="waiter-empty__icon" size={28} />
                <h3>Operational queue clear</h3>
                <p>No READY orders or unresolved guest requests.</p>
              </div>
            </div>
          )}
          </div>
        </section>
      )}

      {tab === "performance" && (
        <section className="waiter-section" role="tabpanel" aria-label="Waiter performance">
          <header className="waiter-section__header">
            <div>
              <h3>Waiter Performance</h3>
              <p>Today&apos;s response and completion metrics, calculated from recorded timestamps.</p>
            </div>
          </header>
          <div className="waiter-performance-grid">
            {[
              ["Deliveries Today", String(metrics.todayDeliveries), "Orders served"],
              ["Avg Food Delivery", formatMetricDuration(averageFoodDeliveryMs), "Ready to served"],
              ["Avg Water Response", formatMetricDuration(metrics.averageWaterResponseSeconds > 0 ? metrics.averageWaterResponseSeconds * 1000 : null), "Created to resolved"],
              ["Avg Bill Response", formatMetricDuration(metrics.averageBillResponseSeconds > 0 ? metrics.averageBillResponseSeconds * 1000 : null), "Created to resolved"],
              ["Avg Waiter Response", formatMetricDuration(metrics.averageWaiterResponseSeconds > 0 ? metrics.averageWaiterResponseSeconds * 1000 : null), "Created to resolved"],
              ["Pending Tasks", String(metrics.pendingTasks), "Current operational queue"],
              ["Completed Tasks", String(metrics.completedTasks), "Served and resolved today"],
            ].map(([label, value, hint]) => (
              <article className="waiter-performance-card" key={label}>
                <span className="waiter-performance-card__label">{label}</span>
                <strong className="waiter-performance-card__value">{value}</strong>
                <small className="waiter-performance-card__hint">{hint}</small>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─────────── 6. Menu Workspace (Phase 6) ─────────── */

function MenuWorkspace({
  data,
  search,
  mutate,
  roleName,
}: {
  data: OperationalData;
  search: string;
  mutate: (work: () => Promise<{ error: { message: string } | null }>, successMsg: string) => Promise<boolean>;
  roleName: string;
}) {
  const [tab, setTab] = useState<"overview" | "categories" | "items" | "editor" | "csv">("items");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedDiet, setSelectedDiet] = useState<"all" | "veg" | "nonveg">("all");
  const [selectedAvailability, setSelectedAvailability] = useState<"all" | "available" | "outofstock">("all");
  const [sortBy, setSortBy] = useState<"name" | "price" | "prep" | "sort">("sort");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isNewItem, setIsNewItem] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

  // Item Form State
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    price: 100,
    discount_price: 0,
    category_id: "",
    is_veg: true,
    available: true,
    bestseller: false,
    featured: false,
    chef_special: false,
    spice_level: "Medium",
    prep_time: 15,
    sku: "",
    image_url: "",
  });

  // Category Form State
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    sort_order: 1,
  });

  // Bulk Actions
  const canEdit = roleName === "OWNER" || roleName === "MANAGER" || roleName === "KITCHEN";

  // Menu KPI Statistics
  const totalCategories = data.categories.length;
  const totalItems = data.menu.length;
  const availableItems = data.menu.filter((i) => i.available).length;
  const outOfStockItems = data.menu.filter((i) => !i.available).length;
  const hiddenItems = data.menu.filter((i) => i.hidden).length;
  const featuredItems = data.menu.filter((i) => i.bestseller || i.featured).length;
  const avgPrice = totalItems ? Math.round(data.menu.reduce((sum, i) => sum + i.price, 0) / totalItems) : 0;

  // Filter & Sort Menu Items
  const filteredItems = useMemo(() => {
    return data.menu
      .filter((item) => {
        const matchSearch =
          !search ||
          `${item.name} ${item.description ?? ""} ${item.category?.name ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchCategory = selectedCategory === "ALL" || item.category_id === selectedCategory;
        const matchDiet =
          selectedDiet === "all" || (selectedDiet === "veg" ? item.is_veg : !item.is_veg);
        const matchAvail =
          selectedAvailability === "all" ||
          (selectedAvailability === "available" ? item.available : !item.available);

        return matchSearch && matchCategory && matchDiet && matchAvail;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "price") return b.price - a.price;
        if (sortBy === "prep") return (b.prep_time ?? 15) - (a.prep_time ?? 15);
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });
  }, [data.menu, search, selectedCategory, selectedDiet, selectedAvailability, sortBy]);

  // Open Item Editor Drawer
  function openEditor(item?: MenuItem) {
    if (item) {
      setEditingItem(item);
      setIsNewItem(false);
      setItemForm({
        name: item.name,
        description: item.description ?? "",
        price: item.price,
        discount_price: item.discount_price ?? 0,
        category_id: item.category_id,
        is_veg: item.is_veg,
        available: item.available,
        bestseller: Boolean(item.bestseller),
        featured: Boolean(item.featured),
        chef_special: Boolean(item.chef_special),
        spice_level: item.spice_level ?? "Medium",
        prep_time: item.prep_time ?? 15,
        sku: item.sku ?? "",
        image_url: item.image_url ?? "",
      });
    } else {
      setEditingItem(null);
      setIsNewItem(true);
      setItemForm({
        name: "",
        description: "",
        price: 250,
        discount_price: 0,
        category_id: data.categories[0]?.id ?? "",
        is_veg: true,
        available: true,
        bestseller: false,
        featured: false,
        chef_special: false,
        spice_level: "Medium",
        prep_time: 15,
        sku: `SKU-${Date.now().toString().slice(-4)}`,
        image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800",
      });
    }
    setTab("editor");
  }

  // Toggle Item Availability Quickly
  async function toggleAvailability(item: MenuItem) {
    await mutate(async () => {
      try {
        await apiRequest(`/api/v1/menu/items/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ available: !item.available }),
        });
        return { error: null };
      } catch (err) {
        return { error: { message: err instanceof Error ? err.message : "Failed to update status." } };
      }
    }, `${item.name} is now ${!item.available ? "Available" : "Out of Stock"}`);
  }

  // Save Item (Create / Update)
  async function saveItem() {
    if (!itemForm.name || !itemForm.category_id) {
      alert("Please provide an Item Name and select a Category.");
      return;
    }

    await mutate(async () => {
      try {
        if (isNewItem) {
          await apiRequest("/api/v1/menu/items", {
            method: "POST",
            body: JSON.stringify(itemForm),
          });
        } else if (editingItem) {
          await apiRequest(`/api/v1/menu/items/${editingItem.id}`, {
            method: "PATCH",
            body: JSON.stringify(itemForm),
          });
        }
        return { error: null };
      } catch (err) {
        return { error: { message: err instanceof Error ? err.message : "Failed to save item." } };
      }
    }, `Item ${itemForm.name} ${isNewItem ? "created" : "updated"} successfully.`);

    setTab("items");
  }

  // Delete Item
  async function deleteItem(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    await mutate(async () => {
      try {
        await apiRequest(`/api/v1/menu/items/${id}`, { method: "DELETE" });
        return { error: null };
      } catch (err) {
        return { error: { message: err instanceof Error ? err.message : "Failed to delete item." } };
      }
    }, `${name} deleted.`);
  }

  // Save Category (Create / Update)
  async function saveCategory() {
    if (!categoryForm.name) return;
    await mutate(async () => {
      try {
        if (editingCategory) {
          await apiRequest(`/api/v1/menu/categories/${editingCategory.id}`, {
            method: "PATCH",
            body: JSON.stringify(categoryForm),
          });
        } else {
          await apiRequest("/api/v1/menu/categories", {
            method: "POST",
            body: JSON.stringify(categoryForm),
          });
        }
        return { error: null };
      } catch (err) {
        return { error: { message: err instanceof Error ? err.message : "Failed to save category." } };
      }
    }, `Category ${categoryForm.name} saved.`);
    setCategoryModalOpen(false);
  }

  // Bulk Availability Action
  async function bulkToggleAvailability(available: boolean) {
    if (!selectedIds.length) return;
    await mutate(async () => {
      try {
        await Promise.all(
          selectedIds.map((id) =>
            apiRequest(`/api/v1/menu/items/${id}`, {
              method: "PATCH",
              body: JSON.stringify({ available }),
            }),
          ),
        );
        return { error: null };
      } catch (err) {
        return { error: { message: err instanceof Error ? err.message : "Bulk update failed." } };
      }
    }, `${selectedIds.length} items marked ${available ? "Available" : "Out of Stock"}.`);
    setSelectedIds([]);
  }

  // CSV Export
  function exportCsv() {
    const headers = ["ID", "Name", "Category", "Price", "Veg", "Available", "Bestseller", "Description"];
    const rows = data.menu.map((i) => [
      i.id,
      `"${i.name.replaceAll('"', '""')}"`,
      `"${(i.category?.name ?? "").replaceAll('"', '""')}"`,
      i.price,
      i.is_veg ? "YES" : "NO",
      i.available ? "YES" : "NO",
      i.bestseller ? "YES" : "NO",
      `"${(i.description ?? "").replaceAll('"', '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Athidhi_Menu_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="menu-workspace-layout">
      {/* Menu Sub-Tab Navigation Bar */}
      <div className="menu-subtab-bar">
        <button className={tab === "items" ? "active" : ""} onClick={() => setTab("items")}>
          🍲 Dishes ({data.menu.length})
        </button>
        <button className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}>
          📁 Categories ({data.categories.length})
        </button>
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>
          📊 Analytics & KPIs
        </button>
        <button className={tab === "editor" ? "active" : ""} onClick={() => openEditor()}>
          ➕ {isNewItem ? "New Dish" : "Edit Dish"}
        </button>
        <button className={tab === "csv" ? "active" : ""} onClick={() => setTab("csv")}>
          📥 Import / Export
        </button>
      </div>

      {/* SUB-TAB 1: Menu Items Data Table */}
      {tab === "items" && (
        <div className="menu-items-pane">
          {/* Controls Strip */}
          <div className="menu-controls-strip">
            <div className="filter-group">
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="ALL">All Categories</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select value={selectedDiet} onChange={(e) => setSelectedDiet(e.target.value as "all" | "veg" | "nonveg")}>
                <option value="all">All Diet Types</option>
                <option value="veg">🟢 Veg Only</option>
                <option value="nonveg">🔴 Non-Veg Only</option>
              </select>

              <select
                value={selectedAvailability}
                onChange={(e) => setSelectedAvailability(e.target.value as "all" | "available" | "outofstock")}
              >
                <option value="all">All Stock Status</option>
                <option value="available">Available</option>
                <option value="outofstock">Out of Stock</option>
              </select>

              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "name" | "price" | "prep" | "sort")}>
                <option value="sort">Sort by Order</option>
                <option value="name">Sort by Name</option>
                <option value="price">Sort by Price (High → Low)</option>
                <option value="prep">Sort by Prep Time</option>
              </select>
            </div>

            {canEdit && (
              <button className="primary-admin-button" onClick={() => openEditor()}>
                + Add New Dish
              </button>
            )}
          </div>

          {/* Bulk Selection Bar */}
          {selectedIds.length > 0 && (
            <div className="bulk-action-bar">
              <span>{selectedIds.length} items selected</span>
              <button onClick={() => void bulkToggleAvailability(true)}>Mark Available</button>
              <button onClick={() => void bulkToggleAvailability(false)}>Mark Out of Stock</button>
              <button onClick={() => setSelectedIds([])}>Deselect All</button>
            </div>
          )}

          {/* Data Table */}
          <div className="menu-data-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                      onChange={(e) =>
                        setSelectedIds(e.target.checked ? filteredItems.map((i) => i.id) : [])
                      }
                    />
                  </th>
                  <th>Dish</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Diet</th>
                  <th>Status</th>
                  <th>Badges</th>
                  <th>Prep Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr key={item.id} className={!item.available ? "row-out-of-stock" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds([...selectedIds, item.id]);
                            else setSelectedIds(selectedIds.filter((id) => id !== item.id));
                          }}
                        />
                      </td>
                      <td className="dish-name-cell">
                        <img
                          src={item.image_url || "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800"}
                          alt={item.name}
                          className="dish-thumb"
                        />
                        <div>
                          <strong>{item.name}</strong>
                          <small>{item.description?.slice(0, 45) || "No description"}</small>
                        </div>
                      </td>
                      <td>
                        <span className="category-pill">{item.category?.name ?? "General"}</span>
                      </td>
                      <td>
                        <strong className="dish-price">{formatCurrency(item.price)}</strong>
                        {item.discount_price ? (
                          <small className="discount-tag">{formatCurrency(item.discount_price)}</small>
                        ) : null}
                      </td>
                      <td>
                        <span className={`diet-tag ${item.is_veg ? "veg" : "non-veg"}`}>
                          {item.is_veg ? "🟢 VEG" : "🔴 NON-VEG"}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`stock-toggle-btn ${item.available ? "in-stock" : "out-stock"}`}
                          onClick={() => void toggleAvailability(item)}
                        >
                          {item.available ? "In Stock" : "Out of Stock"}
                        </button>
                      </td>
                      <td>
                        <div className="badges-cell">
                          {item.bestseller && <span className="badge-bestseller">BESTSELLER</span>}
                          {item.featured && <span className="badge-featured">FEATURED</span>}
                          {item.chef_special && <span className="badge-chef">CHEF SPECIAL</span>}
                        </div>
                      </td>
                      <td>
                        <span className="prep-time-tag">⏱ {item.prep_time ?? 15}m</span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="icon-action" title="Edit Item" onClick={() => openEditor(item)}>
                            ✏️
                          </button>
                          <button
                            className="icon-action danger"
                            title="Delete Item"
                            onClick={() => void deleteItem(item.id, item.name)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filteredItems.length && (
              <div className="admin-empty">No dishes found matching search and filters.</div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Category Management */}
      {tab === "categories" && (
        <div className="menu-categories-pane">
          <div className="pane-header">
            <div>
              <h2>Category Management</h2>
              <p>Organize customer menu categories and display order.</p>
            </div>
            <button
              className="primary-admin-button"
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: "", slug: "", description: "", sort_order: totalCategories + 1 });
                setCategoryModalOpen(true);
              }}
            >
              + Create Category
            </button>
          </div>

          <div className="categories-grid">
            {data.categories.map((cat) => {
              const count = data.menu.filter((m) => m.category_id === cat.id).length;
              return (
                <article key={cat.id} className="category-card">
                  <div className="category-card__head">
                    <div>
                      <strong>{cat.name}</strong>
                      <small>/{cat.slug}</small>
                    </div>
                    <span className="count-badge">{count} items</span>
                  </div>
                  <p>{cat.description || "No description provided."}</p>
                  <div className="category-card__footer">
                    <span>Order: #{cat.sort_order ?? 0}</span>
                    <div className="actions">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setCategoryForm({
                            name: cat.name,
                            slug: cat.slug,
                            description: cat.description ?? "",
                            sort_order: cat.sort_order ?? 1,
                          });
                          setCategoryModalOpen(true);
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Item Editor Drawer with Live Customer Card Preview */}
      {tab === "editor" && (
        <div className="menu-editor-split">
          {/* Left: Form Controls */}
          <div className="editor-form-panel admin-card">
            <h2>{isNewItem ? "Create New Dish" : `Editing: ${editingItem?.name}`}</h2>

            <div className="form-grid">
              <label>
                Dish Name *
                <input
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. Special Chicken Dum Biryani"
                />
              </label>

              <label>
                Category *
                <select
                  value={itemForm.category_id}
                  onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                >
                  {data.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Price (₹) *
                <input
                  type="number"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                />
              </label>

              <label>
                Discount Price (₹)
                <input
                  type="number"
                  value={itemForm.discount_price}
                  onChange={(e) => setItemForm({ ...itemForm, discount_price: Number(e.target.value) })}
                />
              </label>

              <label>
                Food Type
                <select
                  value={itemForm.is_veg ? "veg" : "nonveg"}
                  onChange={(e) => setItemForm({ ...itemForm, is_veg: e.target.value === "veg" })}
                >
                  <option value="veg">🟢 Vegetarian</option>
                  <option value="nonveg">🔴 Non-Vegetarian</option>
                </select>
              </label>

              <label>
                Spice Level
                <select
                  value={itemForm.spice_level}
                  onChange={(e) => setItemForm({ ...itemForm, spice_level: e.target.value })}
                >
                  <option value="Mild">Mild 🌶️</option>
                  <option value="Medium">Medium 🌶️🌶️</option>
                  <option value="Hot">Hot 🌶️🌶️🌶️</option>
                  <option value="Very Hot">Very Hot 🔥</option>
                </select>
              </label>

              <label>
                Preparation Time (minutes)
                <input
                  type="number"
                  value={itemForm.prep_time}
                  onChange={(e) => setItemForm({ ...itemForm, prep_time: Number(e.target.value) })}
                />
              </label>

              <label>
                SKU / Item Code
                <input
                  value={itemForm.sku}
                  onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                />
              </label>
            </div>

            <label className="full-width-label">
              Description
              <textarea
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                rows={3}
                placeholder="Brief aromatic description of the dish..."
              />
            </label>

            <label className="full-width-label">
              Image URL
              <input
                value={itemForm.image_url}
                onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                placeholder="https://images.unsplash.com/..."
              />
            </label>

            {/* Badges Toggles */}
            <div className="badge-toggles-strip">
              <label>
                <input
                  type="checkbox"
                  checked={itemForm.bestseller}
                  onChange={(e) => setItemForm({ ...itemForm, bestseller: e.target.checked })}
                />
                <span>⭐ Bestseller</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={itemForm.featured}
                  onChange={(e) => setItemForm({ ...itemForm, featured: e.target.checked })}
                />
                <span>🔥 Featured</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={itemForm.chef_special}
                  onChange={(e) => setItemForm({ ...itemForm, chef_special: e.target.checked })}
                />
                <span>👨‍🍳 Chef Special</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={itemForm.available}
                  onChange={(e) => setItemForm({ ...itemForm, available: e.target.checked })}
                />
                <span>✅ Available</span>
              </label>
            </div>

            <div className="editor-actions">
              <button className="secondary-button" onClick={() => setTab("items")}>
                Cancel
              </button>
              <button className="primary-admin-button" onClick={() => void saveItem()}>
                {isNewItem ? "Save New Dish" : "Update Dish"}
              </button>
            </div>
          </div>

          {/* Right: Live Customer Card Preview */}
          <div className="editor-preview-panel admin-card">
            <h3>Live Customer Card Preview</h3>
            <p>Realtime rendering of how customers will see this item on website & QR ordering.</p>

            <div className="live-card-preview">
              <div
                className="preview-img"
                style={{
                  backgroundImage: `url(${
                    itemForm.image_url ||
                    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800"
                  })`,
                }}
              >
                {itemForm.bestseller && <span className="preview-badge">BESTSELLER</span>}
              </div>
              <div className="preview-body">
                <div className="preview-head">
                  <span className={`diet-mark ${itemForm.is_veg ? "veg" : "non-veg"}`}>
                    {itemForm.is_veg ? "🟢" : "🔴"}
                  </span>
                  <strong>{itemForm.name || "Dish Name"}</strong>
                </div>
                <p>{itemForm.description || "Dish description will appear here..."}</p>
                <div className="preview-footer">
                  <strong className="preview-price">{formatCurrency(itemForm.price)}</strong>
                  <button className="preview-add-btn">ADD +</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Menu Overview & Analytics */}
      {tab === "overview" && (
        <div className="menu-analytics-pane">
          <div className="kpi-grid">
            <article>
              <div>
                <span>Total Categories</span>
              </div>
              <strong>{totalCategories}</strong>
              <small>Configured categories</small>
            </article>
            <article>
              <div>
                <span>Total Menu Dishes</span>
              </div>
              <strong>{totalItems}</strong>
              <small>Dishes in catalog</small>
            </article>
            <article>
              <div>
                <span>Available Dishes</span>
              </div>
              <strong>{availableItems}</strong>
              <small>Active for ordering</small>
            </article>
            <article>
              <div>
                <span>Out of Stock</span>
              </div>
              <strong>{outOfStockItems}</strong>
              <small>Needs kitchen restock</small>
            </article>
            <article>
              <div>
                <span>Avg Dish Price</span>
              </div>
              <strong>{formatCurrency(avgPrice)}</strong>
              <small>Catalog average</small>
            </article>
            <article>
              <div>
                <span>Hidden Dishes</span>
              </div>
              <strong>{hiddenItems}</strong>
              <small>Hidden from customer menu</small>
            </article>
            <article>
              <div>
                <span>Featured Dishes</span>
              </div>
              <strong>{featuredItems}</strong>
              <small>Bestsellers & Specials</small>
            </article>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: CSV Import / Export */}
      {tab === "csv" && (
        <div className="menu-csv-pane admin-card">
          <h2>Menu Data Import & Export</h2>
          <p>Export your full menu catalog as a CSV spreadsheet or import bulk updates.</p>

          <div className="csv-actions-grid">
            <div className="csv-card">
              <h3>Export Menu to CSV</h3>
              <p>Download all {data.menu.length} menu items with categories, pricing, and descriptions.</p>
              <button className="primary-admin-button" onClick={exportCsv}>
                📥 Export CSV File
              </button>
            </div>

            <div className="csv-card">
              <h3>Import Menu from CSV</h3>
              <p>Upload a structured CSV file to import or update dishes automatically.</p>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    alert(`CSV File "${e.target.files[0].name}" loaded. Parsing entries...`);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Category Create/Edit Modal */}
      {categoryModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setCategoryModalOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingCategory ? "Edit Category" : "Create New Category"}</h3>
            <div className="modal-form">
              <label>
                Category Name *
                <input
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replaceAll(" ", "-"),
                    })
                  }
                />
              </label>
              <label>
                Slug
                <input
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                />
              </label>
              <label>
                Description
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  rows={2}
                />
              </label>
              <label>
                Display Order
                <input
                  type="number"
                  value={categoryForm.sort_order}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, sort_order: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setCategoryModalOpen(false)}>
                Cancel
              </button>
              <button className="primary" onClick={() => void saveCategory()}>
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── 7. Settings Workspace ─────────── */

function SettingsWorkspace({
  restaurant,
  branch,
  soundEnabled,
  setSoundEnabled,
  mutate,
  roleName,
  health,
}: {
  restaurant: RestaurantProfile;
  branch: BranchProfile;
  soundEnabled: boolean;
  setSoundEnabled: (b: boolean) => void;
  mutate: (work: () => Promise<{ error: { message: string } | null }>, successMsg: string) => Promise<boolean>;
  roleName: string;
  health: SystemHealth;
}) {
  const [tab, setTab] = useState<"restaurant" | "billing" | "kitchen" | "notifications" | "system">("restaurant");
  const [form, setForm] = useState(() => ({
    name: restaurant.name,
    phone: restaurant.phone ?? "",
    whatsapp: restaurant.whatsapp ?? "",
    address: branch.address ?? "",
    gstin: branch.gstin ?? "",
    taxRate: branch.tax_rate,
    qrEnabled: branch.qr_ordering_enabled,
    parcelEnabled: branch.parcel_charge_enabled,
  }));
  const isOwner = roleName === "OWNER";

  async function save() {
    await mutate(async () => {
      try {
        await apiRequest("/api/v1/restaurant", {
          method: "PATCH",
          body: JSON.stringify({
            address: form.address,
            qrOrderingEnabled: form.qrEnabled,
            parcelChargeEnabled: form.parcelEnabled,
            ...(isOwner
              ? {
                  name: form.name,
                  phone: form.phone,
                  whatsapp: form.whatsapp,
                  gstin: form.gstin,
                  taxRate: form.taxRate,
                }
              : {}),
          }),
        });
        return { error: null };
      } catch (problem) {
        return { error: { message: problem instanceof Error ? problem.message : "Settings could not be updated." } };
      }
    }, "Settings updated.");
  }

  return (
    <div>
      <div className="view-intro">
        <div>
          <p className="eyebrow eyebrow--maroon"><span /> Restaurant Settings</p>
          <h2>Operational parameters</h2>
        </div>
        <button className="primary-admin-button" onClick={() => void save()}>
          Save Settings
        </button>
      </div>

      <div className="settings-tab-bar">
        {(["restaurant", ...(isOwner ? ["billing" as const] : []), "kitchen", "notifications", "system"] as const).map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="settings-panel-container">
        {tab === "restaurant" && (
          <section className="admin-card settings-form">
            <h2>Restaurant Profile</h2>
            {!isOwner && <p>Managers can update branch operations. Restaurant identity and tax settings are owner-only.</p>}
            <label>
              Restaurant Name
              <input value={form.name} disabled={!isOwner} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Phone Number
              <input value={form.phone} disabled={!isOwner} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label>
              Address
              <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
            </label>
          </section>
        )}

        {tab === "billing" && (
          <section className="admin-card settings-form">
            <h2>Billing & Tax Configuration</h2>
            <label>
              GSTIN
              <input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
            </label>
            <label>
              GST Tax Rate (%)
              <input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} />
            </label>
          </section>
        )}

        {tab === "kitchen" && (
          <section className="admin-card settings-form">
            <h2>Kitchen Preferences</h2>
            <label className="setting-switch">
              <span>
                <strong>Biryani Parcel Charge (₹10)</strong>
                <small>Automatically apply parcel fee for takeaway biryani</small>
              </span>
              <input type="checkbox" checked={form.parcelEnabled} onChange={(e) => setForm({ ...form, parcelEnabled: e.target.checked })} />
              <i />
            </label>
          </section>
        )}

        {tab === "notifications" && (
          <section className="admin-card settings-form">
            <h2>Notifications & Sounds</h2>
            <label className="setting-switch">
              <span>
                <strong>Audio Alerts</strong>
                <small>Play Web Audio chime on new incoming order or request</small>
              </span>
              <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
              <i />
            </label>
          </section>
        )}

        {tab === "system" && (
          <section className="admin-card settings-form">
            <h2>System Health</h2>
            <div className="system-health-list">
              {Object.entries(health).map(([name, status]) => (
                <div key={name}>
                  <span>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                  <strong>{status === "healthy" ? "🟢 Healthy" : "🟠 Disabled"}</strong>
                </div>
              ))}
              <div><span>Timezone</span><strong>Asia/Kolkata</strong></div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ─────────── Table Details Drawer ─────────── */

function TableDetailsDrawer({
  table,
  orders,
  requests,
  assignments,
  activityLogs,
  onClose,
}: {
  table: DiningTable;
  orders: RestaurantOrder[];
  requests: ServiceRequest[];
  assignments: Record<string, WaiterAssignment>;
  activityLogs: ActivityLogItem[];
  onClose: () => void;
}) {
  const openTableRequests = requests.filter((request) => request.status !== "RESOLVED");
  const activeTableOrders = orders.filter((order) => !["PAID", "CANCELLED"].includes(order.status));
  const currentSessionId = activeTableOrders[0]?.table_session_id
    ?? openTableRequests[0]?.table_session_id
    ?? orders[0]?.table_session_id;
  const timelineOrders = currentSessionId ? orders.filter((order) => order.table_session_id === currentSessionId) : [];
  const timelineRequests = currentSessionId ? requests.filter((request) => request.table_session_id === currentSessionId) : [];
  const assignedNames = Array.from(
    new Set(
      [
        ...activeTableOrders.map((order) => assignments[order.id]?.assignedStaffName),
        ...openTableRequests.map((request) => assignments[request.id]?.assignedStaffName),
      ]
        .filter((name): name is string => Boolean(name)),
    ),
  );
  const hasReadyFood = activeTableOrders.some((order) => order.status === "READY");
  const hasServedFood = activeTableOrders.some((order) => ["SERVED", "BILLED"].includes(order.status));
  const hasKitchenWork = activeTableOrders.some((order) => ["ACCEPTED", "PREPARING"].includes(order.status));
  const hasPlacedOrder = activeTableOrders.some((order) => order.status === "PLACED");
  const waiterStatus = assignedNames.length
    ? `Serving · ${assignedNames.join(", ")}`
    : hasReadyFood
      ? "Food ready"
      : openTableRequests.length
        ? "Guest assistance"
        : hasServedFood
          ? "Served"
          : "Standby";
  const kitchenStatus = hasReadyFood
    ? "Ready"
    : hasKitchenWork
      ? "Preparing"
      : hasPlacedOrder
        ? "New order"
        : hasServedFood
          ? "Completed"
          : "No active order";
  const foodStatus = hasReadyFood ? "Food ready" : hasServedFood ? "Served · Dining" : hasKitchenWork || hasPlacedOrder ? "In kitchen" : "Not ordered";
  const timeline = buildTableTimeline(timelineOrders, timelineRequests, activityLogs);

  return (
    <div className="admin-drawer-backdrop" onClick={onClose}>
      <div className="admin-table-drawer" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <h2>Table {table.number} Details</h2>
            <span>{table.capacity} seats · State: {table.state}</span>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className="drawer-body">
          <section className="drawer-section">
            <h3>Waiter & Kitchen Status</h3>
            <div className="waiter-drawer-status">
              <div className="waiter-drawer-status__item">
                <span>Waiter Status</span>
                <strong>{waiterStatus}</strong>
              </div>
              <div className="waiter-drawer-status__item">
                <span>Kitchen Status</span>
                <strong>{kitchenStatus}</strong>
              </div>
              <div className="waiter-drawer-status__item">
                <span>Food Status</span>
                <strong>{foodStatus}</strong>
              </div>
              <div className="waiter-drawer-status__item">
                <span>Outstanding Requests</span>
                <strong>{openTableRequests.length}</strong>
              </div>
            </div>
          </section>

          <section className="drawer-section">
            <h3>Active Orders</h3>
            {activeTableOrders.map((o) => (
              <div key={o.id} className="drawer-order-item">
                <div className="drawer-order-item__head">
                  <strong>Order #AT-{o.order_number}</strong>
                  <span>{o.status}</span>
                </div>
                {o.order_items?.map((item) => (
                  <div key={item.id} className="drawer-order-line">
                    <span>{item.quantity}× {item.item_name}</span>
                    <span>{formatCurrency(item.line_total)}</span>
                  </div>
                ))}
              </div>
            ))}
            {!activeTableOrders.length && <div className="admin-empty">No active orders for this table.</div>}
          </section>

          <section className="drawer-section">
            <h3>Outstanding Requests</h3>
            {openTableRequests.map((r) => (
              <div key={r.id} className="drawer-request-item">
                <span>{requestTypeLabel(r.request_type)}</span>
                <small>{r.status} · {relativeTime(r.created_at)}</small>
              </div>
            ))}
            {!openTableRequests.length && <div className="admin-empty">No outstanding service requests.</div>}
          </section>

          <section className="drawer-section">
            <h3>Service Timeline</h3>
            <div className="waiter-timeline">
              {timeline.map((item) => (
                <div className="waiter-timeline__item" key={item.id}>
                  <span className="waiter-timeline__time">{formatTime(item.at)}</span>
                  <span className="waiter-timeline__marker" />
                  <div className="waiter-timeline__content">
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </div>
                </div>
              ))}
              {!timeline.length && <div className="admin-empty">Service activity will appear after the first order or request.</div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Utility Helpers ─────────── */

function tableNumber(order: RestaurantOrder) {
  return order.table_session?.table?.number ?? "—";
}

function statusLabel(status: OrderStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase().replaceAll("_", " ");
}

function orderMatches(order: RestaurantOrder, search: string) {
  if (!search) return true;
  return `${order.order_number} ${tableNumber(order)} ${order.status} ${order.order_items?.map((i) => i.item_name).join(" ")}`
    .toLowerCase()
    .includes(search.toLowerCase());
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function orderTimestamp(order: RestaurantOrder, field: keyof Pick<OrderLifecycle, "accepted_at" | "preparing_at" | "ready_at" | "billed_at">) {
  const value = (order as OrderLifecycle)[field];
  return typeof value === "string" && value ? value : null;
}

function readyTimestamp(order: RestaurantOrder, activityByOrder: Map<string, string> = new Map()) {
  return orderTimestamp(order, "ready_at") ?? activityByOrder.get(order.id) ?? order.placed_at;
}

function formatMetricDuration(milliseconds: number | null) {
  if (milliseconds === null || !Number.isFinite(milliseconds)) return "—";
  return formatElapsed(milliseconds);
}

function formatElapsed(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function readyPriority(milliseconds: number): "high" | "medium" | "normal" {
  if (milliseconds >= 10 * 60_000) return "high";
  if (milliseconds >= 4 * 60_000) return "medium";
  return "normal";
}

function requestTaskPriority(type: ServiceRequest["request_type"]) {
  if (type === "BILL") return 2;
  if (type === "WAITER") return 3;
  if (type === "WATER") return 4;
  return 5;
}

function requestKind(type: ServiceRequest["request_type"]) {
  if (type === "BILL") return "bill";
  if (type === "WATER") return "water";
  if (type === "TISSUE" || type === "SPOON") return "tissue";
  return "waiter";
}

function requestTypeLabel(type: ServiceRequest["request_type"]) {
  if (type === "BILL") return "Bill request";
  if (type === "WAITER") return "Waiter call";
  if (type === "WATER") return "Water requested";
  if (type === "TISSUE") return "Tissue requested";
  return "Cutlery requested";
}

function requestPriorityLevel(request: ServiceRequest, age: number): "high" | "medium" | "normal" {
  if (request.priority >= 10 || age >= 8 * 60_000) return "high";
  if (request.priority >= 5 || age >= 3 * 60_000) return "medium";
  return "normal";
}

function requestPriorityLabel(request: ServiceRequest, age: number) {
  const level = requestPriorityLevel(request, age);
  return level === "high" ? "High priority" : level === "medium" ? "Medium priority" : "Normal priority";
}

function makeActivityLog({
  id,
  action,
  entityType = null,
  entityId = null,
  createdAt,
  data = {},
  message,
}: {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
  data?: Record<string, unknown>;
  message?: string;
}): ActivityLogItem {
  return {
    id,
    time: formatTime(createdAt),
    type: auditType(action),
    icon: auditIcon(action),
    message: message ?? auditMessage(action, data),
    action,
    entityType,
    entityId,
    createdAt,
    data,
  };
}

function mergeActivityLogs(...groups: ActivityLogItem[][]) {
  const unique = new Map<string, ActivityLogItem>();
  for (const group of groups) {
    for (const item of group) {
      const status = typeof item.data.status === "string" ? item.data.status : "";
      const key = item.entityId ? `${item.action}:${item.entityId}:${status}` : item.id;
      if (!unique.has(key)) unique.set(key, item);
    }
  }
  return [...unique.values()]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 150);
}

function auditType(action: string): ActivityLogItem["type"] {
  if (action.includes("REQUEST")) return "request";
  if (action === "ORDER_READY" || action === "FOOD_READY" || action.includes("PREPAR")) return "kitchen";
  if (action.includes("WAITER") || action === "FOOD_SERVED" || action === "DELIVERY_COMPLETED") return "waiter";
  if (action.includes("SESSION")) return "session";
  if (action.includes("ORDER") || action.includes("PAYMENT")) return "order";
  return "system";
}

function auditIcon(action: string) {
  if (action === "ORDER_READY" || action === "FOOD_READY") return "●";
  if (action === "FOOD_SERVED" || action === "DELIVERY_COMPLETED") return "✓";
  if (action.includes("REQUEST")) return "!";
  if (action.includes("WAITER")) return "W";
  if (action.includes("PAYMENT")) return "₹";
  return "•";
}

function auditMessage(action: string, data: Record<string, unknown>) {
  const messages: Record<string, string> = {
    ORDER_READY: "Food ready",
    FOOD_READY: "Food ready",
    FOOD_SERVED: "Serve completed",
    DELIVERY_COMPLETED: "Delivery completed",
    REQUEST_CREATED: "Guest request created",
    REQUEST_RESOLVED: "Resolve completed",
    REQUEST_ACKNOWLEDGED: "Guest request acknowledged",
    WAITER_ASSIGNED: "Waiter assigned",
    WAITER_UNASSIGNED: "Waiter assignment released",
    WAITER_RESPONSE: "Waiter response recorded",
  };
  const status = typeof data.status === "string" ? ` · ${data.status.toLowerCase()}` : "";
  if (messages[action]) return `${messages[action]}${status}`;
  const label = action.toLowerCase().replaceAll("_", " ");
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}${status}`;
}

function buildTableTimeline(
  orders: RestaurantOrder[],
  requests: ServiceRequest[],
  activityLogs: ActivityLogItem[],
) {
  type TimelineItem = { id: string; at: string; label: string; detail: string };
  const items: TimelineItem[] = [];

  for (const order of orders) {
    const orderLabel = `Order #AT-${order.order_number}`;
    items.push({ id: `${order.id}-placed`, at: order.placed_at, label: "Order placed", detail: orderLabel });
    const acceptedAt = orderTimestamp(order, "accepted_at");
    const preparingAt = orderTimestamp(order, "preparing_at");
    const readyAt = orderTimestamp(order, "ready_at")
      ?? activityLogs.find((entry) => entry.entityId === order.id && entry.action === "ORDER_READY")?.createdAt;
    const servedAt = order.served_at
      ?? activityLogs.find((entry) => entry.entityId === order.id && entry.action === "FOOD_SERVED")?.createdAt;
    if (acceptedAt) items.push({ id: `${order.id}-accepted`, at: acceptedAt, label: "Kitchen accepted", detail: orderLabel });
    if (preparingAt) items.push({ id: `${order.id}-preparing`, at: preparingAt, label: "Kitchen preparing", detail: orderLabel });
    if (readyAt) items.push({ id: `${order.id}-ready`, at: readyAt, label: "Food ready", detail: `${orderLabel} ready for waiter` });
    if (servedAt) items.push({ id: `${order.id}-served`, at: servedAt, label: "Served · Dining", detail: `${orderLabel} delivered to table` });
  }

  for (const request of requests) {
    items.push({
      id: `${request.id}-created`,
      at: request.created_at,
      label: requestTypeLabel(request.request_type),
      detail: "Guest request created",
    });
    if (request.acknowledged_at) {
      items.push({
        id: `${request.id}-acknowledged`,
        at: request.acknowledged_at,
        label: "Waiter responding",
        detail: requestTypeLabel(request.request_type),
      });
    }
    if (request.resolved_at) {
      items.push({
        id: `${request.id}-resolved`,
        at: request.resolved_at,
        label: "Request resolved",
        detail: requestTypeLabel(request.request_type),
      });
    }
  }

  const tableEntityIds = new Set([...orders.map((order) => order.id), ...requests.map((request) => request.id)]);
  for (const entry of activityLogs) {
    if (!entry.entityId || !tableEntityIds.has(entry.entityId)) continue;
    if (entry.action !== "WAITER_ASSIGNED" && entry.action !== "WAITER_UNASSIGNED") continue;
    const staffName = typeof entry.data.assignedStaffName === "string" ? ` · ${entry.data.assignedStaffName}` : "";
    items.push({
      id: `timeline-${entry.id}`,
      at: entry.createdAt,
      label: entry.action === "WAITER_ASSIGNED" ? "Waiter assigned" : "Waiter released",
      detail: `Operational task${staffName}`,
    });
  }

  return items
    .filter((item) => !Number.isNaN(new Date(item.at).getTime()))
    .sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime())
    .slice(-24);
}

function formatLiveClock(timestamp: number) {
  try {
    return new Date(timestamp).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

function relativeTime(date: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
}
