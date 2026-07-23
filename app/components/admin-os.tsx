/* eslint-disable @next/next/no-img-element */
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
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency, normalizeMenuItem } from "../lib/menu";
import type {
  DiningTable,
  MenuCategory,
  MenuItem,
  OrderItem,
  OrderStatus,
  Payment,
  RestaurantOrder,
  ServiceRequest,
  StaffIdentity,
} from "../lib/restaurant-types";
import { getBrowserSupabase } from "../lib/supabase/client";
import { Brand } from "./brand";

/* ─────────── Types ─────────── */

type Section =
  | "Dashboard"
  | "Live Tables"
  | "Orders"
  | "Kitchen"
  | "Service Requests"
  | "Settings";

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
};

const navItems: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Live Tables", icon: Table2 },
  { label: "Orders", icon: ShoppingBag },
  { label: "Kitchen", icon: ChefHat },
  { label: "Service Requests", icon: BellRing },
  { label: "Settings", icon: Settings },
];

/* ─────────── Main AdminOS Component ─────────── */

export function AdminOS({ staff }: { staff: StaffIdentity }) {
  const [section, setSection] = useState<Section>("Dashboard");
  const [data, setData] = useState<OperationalData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevOrderCount = useRef(0);
  const prevRequestCount = useRef(0);

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
      } catch { /* ignore audio play restrictions */ }
    },
    [soundEnabled],
  );

  /* ─── 1-Second Ticker for Elapsed Timers & Clock ─── */
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
      const supabase = getBrowserSupabase();
      if (!supabase) {
        setError("Supabase connection is unconfigured.");
        setLoading(false);
        setConnection("offline");
        return;
      }

      if (quiet) setRefreshing(true);
      else setLoading(true);

      try {
        const [
          orderResult,
          itemResult,
          sessionResult,
          tableResult,
          requestResult,
          categoryResult,
          menuResult,
          paymentResult,
          restaurantResult,
          branchResult,
        ] = await Promise.all([
          supabase
            .from("orders")
            .select("id,order_number,branch_id,table_session_id,status,subtotal,parcel_charge,tax,total,notes,spice_level,placed_at,served_at,paid_at")
            .eq("branch_id", staff.branchId)
            .order("placed_at", { ascending: false })
            .limit(500),
          supabase.from("order_items").select("*"),
          supabase.from("table_sessions").select("id,table_id,opened_at,state"),
          supabase
            .from("tables")
            .select("id,branch_id,section_id,number,capacity,qr_token,state")
            .eq("branch_id", staff.branchId)
            .order("number"),
          supabase
            .from("notifications")
            .select("*")
            .eq("branch_id", staff.branchId)
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("menu_categories")
            .select("id,restaurant_id,name,slug,sort_order,active")
            .eq("restaurant_id", staff.restaurantId)
            .order("sort_order"),
          supabase
            .from("menu_items")
            .select("id,restaurant_id,category_id,name,description,price,is_veg,available,bestseller,image_url,sort_order")
            .eq("restaurant_id", staff.restaurantId)
            .order("sort_order"),
          supabase.from("payments").select("*").order("created_at", { ascending: false }),
          supabase.from("restaurants").select("id,name,phone,whatsapp").eq("id", staff.restaurantId).single(),
          supabase.from("branches").select("id,name,address,opens_at,closes_at,gstin,tax_rate,qr_ordering_enabled,parcel_charge_enabled,realtime_alerts_enabled").eq("id", staff.branchId).single(),
        ]);

        const firstError = [
          orderResult.error,
          itemResult.error,
          sessionResult.error,
          tableResult.error,
          requestResult.error,
          categoryResult.error,
          menuResult.error,
          paymentResult.error,
          restaurantResult.error,
          branchResult.error,
        ].find(Boolean);

        if (firstError) {
          setError(firstError.message);
          setConnection("reconnecting");
          setLoading(false);
          setRefreshing(false);
          return;
        }

        const tables = (tableResult.data ?? []) as DiningTable[];
        const sessions = (sessionResult.data ?? []) as { id: string; table_id: string; opened_at: string; state: string }[];
        const orderItems = (itemResult.data ?? []) as unknown as OrderItem[];
        const sessionTable = new Map(sessions.map((s) => [s.id, s.table_id]));
        const sessionMap = new Map(sessions.map((s) => [s.id, s]));
        const tablesById = new Map(tables.map((t) => [t.id, t]));

        const orders = ((orderResult.data ?? []) as unknown as RestaurantOrder[]).map((order) => {
          const tId = sessionTable.get(order.table_session_id);
          const table = tablesById.get(tId ?? "");
          return {
            ...order,
            subtotal: Number(order.subtotal),
            parcel_charge: Number(order.parcel_charge),
            tax: Number(order.tax),
            total: Number(order.total),
            order_items: orderItems
              .filter((item) => item.order_id === order.id)
              .map((item) => ({
                ...item,
                unit_price: Number(item.unit_price),
                parcel_charge: Number(item.parcel_charge),
                line_total: Number(item.line_total),
              })),
            table_session: {
              id: order.table_session_id,
              opened_at: sessionMap.get(order.table_session_id)?.opened_at,
              table: table ? { id: table.id, number: table.number } : null,
            },
          };
        });

        const requests = ((requestResult.data ?? []) as unknown as ServiceRequest[]).map((req) => {
          const table = tablesById.get(sessionTable.get(req.table_session_id) ?? "");
          return {
            ...req,
            table_session: {
              table: table ? { id: table.id, number: table.number } : null,
            },
          };
        });

        // Trigger sound chimes if new items arrived
        if (orders.length > prevOrderCount.current && prevOrderCount.current > 0) {
          playChime(880, 0.3); // New Order chime
        }
        if (requests.length > prevRequestCount.current && prevRequestCount.current > 0) {
          playChime(660, 0.3); // Service Request chime
        }
        prevOrderCount.current = orders.length;
        prevRequestCount.current = requests.length;

        // Build Activity Log
        const logs: ActivityLogItem[] = [];
        orders.slice(0, 15).forEach((o) => {
          const tNum = o.table_session?.table?.number ?? "?";
          const timeStr = formatTime(o.placed_at);
          logs.push({
            id: `ord-${o.id}`,
            time: timeStr,
            type: "order",
            icon: "🟥",
            message: `Table ${tNum} placed Order #AT-${o.order_number} (${formatCurrency(o.total)})`,
          });
          if (o.status === "ACCEPTED" || o.status === "PREPARING") {
            logs.push({
              id: `prep-${o.id}`,
              time: timeStr,
              type: "kitchen",
              icon: "👨‍🍳",
              message: `Kitchen is preparing Order #AT-${o.order_number} for Table ${tNum}`,
            });
          }
          if (o.status === "READY") {
            logs.push({
              id: `rdy-${o.id}`,
              time: timeStr,
              type: "kitchen",
              icon: "🟢",
              message: `Order #AT-${o.order_number} for Table ${tNum} is Ready to serve!`,
            });
          }
        });
        requests.slice(0, 15).forEach((r) => {
          const tNum = r.table_session?.table?.number ?? "?";
          const icon = r.request_type === "WAITER" ? "🟣" : r.request_type === "BILL" ? "🧾" : "🔵";
          logs.push({
            id: `req-${r.id}`,
            time: formatTime(r.created_at),
            type: "request",
            icon,
            message: `Table ${tNum} requested ${r.request_type.toLowerCase()}`,
          });
        });
        setActivityLogs(logs.sort((a, b) => b.id.localeCompare(a.id)).slice(0, 20));

        const categories = (categoryResult.data ?? []) as MenuCategory[];
        const categoryMap = new Map(categories.map((c) => [c.id, c]));
        const menu = ((menuResult.data ?? []) as unknown as MenuItem[]).map((item) =>
          normalizeMenuItem({
            ...item,
            category: categoryMap.get(item.category_id) ?? null,
          }),
        );
        const branchProfile = branchResult.data as BranchProfile;

        setData({
          orders,
          requests,
          tables,
          categories,
          menu,
          payments: ((paymentResult.data ?? []) as unknown as Payment[]).map((p) => ({
            ...p,
            amount: Number(p.amount),
          })),
          restaurant: restaurantResult.data as RestaurantProfile,
          branch: { ...branchProfile, tax_rate: Number(branchProfile.tax_rate) },
        });

        setError(null);
        setConnection("connected");
        setLoading(false);
        setRefreshing(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load data.");
        setConnection("offline");
        setLoading(false);
        setRefreshing(false);
      }
    },
    [staff.branchId, staff.restaurantId, playChime],
  );

  /* ─── Initial Load & Realtime Subscription ─── */
  useEffect(() => {
    queueMicrotask(() => void loadData());
  }, [loadData]);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    const scheduleReload = () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => void loadData(true), 180);
    };

    const channel = supabase
      .channel(`admin-ros-${staff.branchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `branch_id=eq.${staff.branchId}` }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `branch_id=eq.${staff.branchId}` }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "tables", filter: `branch_id=eq.${staff.branchId}` }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "table_sessions" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, scheduleReload)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnection("connected");
        else if (status === "CLOSED" || status === "CHANNEL_ERROR") setConnection("reconnecting");
      });

    // 30-Second Fallback Polling Timer
    pollTimer.current = setInterval(() => {
      void loadData(true);
    }, 30_000);

    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      if (pollTimer.current) clearInterval(pollTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [loadData, staff.branchId]);

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

  /* Most ordered item today */
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

  /* Kitchen prep times */
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

  /* ─── Single Order Advance (New -> Preparing -> Ready -> Served) ─── */
  async function advanceOrder(order: RestaurantOrder) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const sequence: OrderStatus[] = ["PLACED", "PREPARING", "READY", "SERVED", "BILLED"];
    const currIndex = sequence.indexOf(order.status === "ACCEPTED" ? "PREPARING" : order.status);
    const next = sequence[currIndex + 1];
    if (!next) return;

    await mutate(async () => {
      const res = await supabase.rpc("advance_order_status", {
        p_order_id: order.id,
        p_status: next,
      });
      return { error: res.error };
    }, `Order #AT-${order.order_number} is now ${statusLabel(next).toLowerCase()}.`);
  }

  /* ─── Resolve Service Request ─── */
  async function resolveRequest(req: ServiceRequest) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    await mutate(async () => {
      const res = await supabase
        .from("notifications")
        .update({ status: "RESOLVED", resolved_at: new Date().toISOString() })
        .eq("id", req.id);
      return { error: res.error };
    }, `${req.request_type.toLowerCase()} request for Table ${req.table_session?.table?.number ?? ""} resolved.`);
  }

  /* ─── Sign Out ─── */
  async function signOut() {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.assign("/admin/login");
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
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setSection(label)}
              className={section === label ? "active" : ""}
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === "Kitchen" && activeOrders.length > 0 && <b>{activeOrders.length}</b>}
              {label === "Service Requests" && openRequests.length > 0 && <b>{openRequests.length}</b>}
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

      {/* Main Main Workspace */}
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
                  onSection={setSection}
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

              {section === "Service Requests" && (
                <ServiceRequestsWorkspace
                  requests={data.requests}
                  orders={data.orders}
                  search={search}
                  resolve={resolveRequest}
                  advance={advanceOrder}
                />
              )}

              {section === "Settings" && data.restaurant && data.branch && (
                <SettingsWorkspace
                  restaurant={data.restaurant}
                  branch={data.branch}
                  soundEnabled={soundEnabled}
                  setSoundEnabled={setSoundEnabled}
                  mutate={mutate}
                />
              )}
            </>
          )}
        </div>
      </section>

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
            <button onClick={() => onSection("Service Requests")}>
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

/* ─────────── 5. Service Requests Workspace ─────────── */

function ServiceRequestsWorkspace({
  requests,
  orders,
  search,
  resolve,
  advance,
}: {
  requests: ServiceRequest[];
  orders: RestaurantOrder[];
  search: string;
  resolve: (r: ServiceRequest) => Promise<void>;
  advance: (o: RestaurantOrder) => Promise<void>;
}) {
  const openRequests = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.status !== "RESOLVED" &&
          `${r.request_type} ${r.table_session?.table?.number ?? ""}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [requests, search],
  );

  const readyOrders = useMemo(
    () => orders.filter((o) => o.status === "READY" && orderMatches(o, search)),
    [orders, search],
  );

  return (
    <div className="waiter-workspace-grid">
      {/* Service Queue */}
      <section className="admin-card">
        <div className="admin-card__head">
          <div>
            <h2>Service Requests Queue</h2>
            <span>{openRequests.length} awaiting action</span>
          </div>
        </div>
        <div className="admin-card-list">
          {openRequests.map((req) => (
            <article className="request-row" key={req.id}>
              <span className="table-bubble">T{req.table_session?.table?.number ?? "—"}</span>
              <div>
                <strong>{req.request_type} Request</strong>
                <small>{relativeTime(req.created_at)}</small>
              </div>
              <button className="resolve-button" onClick={() => void resolve(req)}>
                Resolve Request
              </button>
            </article>
          ))}
          {!openRequests.length && <div className="admin-empty">All service requests resolved!</div>}
        </div>
      </section>

      {/* Ready to Serve Queue */}
      <section className="admin-card">
        <div className="admin-card__head">
          <div>
            <h2>Ready to Serve</h2>
            <span>{readyOrders.length} food orders</span>
          </div>
        </div>
        <div className="admin-card-list">
          {readyOrders.map((o) => (
            <article className="request-row" key={o.id}>
              <span className="table-bubble">T{tableNumber(o)}</span>
              <div>
                <strong>Order #AT-{o.order_number}</strong>
                <small>{o.order_items?.length ?? 0} items ready</small>
              </div>
              <button className="resolve-button" onClick={() => void advance(o)}>
                Mark Served
              </button>
            </article>
          ))}
          {!readyOrders.length && <div className="admin-empty">No orders waiting to be served.</div>}
        </div>
      </section>
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
}: {
  restaurant: RestaurantProfile;
  branch: BranchProfile;
  soundEnabled: boolean;
  setSoundEnabled: (b: boolean) => void;
  mutate: (work: () => Promise<{ error: { message: string } | null }>, successMsg: string) => Promise<boolean>;
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

  async function save() {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    await mutate(async () => {
      const res = await supabase.from("branches").update({
        name: form.name,
        address: form.address,
        gstin: form.gstin,
        tax_rate: form.taxRate,
        qr_ordering_enabled: form.qrEnabled,
        parcel_charge_enabled: form.parcelEnabled,
      }).eq("id", branch.id);
      return { error: res.error };
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
        {(["restaurant", "billing", "kitchen", "notifications", "system"] as const).map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="settings-panel-container">
        {tab === "restaurant" && (
          <section className="admin-card settings-form">
            <h2>Restaurant Profile</h2>
            <label>
              Restaurant Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Phone Number
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
              <div><span>Realtime WebSocket</span><strong>🟢 Connected</strong></div>
              <div><span>Database Service</span><strong>🟢 Operational</strong></div>
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
