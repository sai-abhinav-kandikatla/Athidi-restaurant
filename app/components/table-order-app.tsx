"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  LoaderCircle,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  defaultMenuImage,
  formatCurrency,
  itemCategory,
  normalizeMenuItem,
} from "../lib/menu";
import type {
  MenuCategory,
  MenuItem,
  RestaurantOrder,
} from "../lib/restaurant-types";
import { getBrowserSupabase } from "../lib/supabase/client";
import { Brand, FoodMark } from "./brand";

/* ─────────── Types ─────────── */

type CartLine = MenuItem & { quantity: number; specialNote?: string };

type TableContext = {
  session_id: string;
  table_id: string;
  table_number: number;
  branch_id: string;
  branch_name: string;
  tax_rate: number;
  parcel_charge_enabled: boolean;
  session_opened_at: string;
  session_state: string;
};

type ServiceCooldown = {
  [key: string]: number; // timestamp when cooldown expires
};

const CART_STORAGE_KEY = "athidhi_cart";
const SESSION_STORAGE_KEY = "athidhi_session";
const COOLDOWN_MS = 60_000; // 60 seconds

/* ─────────── Component ─────────── */

export function TableOrderApp({
  tableNumber,
  initialCategories = [],
  initialItems = [],
  configured = true,
  error: initialError,
}: {
  tableNumber: number;
  initialCategories?: MenuCategory[];
  initialItems?: MenuItem[];
  configured?: boolean;
  error?: string;
}) {
  /* State */
  const [categories, setCategories] = useState(initialCategories);
  const [items, setItems] = useState(initialItems);
  const [category, setCategory] = useState("All");
  const [diet, setDiet] = useState<"all" | "veg" | "nonveg">("all");
  const [sortBy, setSortBy] = useState<"default" | "price" | "name">("default");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>(() => {
    if (typeof window === "undefined" || tableNumber <= 0) return [];
    try {
      const saved = localStorage.getItem(`${CART_STORAGE_KEY}_${tableNumber}`);
      if (saved) {
        const parsed = JSON.parse(saved) as CartLine[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState("");
  const [spice, setSpice] = useState("Medium");
  const [parcel, setParcel] = useState(false);
  const [table, setTable] = useState<TableContext | null>(null);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const canInitialize = tableNumber > 0 && !initialError;
  const [loading, setLoading] = useState(canInitialize);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [toast, setToast] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<ServiceCooldown>({});
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [detailNote, setDetailNote] = useState("");
  const [detailSpice, setDetailSpice] = useState("Medium");
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ─── Save cart to localStorage on change ─── */
  useEffect(() => {
    if (tableNumber > 0) {
      try {
        localStorage.setItem(`${CART_STORAGE_KEY}_${tableNumber}`, JSON.stringify(cart));
      } catch { /* ignore */ }
    }
  }, [cart, tableNumber]);

  const [nowTime, setNowTime] = useState(() => Date.now());

  /* ─── Cooldown ticker ─── */
  useEffect(() => {
    cooldownTimer.current = setInterval(() => {
      const currentNow = Date.now();
      setNowTime(currentNow);
      setCooldowns((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const key of Object.keys(next)) {
          if (next[key] <= currentNow) {
            delete next[key];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  /* ─── Load menu ─── */
  const loadMenu = useCallback(async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const [categoryResult, itemResult] = await Promise.all([
      supabase
        .from("menu_categories")
        .select("id,restaurant_id,name,slug,sort_order,active")
        .eq("active", true)
        .order("sort_order"),
      supabase
        .from("menu_items")
        .select(
          "id,restaurant_id,category_id,name,description,price,is_veg,available,bestseller,image_url,sort_order,category:menu_categories(id,name,slug)",
        )
        .eq("available", true)
        .order("sort_order"),
    ]);
    if (categoryResult.error || itemResult.error) return;
    setCategories((categoryResult.data ?? []) as MenuCategory[]);
    const nextItems = ((itemResult.data ?? []) as unknown as MenuItem[]).map(normalizeMenuItem);
    setItems(nextItems);
    const availableIds = new Set(nextItems.map((item) => item.id));
    setCart((current) => current.filter((line) => availableIds.has(line.id)));
  }, []);

  /* ─── Load orders for session ─── */
  const loadOrders = useCallback(async (sessionId: string) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const result = await supabase
      .from("orders")
      .select(
        "id,order_number,branch_id,table_session_id,status,subtotal,parcel_charge,tax,total,notes,spice_level,placed_at,served_at,paid_at,order_items(*)",
      )
      .eq("table_session_id", sessionId)
      .order("placed_at", { ascending: false });
    if (result.error) return;
    setOrders(
      ((result.data ?? []) as unknown as RestaurantOrder[]).map((order) => ({
        ...order,
        subtotal: Number(order.subtotal),
        parcel_charge: Number(order.parcel_charge),
        tax: Number(order.tax),
        total: Number(order.total),
      })),
    );
  }, []);

  /* ─── Initialize table session ─── */
  useEffect(() => {
    if (!canInitialize) return;

    const supabase = getBrowserSupabase();
    if (!supabase) {
      queueMicrotask(() => {
        setLoading(false);
        setError(configured ? "Unable to connect." : "Ordering is unavailable until the restaurant backend is configured.");
      });
      return;
    }

    const client = supabase;

    if (!initialItems.length) queueMicrotask(() => void loadMenu());

    let cancelled = false;
    let orderChannel: ReturnType<typeof client.channel> | null = null;

    async function initializeTable() {
      setLoading(true);
      setError(null);

      // Anonymous auth
      const sessionResult = await client.auth.getSession();
      if (sessionResult.error) throw sessionResult.error;
      if (!sessionResult.data.session) {
        const anonResult = await client.auth.signInAnonymously();
        if (anonResult.error) throw anonResult.error;
      }

      // Open session by table number
      const openResult = await client.rpc("open_table_session_by_number", {
        p_table_number: tableNumber,
      });
      if (openResult.error) throw openResult.error;
      if (cancelled) return;

      const context = openResult.data as TableContext;
      context.tax_rate = Number(context.tax_rate);
      setTable(context);

      // Save session reference
      try {
        localStorage.setItem(
          `${SESSION_STORAGE_KEY}_${tableNumber}`,
          JSON.stringify({ session_id: context.session_id, table_number: tableNumber }),
        );
      } catch { /* ignore */ }

      await loadOrders(context.session_id);

      // Real-time order updates
      orderChannel = client
        .channel(`table-orders-${context.session_id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `table_session_id=eq.${context.session_id}`,
          },
          () => {
            if (reloadTimer.current) clearTimeout(reloadTimer.current);
            reloadTimer.current = setTimeout(() => void loadOrders(context.session_id), 150);
          },
        )
        .subscribe();
    }

    initializeTable()
      .catch((problem: unknown) => {
        if (!cancelled) {
          const msg = problem instanceof Error ? problem.message : "This table could not be opened.";
          if (msg.includes("not found")) {
            setError("Invalid Table");
          } else {
            setError(msg);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Subscribe to menu changes
    const menuChannel = client
      .channel("public-menu-table")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => void loadMenu())
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_categories" }, () => void loadMenu())
      .subscribe();

    return () => {
      cancelled = true;
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      if (orderChannel) void client.removeChannel(orderChannel);
      void client.removeChannel(menuChannel);
    };
  }, [canInitialize, tableNumber, configured, initialItems.length, loadMenu, loadOrders]);

  /* ─── Toast auto-dismiss ─── */
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /* ─── Filtered + sorted items ─── */
  const filtered = useMemo(() => {
    let result = items.filter((item) => {
      const matchesCategory = category === "All" || itemCategory(item) === category;
      const matchesDiet = diet === "all" || (diet === "veg" ? item.is_veg : !item.is_veg);
      const matchesQuery = `${item.name} ${item.description ?? ""} ${itemCategory(item)}`
        .toLowerCase()
        .includes(query.toLowerCase());
      return matchesCategory && matchesDiet && matchesQuery;
    });

    if (sortBy === "price") result = [...result].sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === "name") result = [...result].sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [category, diet, items, query, sortBy]);

  /* ─── Cart calculations ─── */
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0);
  const parcelCharge =
    parcel && table?.parcel_charge_enabled !== false
      ? cart
          .filter((line) => itemCategory(line).toLowerCase() === "biryani")
          .reduce((sum, line) => sum + line.quantity * 10, 0)
      : 0;
  const tax = Number(((subtotal + parcelCharge) * ((table?.tax_rate ?? 0) / 100)).toFixed(2));
  const total = subtotal + parcelCharge + tax;

  /* ─── Cart helpers ─── */
  function updateCart(item: MenuItem, delta: number) {
    setCart((current) => {
      const match = current.find((line) => line.id === item.id);
      if (!match && delta > 0) return [...current, { ...item, quantity: 1 }];
      return current
        .map((line) =>
          line.id === item.id ? { ...line, quantity: Math.min(50, line.quantity + delta) } : line,
        )
        .filter((line) => line.quantity > 0);
    });
  }

  function addFromDetail() {
    setCart((current) => {
      if (!detailItem) return current;
      const match = current.find((line) => line.id === detailItem.id);
      if (match) {
        return current.map((line) =>
          line.id === detailItem.id
            ? { ...line, quantity: Math.min(50, line.quantity + detailQty), specialNote: detailNote || undefined }
            : line,
        );
      }
      return [...current, { ...detailItem, quantity: detailQty, specialNote: detailNote || undefined }];
    });
    setToast(`${detailItem?.name} added to your order`);
    setDetailItem(null);
    setDetailQty(1);
    setDetailNote("");
  }

  /* ─── Place order (creates real order, sends to kitchen) ─── */
  async function placeOrder() {
    if (!cart.length || !table || submitting) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setSubmitting(true);
    setError(null);

    const result = await supabase.rpc("place_table_order", {
      p_table_session_id: table.session_id,
      p_items: cart.map((line) => ({
        menu_item_id: line.id,
        quantity: line.quantity,
      })),
      p_notes: note || cart.filter((l) => l.specialNote).map((l) => `${l.name}: ${l.specialNote}`).join("; "),
      p_spice_level: spice,
      p_is_parcel: parcel,
    });

    if (result.error) {
      setError(result.error.message);
      setSubmitting(false);
      return;
    }

    const created = result.data as { order_number: number };
    setLastOrderNumber(created.order_number);
    setCart([]);
    setNote("");
    setParcel(false);
    setCartOpen(false);
    setShowSuccess(true);
    try {
      localStorage.removeItem(`${CART_STORAGE_KEY}_${tableNumber}`);
    } catch { /* ignore */ }
    await loadOrders(table.session_id);
    setSubmitting(false);
  }

  /* ─── Service requests ─── */
  async function sendRequest(type: string, label: string, emoji: string) {
    if (!table) return;
    if (cooldowns[type]) return; // still on cooldown

    const supabase = getBrowserSupabase();
    if (!supabase) return;

    const result = await supabase.rpc("create_service_request", {
      p_table_session_id: table.session_id,
      p_request_type: type.toUpperCase(),
    });

    if (result.error) {
      setToast(`Could not send ${label} request. Please try again.`);
      return;
    }

    setCooldowns((prev) => ({ ...prev, [type]: Date.now() + COOLDOWN_MS }));
    setToast(`${emoji} ${label} request sent.`);
  }

  /* ─── Format session time ─── */
  function formatSessionTime(iso: string) {
    try {
      return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  /* ─── Render: Error state ─── */
  if (initialError || (error && !table && !loading)) {
    const isInvalid = (initialError ?? error ?? "").includes("Invalid");
    return (
      <main className="tbl-page">
        <div className="tbl-error container">
          <div style={{ fontSize: 48 }}>{isInvalid ? "⚠️" : "🔌"}</div>
          <h2>{isInvalid ? "Invalid Table" : "This table is unavailable"}</h2>
          <p>
            {isInvalid
              ? "The table number in this QR code is not valid. Please ask the staff for help."
              : error ?? "This table is currently unavailable. Please try again or ask the staff."}
          </p>
          {!isInvalid && <button onClick={() => window.location.reload()}>Try again</button>}
        </div>
      </main>
    );
  }

  /* ─── Render: Loading state ─── */
  if (loading) {
    return (
      <main className="tbl-page">
        <div className="tbl-loading">
          <LoaderCircle size={36} className="spin" />
          <span>Setting up your table…</span>
        </div>
      </main>
    );
  }

  /* ─── Service action buttons ─── */
  const serviceActions = [
    { type: "WAITER", label: "Call Waiter", emoji: "🧑" },
    { type: "WATER", label: "Water", emoji: "💧" },
    { type: "TISSUE", label: "Tissue", emoji: "🍽" },
    { type: "BILL", label: "Request Bill", emoji: "🧾" },
  ] as const;

  /* ─── Main render ─── */
  return (
    <main className="tbl-page">
      {/* Welcome header */}
      <section className="tbl-welcome">
        <div className="container">
          <Brand compact />
          <div className="tbl-welcome__info">
            <div className="tbl-welcome__badge">
              <span className="pulse-dot" />
              Table {table?.table_number ?? tableNumber}
            </div>
          </div>
          {table && (
            <div className="tbl-welcome__time">
              Session started at {formatSessionTime(table.session_opened_at)}
            </div>
          )}
          <h2>Welcome to Athidhi Family Restaurant!</h2>
        </div>
      </section>

      {/* Sticky quick action bar */}
      {table && (
        <nav className="tbl-actions" aria-label="Service requests">
          <div className="container tbl-actions__inner">
            {serviceActions.map(({ type, label, emoji }) => {
              const onCooldown = Boolean(cooldowns[type]);
              const remaining = onCooldown
                ? Math.ceil((cooldowns[type] - nowTime) / 1000)
                : 0;
              return (
                <button
                  key={type}
                  className={`tbl-action-btn${onCooldown ? " tbl-action-btn--sent" : ""}`}
                  disabled={onCooldown}
                  onClick={() => void sendRequest(type, label, emoji)}
                  aria-label={label}
                >
                  <span className="tbl-action-icon">{emoji}</span>
                  <span className="tbl-action-label">
                    {onCooldown ? `Sent (${remaining}s)` : label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Error banner */}
      {error && table && (
        <div className="container" style={{ marginTop: 16 }}>
          <div className="data-error" role="alert">
            <strong>Something went wrong</strong>
            <span>{error}</span>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Menu section */}
      <div className="container">
        <section className="tbl-menu-header">
          <h2>Our Menu</h2>

          {/* Search */}
          <div className="tbl-search">
            <Search size={20} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search biryani, paneer, curry…"
              aria-label="Search menu"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search">
                <X size={18} />
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="tbl-categories" role="tablist" aria-label="Menu categories">
            {["All", ...categories.map((c) => c.name)].map((name) => (
              <button
                key={name}
                className={`tbl-cat-btn${category === name ? " active" : ""}`}
                onClick={() => setCategory(name)}
              >
                {name}
              </button>
            ))}
          </div>

          {/* Filters row */}
          <div className="tbl-filters">
            <div className="tbl-diet-toggle" aria-label="Diet preference">
              <button className={`tbl-diet-btn${diet === "all" ? " active" : ""}`} onClick={() => setDiet("all")}>
                All
              </button>
              <button className={`tbl-diet-btn${diet === "veg" ? " active" : ""}`} onClick={() => setDiet("veg")}>
                <FoodMark veg /> Veg
              </button>
              <button className={`tbl-diet-btn${diet === "nonveg" ? " active" : ""}`} onClick={() => setDiet("nonveg")}>
                <FoodMark veg={false} /> Non-veg
              </button>
            </div>
            <select
              className="tbl-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Sort menu"
            >
              <option value="default">Sort by: Default</option>
              <option value="price">Sort by: Price</option>
              <option value="name">Sort by: A–Z</option>
            </select>
          </div>
        </section>

        {/* Menu grid */}
        <div className="tbl-menu-grid">
          {filtered.map((item) => {
            const line = cart.find((entry) => entry.id === item.id);
            return (
              <motion.article
                layout
                className="tbl-item-card"
                key={item.id}
                onClick={() => {
                  setDetailItem(item);
                  setDetailQty(line?.quantity ?? 1);
                  setDetailNote(line?.specialNote ?? "");
                  setDetailSpice(spice);
                }}
              >
                <div
                  className="tbl-item-card__img"
                  style={{ backgroundImage: `url(${item.image_url ?? defaultMenuImage})` }}
                >
                  {item.bestseller && <span className="bestseller-badge">Bestseller</span>}
                </div>
                <div className="tbl-item-card__body">
                  <div className="tbl-item-card__top">
                    <span>
                      <FoodMark veg={item.is_veg} />
                      <span className="tbl-item-card__type">{itemCategory(item)}</span>
                    </span>
                  </div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="tbl-item-card__footer">
                    <span className="tbl-item-card__price">{formatCurrency(item.price)}</span>
                    {line ? (
                      <div
                        className="tbl-qty-control"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button onClick={() => updateCart(item, -1)} aria-label={`Remove one ${item.name}`}>
                          <Minus size={18} />
                        </button>
                        <strong>{line.quantity}</strong>
                        <button onClick={() => updateCart(item, 1)} aria-label={`Add one ${item.name}`}>
                          <Plus size={18} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="tbl-add-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCart(item, 1);
                        }}
                      >
                        Add <Plus size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Empty state */}
        {!loading && !filtered.length && (
          <div className="tbl-empty">
            <Search size={30} />
            <h3>No dishes found</h3>
            <p>Try a different search or category.</p>
            <button
              onClick={() => {
                setQuery("");
                setCategory("All");
                setDiet("all");
              }}
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Previous orders */}
        {orders.length > 0 && (
          <section className="tbl-orders">
            <h3>
              <ShoppingBag size={20} /> Your Orders
            </h3>
            {orders.map((order) => (
              <div key={order.id} className="tbl-order-card">
                <div className="tbl-order-card__head">
                  <strong>Order #AT-{order.order_number}</strong>
                  <span>{order.status}</span>
                </div>
                {order.order_items && (
                  <div className="tbl-order-card__items">
                    {order.order_items.map((oi) => (
                      <div key={oi.id}>
                        <span>
                          {oi.quantity}× {oi.item_name}
                        </span>
                        <span>{formatCurrency(oi.line_total)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="tbl-order-card__total">
                  <span>Total</span>
                  <strong>{formatCurrency(order.total)}</strong>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>

      {/* Floating cart bar */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.div
            className="tbl-floating-cart"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
          >
            <div
              className="tbl-floating-cart__inner"
              onClick={() => setCartOpen(true)}
              role="button"
              tabIndex={0}
              aria-label={`View cart with ${itemCount} items`}
            >
              <div className="tbl-floating-cart__left">
                <span className="tbl-floating-cart__count">{itemCount}</span>
                <span className="tbl-floating-cart__label">
                  {itemCount === 1 ? "1 Item" : `${itemCount} Items`}
                </span>
              </div>
              <div className="tbl-floating-cart__right">
                <span className="tbl-floating-cart__total">{formatCurrency(total)}</span>
                <span className="tbl-floating-cart__arrow">
                  <ChevronRight size={18} />
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart drawer */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            className="tbl-cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
          >
            <motion.aside
              className="tbl-cart-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="tbl-cart-header">
                <div>
                  <h2>Your Order</h2>
                  {table && <span>Table {table.table_number}</span>}
                </div>
                <button className="tbl-cart-close" onClick={() => setCartOpen(false)} aria-label="Close cart">
                  <X size={20} />
                </button>
              </div>

              {!cart.length ? (
                <div className="tbl-cart-empty">
                  <ShoppingBag size={36} style={{ color: "var(--maroon)" }} />
                  <h3>Your cart is empty</h3>
                  <p>Add delicious dishes from our menu!</p>
                </div>
              ) : (
                <>
                  <div className="tbl-cart-items">
                    {cart.map((line) => (
                      <div className="tbl-cart-line" key={line.id}>
                        <div className="tbl-cart-line__top">
                          <FoodMark veg={line.is_veg} />
                          <span className="tbl-cart-line__name">{line.name}</span>
                          <button
                            className="tbl-cart-line__remove"
                            onClick={() => updateCart(line, -line.quantity)}
                            aria-label={`Remove ${line.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="tbl-cart-line__bottom">
                          <span className="tbl-cart-line__price">{formatCurrency(line.price)} each</span>
                          <div className="tbl-qty-control">
                            <button onClick={() => updateCart(line, -1)} aria-label="Remove one">
                              <Minus size={16} />
                            </button>
                            <strong>{line.quantity}</strong>
                            <button onClick={() => updateCart(line, 1)} aria-label="Add one">
                              <Plus size={16} />
                            </button>
                          </div>
                          <span className="tbl-cart-line__total">{formatCurrency(line.price * line.quantity)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="tbl-cart-footer">
                    <div className="tbl-cart-options">
                      <label>
                        Spice Level
                        <select value={spice} onChange={(e) => setSpice(e.target.value)}>
                          <option>Mild</option>
                          <option>Medium</option>
                          <option>Spicy</option>
                          <option>Extra spicy</option>
                        </select>
                      </label>
                      <label>
                        Special Instructions
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Allergies or special requests…"
                          maxLength={500}
                          rows={2}
                        />
                      </label>
                    </div>

                    <div className="tbl-cart-totals">
                      <div>
                        <span>Subtotal</span>
                        <strong>{formatCurrency(subtotal)}</strong>
                      </div>
                      {parcelCharge > 0 && (
                        <div>
                          <span>Parcel Charge</span>
                          <strong>{formatCurrency(parcelCharge)}</strong>
                        </div>
                      )}
                      {tax > 0 && (
                        <div>
                          <span>GST ({table?.tax_rate ?? 5}%)</span>
                          <strong>{formatCurrency(tax)}</strong>
                        </div>
                      )}
                      <div className="tbl-grand-total">
                        <span>Total</span>
                        <strong>{formatCurrency(total)}</strong>
                      </div>
                    </div>

                    <button
                      className="tbl-place-order"
                      onClick={placeOrder}
                      disabled={submitting || !table}
                    >
                      {submitting ? (
                        <LoaderCircle className="spin" size={20} />
                      ) : (
                        <>
                          Place Order · {formatCurrency(total)}
                          <ChevronRight size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Food detail modal */}
      <AnimatePresence>
        {detailItem && (
          <motion.div
            className="tbl-detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDetailItem(null)}
          >
            <motion.div
              className="tbl-detail-modal"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="tbl-detail-close" onClick={() => setDetailItem(null)} aria-label="Close">
                <X size={20} />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="tbl-detail-img"
                src={detailItem.image_url ?? defaultMenuImage}
                alt={detailItem.name}
              />
              <div className="tbl-detail-body">
                <h2>{detailItem.name}</h2>
                <div className="tbl-detail-meta">
                  <FoodMark veg={detailItem.is_veg} />
                  <span className="tbl-item-card__type">{itemCategory(detailItem)}</span>
                  <span className="tbl-detail-price">{formatCurrency(detailItem.price)}</span>
                </div>
                {detailItem.description && (
                  <p className="tbl-detail-desc">{detailItem.description}</p>
                )}

                <div className="tbl-detail-section">
                  <label>
                    Spice Level
                    <select value={detailSpice} onChange={(e) => setDetailSpice(e.target.value)}>
                      <option>Mild</option>
                      <option>Medium</option>
                      <option>Spicy</option>
                      <option>Extra spicy</option>
                    </select>
                  </label>
                </div>

                <div className="tbl-detail-section">
                  <label>
                    Special Instructions
                    <textarea
                      value={detailNote}
                      onChange={(e) => setDetailNote(e.target.value)}
                      placeholder="Any allergies or preferences…"
                      maxLength={300}
                      rows={2}
                    />
                  </label>
                </div>

                <div className="tbl-detail-qty">
                  <span>Quantity</span>
                  <div className="tbl-qty-control">
                    <button onClick={() => setDetailQty(Math.max(1, detailQty - 1))}>
                      <Minus size={18} />
                    </button>
                    <strong>{detailQty}</strong>
                    <button onClick={() => setDetailQty(Math.min(50, detailQty + 1))}>
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                <button className="tbl-detail-add" onClick={addFromDetail}>
                  Add to Order · {formatCurrency(detailItem.price * detailQty)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success popup */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="tbl-success-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="tbl-success-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              <div className="tbl-success-check">
                <Check size={36} />
              </div>
              <h2>Order Placed Successfully!</h2>
              {lastOrderNumber && <p>Order #AT-{lastOrderNumber}</p>}
              <p>Thank you for dining with us.</p>
              <p>Our chefs have started preparing your order.</p>
              <p className="tbl-success-time">Estimated: 10–20 minutes</p>
              <p>
                If you need anything,<br />
                tap <strong>&quot;Call Waiter&quot;</strong> above.
              </p>
              <p style={{ marginTop: 8 }}>Enjoy your meal! 🍽️</p>

              <div className="tbl-success-actions">
                <button
                  className="tbl-success-primary"
                  onClick={() => setShowSuccess(false)}
                >
                  Continue Browsing Menu
                </button>
                <button
                  className="tbl-success-secondary"
                  onClick={() => {
                    setShowSuccess(false);
                    void sendRequest("WAITER", "Call Waiter", "🧑");
                  }}
                >
                  🧑 Call Waiter
                </button>
                <button
                  className="tbl-success-ghost"
                  onClick={() => setShowSuccess(false)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="tbl-toast"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 15, opacity: 0 }}
            role="status"
          >
            <Check size={18} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
