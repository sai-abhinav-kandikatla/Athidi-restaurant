"use client";

import {
  Activity,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChefHat,
  ChevronRight,
  CircleDollarSign,
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
  UserCheck,
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
import { getBrowserSupabase } from "../lib/supabase/client";

/* ─────────── Types ─────────── */

export type AdminSection =
  | "Dashboard"
  | "Live Tables"
  | "Orders"
  | "Kitchen"
  | "Waiter"
  | "Settings";

type Section = AdminSection;

type ConnectionStatus = "connected" | "reconnecting" | "offline";

type ActivityLogItem = {
  id: string;
  time: string;
  type: "order" | "request" | "kitchen" | "session" | "system";
  icon: string;
  message: string;
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
};

type SystemHealth = {
  authentication: "healthy" | "disabled";
  database: "healthy" | "disabled";
  realtime: "healthy" | "disabled";
  notifications: "healthy" | "disabled";
  connection: "healthy" | "disabled";
};

type OperationsResponse = Omit<OperationalData, "health"> & {
  health: SystemHealth;
  audit: { id: number; action: string; entity_type: string | null; entity_id: string | null; data: Record<string, unknown>; created_at: string }[];
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
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const tickerTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevOrderCount = useRef(0);
  const prevRequestCount = useRef(0);
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
      setNowTime(Date.now());
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

        if (orders.length > prevOrderCount.current && prevOrderCount.current > 0) playChime(880, 0.3);
        if (requests.length > prevRequestCount.current && prevRequestCount.current > 0) playChime(660, 0.3);
        prevOrderCount.current = orders.length;
        prevRequestCount.current = requests.length;

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
        });

        setActivityLogs((payload.audit ?? []).map((entry) => ({
          id: `audit-${entry.id}`,
          time: formatTime(entry.created_at),
          type: "system",
          icon: "⚡",
          message: `${entry.action.replaceAll("_", " ")}`,
        })));
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
  async function advanceOrder(order: RestaurantOrder) {
    const sequence: OrderStatus[] = ["PLACED", "ACCEPTED", "PREPARING", "READY", "SERVED", "BILLED"];
    const currIndex = sequence.indexOf(order.status);
    const next = sequence[currIndex + 1];
    if (!next) return;

    await mutate(async () => {
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
  }

  /* ─── Resolve Service Request ─── */
  async function resolveRequest(req: ServiceRequest) {
    await mutate(async () => {
      try {
        await apiRequest(`/api/v1/service-requests/${req.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "RESOLVED" }),
        });
        return { error: null };
      } catch (problem) {
        return { error: { message: problem instanceof Error ? problem.message : "The request could not be resolved." } };
      }
    }, `${req.request_type.toLowerCase()} request for Table ${req.table_session?.table?.number ?? ""} resolved.`);
  }

  /* ─── Toggle Waiter Assignment ─── */
  function toggleAssign(id: string) {
    setAssignments((prev) => ({
      ...prev,
      [id]: prev[id] ? "" : staff.fullName,
    }));
    setToast(`Assignment updated to ${assignments[id] ? "Unassigned" : staff.fullName}`);
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
              {openRequests.length + activeOrders.length > 0 && (
                <i>{openRequests.length + activeOrders.length}</i>
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
            <span>Connection lost. Polling backend every 30 seconds…</span>
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
            <div className="admin-loading">
              <LoaderCircle className="spin" size={32} />
              <strong>Loading ROS Control Center…</strong>
            </div>
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
                  staffName={staff.fullName}
                  assignments={assignments}
                  toggleAssign={toggleAssign}
                  onServePrompt={(order) => setServeConfirmOrder(order)}
                  resolveRequest={resolveRequest}
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
        <div className="admin-modal-backdrop" onClick={() => setServeConfirmOrder(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Serve Food Confirmation</h3>
            <p>
              Are you sure you want to mark Order <strong>#AT-{serveConfirmOrder.order_number}</strong> for{" "}
              <strong>Table {tableNumber(serveConfirmOrder)}</strong> as SERVED?
            </p>

            <div className="modal-items-list">
              {serveConfirmOrder.order_items?.map((item) => (
                <div key={item.id}>
                  <span>{item.quantity}× {item.item_name}</span>
                  <strong>{formatCurrency(item.line_total)}</strong>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="secondary" onClick={() => setServeConfirmOrder(null)}>
                Cancel
              </button>
              <button
                className="primary"
                onClick={() => {
                  const target = serveConfirmOrder;
                  setServeConfirmOrder(null);
                  void advanceOrder(target);
                }}
              >
                Confirm Served ✓
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
            {["all", "orders", "kitchen", "requests"].map((t) => (
              <button
                key={t}
                className={notifFilter === t ? "active" : ""}
                onClick={() => setNotifFilter(t)}
              >
                {t.toUpperCase()}
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
  advance: (o: RestaurantOrder) => Promise<void>;
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
              {["PLACED", "ACCEPTED", "PREPARING", "READY"].includes(o.status) && (
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
  advance: (o: RestaurantOrder) => Promise<void>;
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

                      <button onClick={() => void advance(o)}>
                        {o.status === "PLACED" ? "Accept & Start Cooking" : o.status === "READY" ? "Mark Served" : "Mark Ready"}
                        <ChevronRight size={15} />
                      </button>
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

function WaiterWorkspace({
  orders,
  requests,
  search,
  nowTime,
  staffName,
  assignments,
  toggleAssign,
  onServePrompt,
  resolveRequest,
}: {
  orders: RestaurantOrder[];
  requests: ServiceRequest[];
  search: string;
  nowTime: number;
  staffName: string;
  assignments: Record<string, string>;
  toggleAssign: (id: string) => void;
  onServePrompt: (o: RestaurantOrder) => void;
  resolveRequest: (r: ServiceRequest) => Promise<void>;
}) {
  const [tab, setTab] = useState<"ready" | "requests" | "tasks" | "performance">("ready");

  const readyOrders = useMemo(
    () => orders.filter((o) => o.status === "READY" && orderMatches(o, search)),
    [orders, search],
  );

  const openRequests = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.status !== "RESOLVED" &&
          `${r.request_type} ${r.table_session?.table?.number ?? ""}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [requests, search],
  );

  /* Unified Prioritized Live Task Queue */
  const taskQueue = useMemo(() => {
    type TaskItem = {
      id: string;
      priority: number; // 1 = Food Ready, 2 = Bill, 3 = Waiter, 4 = Water, 5 = Tissue
      priorityLabel: string;
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
        priority: 1,
        priorityLabel: "1️⃣ Food Ready",
        tableNumber: tableNumber(o),
        title: `Order #AT-${o.order_number}`,
        subtitle: o.order_items?.map((i) => `${i.quantity}× ${i.item_name}`).join(", ") || "Items ready",
        createdTime: new Date(o.placed_at).getTime(),
        onAction: () => onServePrompt(o),
        actionLabel: "Serve Food",
      });
    });

    openRequests.forEach((r) => {
      const typePrio = r.request_type === "BILL" ? 2 : r.request_type === "WAITER" ? 3 : r.request_type === "WATER" ? 4 : 5;
      const typeLabel = r.request_type === "BILL" ? "2️⃣ Bill Request" : r.request_type === "WAITER" ? "3️⃣ Waiter Call" : r.request_type === "WATER" ? "4️⃣ Water" : "5️⃣ Tissue";

      list.push({
        id: `req-${r.id}`,
        priority: typePrio,
        priorityLabel: typeLabel,
        tableNumber: r.table_session?.table?.number ?? "—",
        title: `${r.request_type} Request`,
        subtitle: `Requested ${relativeTime(r.created_at)}`,
        createdTime: new Date(r.created_at).getTime(),
        onAction: () => void resolveRequest(r),
        actionLabel: "Resolve",
      });
    });

    // Sort by Priority ascending, then oldest time ascending
    return list.sort((a, b) => a.priority - b.priority || a.createdTime - b.createdTime);
  }, [readyOrders, openRequests, onServePrompt, resolveRequest]);

  /* Waiter Performance Stats */
  const servedToday = useMemo(() => orders.filter((o) => o.status === "SERVED" || o.served_at), [orders]);

  return (
    <div>
      <div className="view-intro">
        <div>
          <p className="eyebrow eyebrow--maroon"><span /> Waiter Workspace</p>
          <h2>Food ready queue & guest assistance</h2>
        </div>
      </div>

      {/* Waiter Workspace Tabs */}
      <div className="waiter-tabs">
        <button className={tab === "ready" ? "active" : ""} onClick={() => setTab("ready")}>
          🍽 Ready Orders ({readyOrders.length})
        </button>
        <button className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>
          🛎 Service Requests ({openRequests.length})
        </button>
        <button className={tab === "tasks" ? "active" : ""} onClick={() => setTab("tasks")}>
          📋 Live Tasks ({taskQueue.length})
        </button>
        <button className={tab === "performance" ? "active" : ""} onClick={() => setTab("performance")}>
          📊 Performance
        </button>
      </div>

      {/* Tab 1: Ready Orders */}
      {tab === "ready" && (
        <div className="waiter-feed">
          {readyOrders.map((o) => {
            const elapsedMins = Math.floor((nowTime - new Date(o.placed_at).getTime()) / 60000);
            const elapsedSecs = Math.floor(((nowTime - new Date(o.placed_at).getTime()) % 60000) / 1000);
            const assignedStaff = assignments[o.id];

            return (
              <article key={o.id} className="waiter-food-card">
                <div className="waiter-food-card__head">
                  <div>
                    <strong>🍽 Table {tableNumber(o)}</strong>
                    <small>Order #AT-{o.order_number}</small>
                  </div>
                  <span className="ticket-timer">Ready {elapsedMins}m {elapsedSecs}s</span>
                </div>

                <div className="waiter-food-card__items">
                  {o.order_items?.map((item) => (
                    <div key={item.id}>
                      <span>{item.quantity}× {item.item_name}</span>
                    </div>
                  ))}
                </div>

                <div className="waiter-food-card__actions">
                  <button className="assign-btn" onClick={() => toggleAssign(o.id)}>
                    {assignedStaff ? `Serving: ${assignedStaff}` : "Assign to Me"}
                  </button>
                  <button className="serve-btn" onClick={() => onServePrompt(o)}>
                    Serve Food →
                  </button>
                </div>
              </article>
            );
          })}
          {!readyOrders.length && <div className="admin-empty">No food currently ready to be served.</div>}
        </div>
      )}

      {/* Tab 2: Service Requests */}
      {tab === "requests" && (
        <div className="waiter-feed">
          {openRequests.map((req) => {
            const assignedStaff = assignments[req.id];
            return (
              <article key={req.id} className="waiter-request-card">
                <div className="waiter-request-card__head">
                  <strong>Table {req.table_session?.table?.number ?? "—"}</strong>
                  <span className="req-type-pill">{req.request_type} Request</span>
                </div>
                <small>Requested {relativeTime(req.created_at)}</small>
                <div className="waiter-food-card__actions">
                  <button className="assign-btn" onClick={() => toggleAssign(req.id)}>
                    {assignedStaff ? `Assigned: ${assignedStaff}` : "Assign"}
                  </button>
                  <button className="serve-btn" onClick={() => void resolveRequest(req)}>
                    Resolve Request
                  </button>
                </div>
              </article>
            );
          })}
          {!openRequests.length && <div className="admin-empty">All service requests resolved!</div>}
        </div>
      )}

      {/* Tab 3: Unified Prioritized Task Queue */}
      {tab === "tasks" && (
        <div className="waiter-feed">
          {taskQueue.map((task) => (
            <article key={task.id} className="waiter-task-card">
              <span className="priority-badge">{task.priorityLabel}</span>
              <div>
                <strong>Table {task.tableNumber} — {task.title}</strong>
                <p>{task.subtitle}</p>
              </div>
              <button className="serve-btn" onClick={task.onAction}>
                {task.actionLabel}
              </button>
            </article>
          ))}
          {!taskQueue.length && <div className="admin-empty">All tasks completed!</div>}
        </div>
      )}

      {/* Tab 4: Performance */}
      {tab === "performance" && (
        <div className="waiter-performance-grid">
          <article className="perf-card">
            <span>Deliveries Today</span>
            <strong>{servedToday.length}</strong>
            <small>Orders served</small>
          </article>
          <article className="perf-card">
            <span>Avg Food Delivery</span>
            <strong>1m 40s</strong>
            <small>From Ready to Served</small>
          </article>
          <article className="perf-card">
            <span>Avg Water Response</span>
            <strong>35s</strong>
            <small>Response time</small>
          </article>
          <article className="perf-card">
            <span>Avg Bill Response</span>
            <strong>52s</strong>
            <small>Response time</small>
          </article>
        </div>
      )}
    </div>
  );
}

/* ─────────── 6. Settings Workspace ─────────── */

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
  onClose,
}: {
  table: DiningTable;
  orders: RestaurantOrder[];
  requests: ServiceRequest[];
  onClose: () => void;
}) {
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
          {/* Service Timeline Progression */}
          <section className="drawer-section">
            <h3>Service Timeline</h3>
            <div className="drawer-timeline-flow">
              <div className="flow-step done">
                <span>Kitchen</span>
                <strong>✓ Ready</strong>
              </div>
              <div className="flow-step done">
                <span>Waiter</span>
                <strong>✓ Assigned</strong>
              </div>
              <div className="flow-step done">
                <span>Food</span>
                <strong>✓ Served</strong>
              </div>
              <div className="flow-step done">
                <span>Customer</span>
                <strong>Dining</strong>
              </div>
            </div>
          </section>

          {/* Active Orders */}
          <section className="drawer-section">
            <h3>Active Orders</h3>
            {orders.map((o) => (
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
            {!orders.length && <div className="admin-empty">No active orders for this table.</div>}
          </section>

          {/* Service Requests */}
          <section className="drawer-section">
            <h3>Service Requests</h3>
            {requests.map((r) => (
              <div key={r.id} className="drawer-request-item">
                <span>{r.request_type}</span>
                <small>{r.status}</small>
              </div>
            ))}
            {!requests.length && <div className="admin-empty">No service requests.</div>}
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

function auditType(action: string): ActivityLogItem["type"] {
  if (action.includes("ORDER") || action === "FOOD_SERVED" || action.includes("PAYMENT")) return "order";
  if (action.includes("REQUEST")) return "request";
  if (action.includes("SESSION")) return "session";
  if (action.includes("READY") || action.includes("PREPAR")) return "kitchen";
  return "system";
}

function auditIcon(action: string) {
  if (action === "ORDER_READY") return "🟢";
  if (action === "FOOD_SERVED") return "✓";
  if (action.includes("REQUEST")) return "🔔";
  if (action.includes("LOGIN")) return "🔐";
  if (action.includes("SETTINGS")) return "⚙️";
  if (action.includes("PAYMENT")) return "₹";
  return "•";
}

function auditMessage(action: string, metadata: Record<string, unknown>) {
  const label = action.toLowerCase().replaceAll("_", " ");
  const status = typeof metadata.status === "string" ? ` · ${metadata.status.toLowerCase()}` : "";
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}${status}`;
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
