"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BellRing,
  Check,
  ChevronRight,
  LoaderCircle,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
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
import { FoodMark } from "./brand";
import { SiteHeader } from "./site-header";

type CartLine = MenuItem & { quantity: number };
type TableContext = {
  session_id: string;
  table_id: string;
  table_number: number;
  branch_id: string;
  branch_name: string;
  tax_rate: number;
  parcel_charge_enabled: boolean;
};

const orderSteps = [
  { status: "PLACED", label: "Order placed" },
  { status: "ACCEPTED", label: "Accepted" },
  { status: "PREPARING", label: "In the kitchen" },
  { status: "READY", label: "Ready to serve" },
  { status: "SERVED", label: "Served" },
] as const;

export function OrderApp({
  tableToken,
  initialCategories = [],
  initialItems = [],
  configured = true,
}: {
  tableToken?: string;
  initialCategories?: MenuCategory[];
  initialItems?: MenuItem[];
  configured?: boolean;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [items, setItems] = useState(initialItems);
  const [category, setCategory] = useState("All");
  const [diet, setDiet] = useState<"all" | "veg" | "nonveg">("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState("");
  const [spice, setSpice] = useState("Medium");
  const [parcel, setParcel] = useState(false);
  const [table, setTable] = useState<TableContext | null>(null);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [loading, setLoading] = useState(Boolean(tableToken));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    configured ? null : "Ordering is unavailable until the restaurant backend is configured.",
  );
  const [toast, setToast] = useState<string | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (categoryResult.error || itemResult.error) {
      setError(categoryResult.error?.message ?? itemResult.error?.message ?? "The menu could not be loaded.");
      return;
    }
    setCategories((categoryResult.data ?? []) as MenuCategory[]);
    const nextItems = ((itemResult.data ?? []) as unknown as MenuItem[]).map(
      normalizeMenuItem,
    );
    setItems(nextItems);
    const availableIds = new Set(nextItems.map((item) => item.id));
    setCart((current) => current.filter((line) => availableIds.has(line.id)));
  }, []);

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
    if (result.error) {
      setError(result.error.message);
      return;
    }
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

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    if (!initialItems.length) queueMicrotask(() => void loadMenu());

    const menuChannel = supabase
      .channel("public-menu")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => {
        void loadMenu();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_categories" }, () => {
        void loadMenu();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(menuChannel);
    };
  }, [initialItems.length, loadMenu]);

  useEffect(() => {
    if (!tableToken) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const client = supabase;

    let cancelled = false;
    let orderChannel: ReturnType<typeof supabase.channel> | null = null;

    async function initializeTable() {
      setLoading(true);
      setError(null);
      const sessionResult = await client.auth.getSession();
      if (sessionResult.error) throw sessionResult.error;
      if (!sessionResult.data.session) {
        const anonymousResult = await client.auth.signInAnonymously();
        if (anonymousResult.error) throw anonymousResult.error;
      }

      const openResult = await client.rpc("open_table_session", {
        p_qr_token: tableToken,
      });
      if (openResult.error) throw openResult.error;
      if (cancelled) return;

      const context = openResult.data as TableContext;
      context.tax_rate = Number(context.tax_rate);
      setTable(context);
      await loadOrders(context.session_id);

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
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "order_items" },
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
          setError(problem instanceof Error ? problem.message : "This table QR code could not be opened.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      if (orderChannel) void client.removeChannel(orderChannel);
    };
  }, [loadOrders, tableToken]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const matchesCategory = category === "All" || itemCategory(item) === category;
        const matchesDiet =
          diet === "all" || (diet === "veg" ? item.is_veg : !item.is_veg);
        const matchesQuery = `${item.name} ${item.description ?? ""} ${itemCategory(item)}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesCategory && matchesDiet && matchesQuery;
      }),
    [category, diet, items, query],
  );

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce(
    (sum, line) => sum + Number(line.price) * line.quantity,
    0,
  );
  const parcelCharge =
    parcel && table?.parcel_charge_enabled !== false
      ? cart
          .filter((line) => itemCategory(line).toLowerCase() === "biryani")
          .reduce((sum, line) => sum + line.quantity * 10, 0)
      : 0;
  const tax = Number(((subtotal + parcelCharge) * ((table?.tax_rate ?? 0) / 100)).toFixed(2));
  const total = subtotal + parcelCharge + tax;
  const activeOrder = orders.find(
    (order) => !["PAID", "CANCELLED"].includes(order.status),
  );

  function updateCart(item: MenuItem, delta: number) {
    setCart((current) => {
      const match = current.find((line) => line.id === item.id);
      if (!match && delta > 0) return [...current, { ...item, quantity: 1 }];
      return current
        .map((line) =>
          line.id === item.id
            ? { ...line, quantity: Math.min(50, line.quantity + delta) }
            : line,
        )
        .filter((line) => line.quantity > 0);
    });
  }

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
      p_notes: note,
      p_spice_level: spice,
      p_is_parcel: parcel,
    });
    if (result.error) {
      setError(result.error.message);
      setSubmitting(false);
      return;
    }
    const created = result.data as { order_number: number };
    setCart([]);
    setNote("");
    setParcel(false);
    setCartOpen(false);
    setToast(`Order #AT-${created.order_number} was sent to the kitchen.`);
    await loadOrders(table.session_id);
    setSubmitting(false);
  }

  async function request(label: string) {
    if (!table) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const result = await supabase.rpc("create_service_request", {
      p_table_session_id: table.session_id,
      p_request_type: label.toUpperCase(),
    });
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setToast(`${label} request sent to the service team.`);
  }

  return (
    <main className="order-page">
      <SiteHeader cartCount={itemCount} onCart={() => setCartOpen(true)} />
      <div className="order-topbar">
        <div className="container order-topbar__inner">
          <Link href="/" className="back-link">
            <ArrowLeft size={17} /> Restaurant home
          </Link>
          <div className="table-context">
            <span className={table ? "pulse-dot" : "status-dot"} />
            <div>
              <small>{table ? "Dining in" : "Athidhi menu"}</small>
              <strong>{table ? `Table ${table.table_number}` : "Explore the menu"}</strong>
            </div>
          </div>
          {table && (
            <button className="help-button" onClick={() => void request("Waiter")}>
              Call waiter <BellRing size={16} />
            </button>
          )}
        </div>
      </div>

      <section className="order-hero container">
        <div>
          <p className="eyebrow eyebrow--maroon">
            <span /> Fresh from our kitchen
          </p>
          <h1>
            {table
              ? `What may we bring to table ${table.table_number}?`
              : "Find your next favourite."}
          </h1>
          <p>
            Explore family favourites, regional classics and chef&apos;s specials—made
            fresh when you order.
          </p>
        </div>
        <div className="menu-search">
          <Search size={19} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search biryani, paneer, curry…"
            aria-label="Search menu"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>
      </section>

      {loading && (
        <div className="container data-state">
          <LoaderCircle className="spin" /> Connecting this table…
        </div>
      )}
      {error && (
        <div className="container data-error" role="alert">
          <strong>We couldn&apos;t complete that request.</strong>
          <span>{error}</span>
          <button onClick={() => window.location.reload()}>Try again</button>
        </div>
      )}

      <div className="container menu-layout">
        <section className="menu-content">
          <div className="menu-controls">
            <div className="category-tabs" role="tablist" aria-label="Menu categories">
              {["All", ...categories.map((item) => item.name)].map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={category === item ? "active" : ""}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="diet-toggle" aria-label="Diet preference">
              <button onClick={() => setDiet("all")} className={diet === "all" ? "active" : ""}>
                All
              </button>
              <button onClick={() => setDiet("veg")} className={diet === "veg" ? "active" : ""}>
                <FoodMark veg /> Veg
              </button>
              <button
                onClick={() => setDiet("nonveg")}
                className={diet === "nonveg" ? "active" : ""}
              >
                <FoodMark veg={false} /> Non-veg
              </button>
            </div>
          </div>

          <div className="menu-result-heading">
            <div>
              <h2>{category === "All" ? "Full menu" : category}</h2>
              <span>{filtered.length} dishes</span>
            </div>
            <p>
              <Sparkles size={15} /> Live availability
            </p>
          </div>
          <div className="menu-grid">
            {filtered.map((item) => {
              const line = cart.find((entry) => entry.id === item.id);
              return (
                <motion.article layout className="menu-card" key={item.id}>
                  <div
                    className="menu-card__image"
                    style={{ backgroundImage: `url(${item.image_url ?? defaultMenuImage})` }}
                  >
                    {item.bestseller && <span className="bestseller-badge">Bestseller</span>}
                  </div>
                  <div className="menu-card__body">
                    <div className="menu-card__meta">
                      <span>
                        <FoodMark veg={item.is_veg} /> {itemCategory(item)}
                      </span>
                      <strong>{formatCurrency(item.price)}</strong>
                    </div>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    {line ? (
                      <div className="quantity-control">
                        <button
                          onClick={() => updateCart(item, -1)}
                          aria-label={`Remove one ${item.name}`}
                        >
                          <Minus size={16} />
                        </button>
                        <strong>{line.quantity}</strong>
                        <button
                          onClick={() => updateCart(item, 1)}
                          aria-label={`Add another ${item.name}`}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ) : (
                      <button className="add-button" onClick={() => updateCart(item, 1)}>
                        Add to selection <Plus size={16} />
                      </button>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
          {!loading && !filtered.length && (
            <div className="empty-state">
              <Search size={28} />
              <h3>No dishes found</h3>
              <p>Try a different search or menu category.</p>
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

          {table && (
            <section className="table-help">
              <div>
                <p className="eyebrow eyebrow--maroon">
                  <span /> Need a hand?
                </p>
                <h2>We&apos;re just a tap away.</h2>
              </div>
              <div className="request-grid">
                {[
                  ["Waiter", "A member of our team"],
                  ["Water", "Fresh drinking water"],
                  ["Spoon", "Extra cutlery"],
                  ["Tissue", "Extra napkins"],
                  ["Bill", "Prepare my bill"],
                ].map(([label, description]) => (
                  <button key={label} onClick={() => void request(label)}>
                    <span>{label === "Bill" ? "₹" : label.slice(0, 1)}</span>
                    <strong>{label}</strong>
                    <small>{description}</small>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </section>
          )}
        </section>

        <aside className="cart-panel desktop-cart">
          <CartContent
            cart={cart}
            subtotal={subtotal}
            parcelCharge={parcelCharge}
            tax={tax}
            total={total}
            parcel={parcel}
            setParcel={setParcel}
            note={note}
            setNote={setNote}
            spice={spice}
            setSpice={setSpice}
            updateCart={updateCart}
            placeOrder={placeOrder}
            table={table}
            submitting={submitting}
          />
        </aside>
      </div>

      {activeOrder && (
        <OrderTracker order={activeOrder} />
      )}

      {itemCount > 0 && (
        <button className="mobile-cart-bar" onClick={() => setCartOpen(true)}>
          <span>
            <ShoppingBag size={18} /> {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
          <strong>View selection · {formatCurrency(total)}</strong>
        </button>
      )}
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
          >
            <motion.aside
              className="cart-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="drawer-close"
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
              >
                <X />
              </button>
              <CartContent
                cart={cart}
                subtotal={subtotal}
                parcelCharge={parcelCharge}
                tax={tax}
                total={total}
                parcel={parcel}
                setParcel={setParcel}
                note={note}
                setNote={setNote}
                spice={spice}
                setSpice={setSpice}
                updateCart={updateCart}
                placeOrder={placeOrder}
                table={table}
                submitting={submitting}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
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

function OrderTracker({ order }: { order: RestaurantOrder }) {
  const currentIndex = orderSteps.findIndex((step) => step.status === order.status);
  const visibleIndex = currentIndex < 0 ? orderSteps.length - 1 : currentIndex;
  return (
    <section className="order-tracker container">
      <div className="order-tracker__head">
        <div>
          <span>LIVE ORDER · #AT-{order.order_number}</span>
          <h2>
            {order.status === "BILLED"
              ? "Bill requested"
              : order.status === "PAID"
                ? "Payment complete"
                : orderSteps[visibleIndex]?.label}
          </h2>
        </div>
        <strong>{formatCurrency(order.total)}</strong>
      </div>
      <div className="tracker-steps">
        {orderSteps.map((step, index) => (
          <div className={index <= visibleIndex ? "done" : ""} key={step.status}>
            <span>{index < visibleIndex ? <Check size={16} /> : index + 1}</span>
            <strong>{step.label}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function CartContent({
  cart,
  subtotal,
  parcelCharge,
  tax,
  total,
  parcel,
  setParcel,
  note,
  setNote,
  spice,
  setSpice,
  updateCart,
  placeOrder,
  table,
  submitting,
}: {
  cart: CartLine[];
  subtotal: number;
  parcelCharge: number;
  tax: number;
  total: number;
  parcel: boolean;
  setParcel: (value: boolean) => void;
  note: string;
  setNote: (value: string) => void;
  spice: string;
  setSpice: (value: string) => void;
  updateCart: (item: MenuItem, delta: number) => void;
  placeOrder: () => void;
  table: TableContext | null;
  submitting: boolean;
}) {
  return (
    <div className="cart-content">
      <div className="cart-heading">
        <div>
          <span>{table ? `TABLE ${table.table_number}` : "YOUR SELECTION"}</span>
          <h2>Your order</h2>
        </div>
        <ShoppingBag size={21} />
      </div>
      {!cart.length ? (
        <div className="cart-empty">
          <div>
            <ShoppingBag size={24} />
          </div>
          <h3>Your table is ready</h3>
          <p>Add a dish and we&apos;ll keep it right here.</p>
        </div>
      ) : (
        <>
          <div className="cart-lines">
            {cart.map((line) => (
              <div className="cart-line" key={line.id}>
                <div>
                  <FoodMark veg={line.is_veg} />
                  <span>
                    <strong>{line.name}</strong>
                    <small>{formatCurrency(line.price)} each</small>
                  </span>
                </div>
                <div>
                  <button
                    onClick={() => updateCart(line, -line.quantity)}
                    aria-label={`Remove ${line.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="mini-quantity">
                    <button onClick={() => updateCart(line, -1)} aria-label={`Remove one ${line.name}`}>
                      <Minus size={12} />
                    </button>
                    <span>{line.quantity}</span>
                    <button onClick={() => updateCart(line, 1)} aria-label={`Add one ${line.name}`}>
                      <Plus size={12} />
                    </button>
                  </div>
                  <strong>{formatCurrency(line.price * line.quantity)}</strong>
                </div>
              </div>
            ))}
          </div>
          <div className="order-options">
            <label>
              <span>Spice level</span>
              <select value={spice} onChange={(event) => setSpice(event.target.value)}>
                <option>Mild</option>
                <option>Medium</option>
                <option>Spicy</option>
                <option>Extra spicy</option>
              </select>
            </label>
            <label>
              <span>Kitchen note</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Allergies or special requests…"
                maxLength={500}
                rows={2}
              />
            </label>
            <label className="parcel-toggle">
              <input
                type="checkbox"
                checked={parcel}
                onChange={(event) => setParcel(event.target.checked)}
              />
              <span>
                <strong>Pack as parcel</strong>
                <small>₹10 per biryani quantity</small>
              </span>
              <i />
            </label>
          </div>
          <div className="cart-totals">
            <div>
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            {parcelCharge > 0 && (
              <div>
                <span>Parcel charge</span>
                <strong>{formatCurrency(parcelCharge)}</strong>
              </div>
            )}
            {tax > 0 && (
              <div>
                <span>GST</span>
                <strong>{formatCurrency(tax)}</strong>
              </div>
            )}
            <div className="grand-total">
              <span>Total</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
          </div>
          {table ? (
            <button className="place-order" onClick={placeOrder} disabled={submitting}>
              {submitting ? <LoaderCircle className="spin" size={18} /> : "Place order"}
              <span>{formatCurrency(total)}</span>
              <ChevronRight size={18} />
            </button>
          ) : (
            <div className="scan-to-order">
              Scan the QR code at your table to send this selection to the kitchen.
            </div>
          )}
          <p className="order-fineprint">
            {table ? "No sign-up needed · Pay after your meal" : "Live menu · Current availability"}
          </p>
        </>
      )}
    </div>
  );
}
