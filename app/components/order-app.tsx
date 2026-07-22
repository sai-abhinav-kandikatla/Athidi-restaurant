"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BellRing, Check, ChevronRight, Minus, Plus, Search, ShoppingBag, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { menuCategories, menuItems, type MenuItem } from "../lib/menu";
import { FoodMark } from "./brand";
import { SiteHeader } from "./site-header";

type CartLine = MenuItem & { quantity: number };
const orderSteps = ["Order placed", "In the kitchen", "Ready to serve", "Served"];

export function OrderApp({ tableNumber }: { tableNumber?: string }) {
  const [category, setCategory] = useState("All");
  const [diet, setDiet] = useState<"all" | "veg" | "nonveg">("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState("");
  const [spice, setSpice] = useState("Medium");
  const [parcel, setParcel] = useState(false);
  const [orderStep, setOrderStep] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = window.localStorage.getItem("athidhi-cart");
      if (saved) setCart(JSON.parse(saved));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("athidhi-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (orderStep === null || orderStep >= 3) return;
    const id = window.setInterval(() => setOrderStep((step) => step === null ? null : Math.min(3, step + 1)), 7000);
    return () => window.clearInterval(id);
  }, [orderStep]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const filtered = useMemo(() => menuItems.filter((item) => {
    const matchesCategory = category === "All" || item.category === category;
    const matchesDiet = diet === "all" || (diet === "veg" ? item.veg : !item.veg);
    const matchesQuery = `${item.name} ${item.description} ${item.group}`.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesDiet && matchesQuery;
  }), [category, diet, query]);

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const parcelCharge = parcel ? cart.filter((line) => line.category === "Biryani").reduce((sum, line) => sum + line.quantity * 10, 0) : 0;
  const total = subtotal + parcelCharge;

  function updateCart(item: MenuItem, delta: number) {
    setCart((current) => {
      const match = current.find((line) => line.id === item.id);
      if (!match && delta > 0) return [...current, { ...item, quantity: 1 }];
      return current.map((line) => line.id === item.id ? { ...line, quantity: line.quantity + delta } : line).filter((line) => line.quantity > 0);
    });
  }

  function placeOrder() {
    if (!cart.length) return;
    setOrderStep(0);
    setCartOpen(false);
    setToast("Order #AT-1048 sent to the kitchen");
    setCart([]);
  }

  function request(label: string) {
    setToast(`${label} request sent to your waiter`);
  }

  return (
    <main className="order-page">
      <SiteHeader cartCount={itemCount} onCart={() => setCartOpen(true)} />
      <div className="order-topbar">
        <div className="container order-topbar__inner">
          <Link href="/" className="back-link"><ArrowLeft size={17} /> Restaurant home</Link>
          <div className="table-context"><span className="pulse-dot" /><div><small>{tableNumber ? "Dining in" : "Athidhi menu"}</small><strong>{tableNumber ? `Table ${tableNumber}` : "Order & discover"}</strong></div></div>
          {tableNumber && <button className="help-button" onClick={() => request("Waiter")}>Call waiter <BellRing size={16} /></button>}
        </div>
      </div>

      <section className="order-hero container">
        <div><p className="eyebrow eyebrow--maroon"><span /> Fresh from our kitchen</p><h1>{tableNumber ? `What may we bring to table ${tableNumber}?` : "Find your next favourite."}</h1><p>Explore family favourites, regional classics and chef&apos;s specials—made fresh when you order.</p></div>
        <div className="menu-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search biryani, paneer, curry…" aria-label="Search menu" />{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}</div>
      </section>

      <div className="container menu-layout">
        <section className="menu-content">
          <div className="menu-controls">
            <div className="category-tabs" role="tablist" aria-label="Menu categories">{menuCategories.map((item) => <button key={item} onClick={() => setCategory(item)} className={category === item ? "active" : ""}>{item}</button>)}</div>
            <div className="diet-toggle" aria-label="Diet preference"><button onClick={() => setDiet("all")} className={diet === "all" ? "active" : ""}>All</button><button onClick={() => setDiet("veg")} className={diet === "veg" ? "active" : ""}><FoodMark veg /> Veg</button><button onClick={() => setDiet("nonveg")} className={diet === "nonveg" ? "active" : ""}><FoodMark veg={false} /> Non-veg</button></div>
          </div>

          <div className="menu-result-heading"><div><h2>{category === "All" ? "Full menu" : category}</h2><span>{filtered.length} dishes</span></div><p><Sparkles size={15} /> Prepared fresh to order</p></div>
          <div className="menu-grid">
            {filtered.map((item) => {
              const line = cart.find((entry) => entry.id === item.id);
              return (
                <motion.article layout className="menu-card" key={item.id}>
                  <div className="menu-card__image" style={{ backgroundImage: `url(${item.image})` }}>{item.bestseller && <span className="bestseller-badge">Bestseller</span>}</div>
                  <div className="menu-card__body">
                    <div className="menu-card__meta"><span><FoodMark veg={item.veg} /> {item.group}</span><strong>₹{item.price}</strong></div>
                    <h3>{item.name}</h3><p>{item.description}</p>
                    {line ? <div className="quantity-control"><button onClick={() => updateCart(item, -1)} aria-label={`Remove one ${item.name}`}><Minus size={16} /></button><strong>{line.quantity}</strong><button onClick={() => updateCart(item, 1)} aria-label={`Add another ${item.name}`}><Plus size={16} /></button></div> : <button className="add-button" onClick={() => updateCart(item, 1)}>Add to order <Plus size={16} /></button>}
                  </div>
                </motion.article>
              );
            })}
          </div>
          {!filtered.length && <div className="empty-state"><Search size={28} /><h3>No dishes found</h3><p>Try a different search or menu category.</p><button onClick={() => { setQuery(""); setCategory("All"); setDiet("all"); }}>Clear filters</button></div>}

          {tableNumber && (
            <section className="table-help">
              <div><p className="eyebrow eyebrow--maroon"><span /> Need a hand?</p><h2>We&apos;re just a tap away.</h2></div>
              <div className="request-grid">{[["Waiter", "A member of our team"], ["Water", "Fresh drinking water"], ["Spoon", "Extra cutlery"], ["Tissue", "Extra napkins"], ["Bill", "Prepare my bill"]].map(([label, desc]) => <button key={label} onClick={() => request(label)}><span>{label === "Bill" ? "₹" : label.slice(0, 1)}</span><strong>{label}</strong><small>{desc}</small><ChevronRight size={16} /></button>)}</div>
            </section>
          )}
        </section>

        <aside className="cart-panel desktop-cart">
          <CartContent cart={cart} subtotal={subtotal} parcelCharge={parcelCharge} total={total} parcel={parcel} setParcel={setParcel} note={note} setNote={setNote} spice={spice} setSpice={setSpice} updateCart={updateCart} placeOrder={placeOrder} tableNumber={tableNumber} />
        </aside>
      </div>

      {orderStep !== null && (
        <section className="order-tracker container">
          <div className="order-tracker__head"><div><span>LIVE ORDER · #AT-1048</span><h2>{orderSteps[orderStep]}</h2></div><strong>{orderStep >= 2 ? "Almost there" : "20–25 min"}</strong></div>
          <div className="tracker-steps">{orderSteps.map((step, index) => <div className={index <= orderStep ? "done" : ""} key={step}><span>{index < orderStep ? <Check size={16} /> : index + 1}</span><strong>{step}</strong></div>)}</div>
        </section>
      )}

      {itemCount > 0 && <button className="mobile-cart-bar" onClick={() => setCartOpen(true)}><span><ShoppingBag size={18} /> {itemCount} {itemCount === 1 ? "item" : "items"}</span><strong>View order · ₹{total}</strong></button>}
      <AnimatePresence>{cartOpen && <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCartOpen(false)}><motion.aside className="cart-drawer" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }} onClick={(event) => event.stopPropagation()}><button className="drawer-close" onClick={() => setCartOpen(false)} aria-label="Close cart"><X /></button><CartContent cart={cart} subtotal={subtotal} parcelCharge={parcelCharge} total={total} parcel={parcel} setParcel={setParcel} note={note} setNote={setNote} spice={spice} setSpice={setSpice} updateCart={updateCart} placeOrder={placeOrder} tableNumber={tableNumber} /></motion.aside></motion.div>}</AnimatePresence>
      <AnimatePresence>{toast && <motion.div className="toast" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 15, opacity: 0 }}><Check size={18} />{toast}</motion.div>}</AnimatePresence>
    </main>
  );
}

function CartContent({ cart, subtotal, parcelCharge, total, parcel, setParcel, note, setNote, spice, setSpice, updateCart, placeOrder, tableNumber }: {
  cart: CartLine[]; subtotal: number; parcelCharge: number; total: number; parcel: boolean; setParcel: (value: boolean) => void; note: string; setNote: (value: string) => void; spice: string; setSpice: (value: string) => void; updateCart: (item: MenuItem, delta: number) => void; placeOrder: () => void; tableNumber?: string;
}) {
  return (
    <div className="cart-content">
      <div className="cart-heading"><div><span>{tableNumber ? `TABLE ${tableNumber}` : "YOUR SELECTION"}</span><h2>Your order</h2></div><ShoppingBag size={21} /></div>
      {!cart.length ? <div className="cart-empty"><div><ShoppingBag size={24} /></div><h3>Your table is ready</h3><p>Add a dish and we&apos;ll keep it right here.</p></div> : <>
        <div className="cart-lines">{cart.map((line) => <div className="cart-line" key={line.id}><div><FoodMark veg={line.veg} /><span><strong>{line.name}</strong><small>₹{line.price} each</small></span></div><div><button onClick={() => updateCart(line, -line.quantity)} aria-label={`Remove ${line.name}`}><Trash2 size={14} /></button><div className="mini-quantity"><button onClick={() => updateCart(line, -1)}><Minus size={12} /></button><span>{line.quantity}</span><button onClick={() => updateCart(line, 1)}><Plus size={12} /></button></div><strong>₹{line.price * line.quantity}</strong></div></div>)}</div>
        <div className="order-options">
          <label><span>Spice level</span><select value={spice} onChange={(event) => setSpice(event.target.value)}><option>Mild</option><option>Medium</option><option>Spicy</option><option>Extra spicy</option></select></label>
          <label><span>Kitchen note</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Allergies or special requests…" rows={2} /></label>
          <label className="parcel-toggle"><input type="checkbox" checked={parcel} onChange={(event) => setParcel(event.target.checked)} /><span><strong>Pack as parcel</strong><small>₹10 per biryani quantity</small></span><i /></label>
        </div>
        <div className="cart-totals"><div><span>Subtotal</span><strong>₹{subtotal}</strong></div>{parcelCharge > 0 && <div><span>Parcel charge</span><strong>₹{parcelCharge}</strong></div>}<div className="grand-total"><span>Total</span><strong>₹{total}</strong></div></div>
        <button className="place-order" onClick={placeOrder}>Place order <span>₹{total}</span><ChevronRight size={18} /></button>
        <p className="order-fineprint">No login needed · Pay after your meal</p>
      </>}
    </div>
  );
}
