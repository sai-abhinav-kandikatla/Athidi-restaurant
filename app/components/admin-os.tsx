/* eslint-disable @next/next/no-img-element */
"use client";

import { Activity, BarChart3, BellRing, ChefHat, ChevronRight, CircleDollarSign, Clock3, CreditCard, LayoutDashboard, LogOut, MenuSquare, MoreHorizontal, Printer, ReceiptIndianRupee, Search, Settings, Sparkles, Store, Table2, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { menuItems } from "../lib/menu";
import { Brand, FoodMark } from "./brand";

type Section = "Overview" | "Kitchen" | "Waiter" | "Checkout" | "Tables" | "Menu" | "Analytics" | "Settings";
type KitchenStatus = "New" | "Preparing" | "Ready" | "Completed";
type KitchenOrder = { id: string; table: number; minutes: number; status: KitchenStatus; items: string[]; priority?: boolean };

const nav: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard }, { label: "Kitchen", icon: ChefHat }, { label: "Waiter", icon: BellRing }, { label: "Checkout", icon: CreditCard }, { label: "Tables", icon: Table2 }, { label: "Menu", icon: MenuSquare }, { label: "Analytics", icon: BarChart3 }, { label: "Settings", icon: Settings },
];

const initialOrders: KitchenOrder[] = [
  { id: "AT-1048", table: 8, minutes: 3, status: "New", items: ["2× Chicken Dum Biryani", "1× Paneer Tikka"], priority: true },
  { id: "AT-1047", table: 3, minutes: 7, status: "New", items: ["1× Veg Dum Biryani", "2× Butter Naan"] },
  { id: "AT-1045", table: 11, minutes: 14, status: "Preparing", items: ["1× Andhra Chicken Curry", "2× Butter Naan"] },
  { id: "AT-1044", table: 5, minutes: 18, status: "Preparing", items: ["2× Chicken 65", "1× Chicken Fried Rice"], priority: true },
  { id: "AT-1042", table: 2, minutes: 22, status: "Ready", items: ["1× Paneer Butter Masala", "3× Butter Naan"] },
  { id: "AT-1040", table: 9, minutes: 31, status: "Completed", items: ["1× Mutton Dum Biryani"] },
];

const requests = [
  { id: 1, table: 12, type: "Bill", time: "1 min", priority: "urgent" },
  { id: 2, table: 8, type: "Waiter", time: "2 min", priority: "high" },
  { id: 3, table: 4, type: "Water", time: "4 min", priority: "normal" },
  { id: 4, table: 7, type: "Spoon", time: "6 min", priority: "normal" },
];
type ServiceRequest = (typeof requests)[number];

export function AdminOS() {
  const [section, setSection] = useState<Section>("Overview");
  const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders);
  const [openRequests, setOpenRequests] = useState(requests);
  const [available, setAvailable] = useState(() => Object.fromEntries(menuItems.map((item) => [item.id, true])) as Record<number, boolean>);
  const [selectedBill, setSelectedBill] = useState(8);
  const [payment, setPayment] = useState("UPI");

  const revenue = 84260;
  const activeOrders = orders.filter((order) => order.status !== "Completed").length;

  function advanceOrder(id: string) {
    const statuses: KitchenStatus[] = ["New", "Preparing", "Ready", "Completed"];
    setOrders((current) => current.map((order) => order.id === id ? { ...order, status: statuses[Math.min(statuses.length - 1, statuses.indexOf(order.status) + 1)] } : order));
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Brand compact />
        <div className="branch-switch"><Store size={17} /><span><small>ACTIVE BRANCH</small><strong>Main Restaurant</strong></span><ChevronRight size={14} /></div>
        <nav aria-label="Operations navigation">{nav.map(({ label, icon: Icon }) => <button key={label} onClick={() => setSection(label)} className={section === label ? "active" : ""}><Icon size={19} /><span>{label}</span>{label === "Kitchen" && <b>{activeOrders}</b>}{label === "Waiter" && openRequests.length > 0 && <b>{openRequests.length}</b>}</button>)}</nav>
        <div className="sidebar-footer"><div className="staff-avatar">AK</div><div><strong>Arjun Kumar</strong><span>Owner</span></div><button aria-label="Sign out"><LogOut size={17} /></button></div>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <div><span className="admin-breadcrumb">ATHIDHI ROS / {section.toUpperCase()}</span><h1>{section === "Overview" ? "Good evening, Arjun." : section}</h1></div>
          <div className="admin-header__actions"><label><Search size={17} /><input placeholder="Search orders, tables…" aria-label="Search operations" /></label><button className="admin-live"><span /> All systems live</button><button className="admin-notification"><BellRing size={19} /><i>{openRequests.length}</i></button></div>
        </header>

        <div className="admin-content">
          {section === "Overview" && <Overview revenue={revenue} orders={orders} requests={openRequests} onSection={setSection} />}
          {section === "Kitchen" && <Kitchen orders={orders} advance={advanceOrder} />}
          {section === "Waiter" && <Waiter requests={openRequests} resolve={(id) => setOpenRequests((current) => current.filter((request) => request.id !== id))} />}
          {section === "Checkout" && <Checkout selected={selectedBill} setSelected={setSelectedBill} payment={payment} setPayment={setPayment} />}
          {section === "Tables" && <Tables />}
          {section === "Menu" && <MenuManager available={available} setAvailable={setAvailable} />}
          {section === "Analytics" && <Analytics />}
          {section === "Settings" && <SettingsPanel />}
        </div>
      </section>
    </main>
  );
}

function Overview({ revenue, orders, requests, onSection }: { revenue: number; orders: KitchenOrder[]; requests: ServiceRequest[]; onSection: (section: Section) => void }) {
  const cards = [
    { label: "Today’s revenue", value: `₹${revenue.toLocaleString("en-IN")}`, trend: "+12.4% vs yesterday", icon: CircleDollarSign },
    { label: "Orders served", value: "186", trend: "+18 today", icon: ReceiptIndianRupee },
    { label: "Active tables", value: "14 / 20", trend: "70% occupancy", icon: Table2 },
    { label: "Average ticket", value: "₹453", trend: "+6.2% this week", icon: Activity },
  ];
  return <>
    <div className="overview-strip"><div><span className="pulse-dot" /><span><strong>Dinner service is in full swing</strong><small>14 tables seated · Kitchen avg. 19 min</small></span></div><button onClick={() => onSection("Kitchen")}>Open kitchen display <ChevronRight size={16} /></button></div>
    <div className="kpi-grid">{cards.map(({ label, value, trend, icon: Icon }) => <article key={label}><div><span>{label}</span><Icon size={18} /></div><strong>{value}</strong><small>{trend}</small></article>)}</div>
    <div className="dashboard-grid">
      <section className="admin-card live-orders"><div className="admin-card__head"><div><h2>Live orders</h2><span>{orders.filter((order) => order.status !== "Completed").length} active right now</span></div><button onClick={() => onSection("Kitchen")}>View kitchen <ChevronRight size={15} /></button></div><div className="order-table"><div className="order-table__head"><span>ORDER</span><span>TABLE</span><span>ITEMS</span><span>TIME</span><span>STATUS</span><span /></div>{orders.filter((order) => order.status !== "Completed").slice(0, 5).map((order) => <div className="order-row" key={order.id}><strong>#{order.id}</strong><span className="table-pill">T{order.table}</span><span>{order.items.join(" · ")}</span><span className={order.minutes > 15 ? "late" : ""}><Clock3 size={14} /> {order.minutes}m</span><span className={`status status--${order.status.toLowerCase()}`}>{order.status}</span><button aria-label={`More options for ${order.id}`}><MoreHorizontal size={17} /></button></div>)}</div></section>
      <section className="admin-card request-card"><div className="admin-card__head"><div><h2>Service requests</h2><span>Live from the dining floor</span></div><button onClick={() => onSection("Waiter")}>View all</button></div><div className="request-list">{requests.map((request) => <div key={request.id} className={`request-row request-row--${request.priority}`}><span className="request-icon">{request.type === "Bill" ? "₹" : request.type.slice(0, 1)}</span><div><strong>Table {request.table} · {request.type}</strong><small>Waiting {request.time}</small></div><ChevronRight size={17} /></div>)}</div></section>
      <section className="admin-card revenue-card"><div className="admin-card__head"><div><h2>Revenue pulse</h2><span>Today by hour</span></div><span className="revenue-total">₹84.2K</span></div><MiniChart /></section>
      <section className="admin-card table-card"><div className="admin-card__head"><div><h2>Dining floor</h2><span>20 tables · 14 occupied</span></div><button onClick={() => onSection("Tables")}>Manage</button></div><div className="mini-tables">{Array.from({ length: 20 }, (_, index) => { const n = index + 1; const cls = [1, 6, 10, 15, 17, 20].includes(n) ? "free" : [8, 12].includes(n) ? "attention" : "occupied"; return <span key={n} className={cls}>{n}</span>; })}</div><div className="table-legend"><span><i className="free" />Available</span><span><i className="occupied" />Dining</span><span><i className="attention" />Needs attention</span></div></section>
    </div>
  </>;
}

function Kitchen({ orders, advance }: { orders: KitchenOrder[]; advance: (id: string) => void }) {
  const statuses: KitchenStatus[] = ["New", "Preparing", "Ready", "Completed"];
  return <div className="kitchen-view"><div className="view-intro"><div><p className="eyebrow eyebrow--maroon"><span /> Kitchen display system</p><h2>Move every plate, right on time.</h2></div><div className="kitchen-metric"><Clock3 /><span><small>AVG. PREP TIME</small><strong>18m 42s</strong></span></div></div><div className="kitchen-board">{statuses.map((status) => <section key={status} className={`kitchen-column kitchen-column--${status.toLowerCase()}`}><header><div><span /> <strong>{status}</strong></div><b>{orders.filter((order) => order.status === status).length}</b></header><div>{orders.filter((order) => order.status === status).map((order) => <article key={order.id} className={order.priority ? "priority" : ""}><div className="ticket-head"><span><strong>TABLE {order.table}</strong><small>#{order.id}</small></span><b className={order.minutes > 15 ? "late" : ""}>{order.minutes}m</b></div><ul>{order.items.map((item) => <li key={item}>{item}</li>)}</ul>{status !== "Completed" && <button onClick={() => advance(order.id)}>{status === "Ready" ? "Mark served" : status === "Preparing" ? "Mark ready" : "Start preparing"}<ChevronRight size={15} /></button>}</article>)}</div></section>)}</div></div>;
}

function Waiter({ requests, resolve }: { requests: ServiceRequest[]; resolve: (id: number) => void }) {
  const priority = { Bill: 1, Waiter: 2, Water: 3, Spoon: 4, Tissue: 5 } as Record<string, number>;
  return <div><div className="view-intro"><div><p className="eyebrow eyebrow--maroon"><span /> Dining room</p><h2>Every request, in priority order.</h2></div><div className="kitchen-metric"><BellRing /><span><small>OPEN REQUESTS</small><strong>{requests.length}</strong></span></div></div><div className="waiter-list">{[...requests].sort((a, b) => priority[a.type] - priority[b.type]).map((request) => <article key={request.id} className={`waiter-request waiter-request--${request.priority}`}><span className="request-rank">0{priority[request.type]}</span><div className="request-icon request-icon--large">{request.type === "Bill" ? "₹" : request.type.slice(0, 1)}</div><div><span>{request.type.toUpperCase()} REQUEST</span><h3>Table {request.table}</h3><p>Guest has been waiting {request.time}</p></div><div className="request-actions"><button onClick={() => resolve(request.id)}>Acknowledge</button><button className="resolve" onClick={() => resolve(request.id)}>Mark resolved <ChevronRight size={15} /></button></div></article>)}{!requests.length && <div className="empty-state"><Sparkles /><h3>Dining room is all clear</h3><p>No open guest requests.</p></div>}</div></div>;
}

function Checkout({ selected, setSelected, payment, setPayment }: { selected: number; setSelected: (table: number) => void; payment: string; setPayment: (value: string) => void }) {
  const bills = [{ table: 8, order: "AT-1048", total: 934, items: 4 }, { table: 12, order: "AT-1043", total: 1268, items: 7 }, { table: 4, order: "AT-1039", total: 642, items: 3 }];
  const bill = bills.find((item) => item.table === selected) ?? bills[0];
  const base = Math.round(bill.total / 1.05); const gst = bill.total - base;
  return <div className="checkout-grid"><section className="admin-card bill-queue"><div className="admin-card__head"><div><h2>Ready to checkout</h2><span>{bills.length} tables requested the bill</span></div></div>{bills.map((item) => <button key={item.table} className={selected === item.table ? "active" : ""} onClick={() => setSelected(item.table)}><span className="table-bubble">T{item.table}</span><span><strong>Table {item.table}</strong><small>#{item.order} · {item.items} items</small></span><strong>₹{item.total}</strong><ChevronRight size={16} /></button>)}</section><section className="admin-card bill-sheet"><div className="bill-brand"><Brand compact /><span>ORDER #{bill.order}</span></div><div className="bill-title"><div><span>CHECKOUT</span><h2>Table {bill.table}</h2></div><span>22 Jul 2026 · 9:18 PM</span></div><div className="bill-lines"><div><span>2 × Athidhi Chicken Dum Biryani</span><strong>₹578</strong></div><div><span>1 × Paneer Tikka</span><strong>₹249</strong></div><div><span>2 × Butter Naan</span><strong>₹118</strong></div></div><div className="bill-summary"><div><span>Subtotal</span><strong>₹{base}</strong></div><div><span>GST (5%)</span><strong>₹{gst}</strong></div><div><span>Round off</span><strong>₹0</strong></div><div><span>Amount due</span><strong>₹{bill.total}</strong></div></div><div className="payment-picker"><span>PAYMENT METHOD</span><div>{["UPI", "Cash", "Card"].map((method) => <button className={payment === method ? "active" : ""} onClick={() => setPayment(method)} key={method}>{method === "UPI" ? <WalletCards /> : method === "Cash" ? <CircleDollarSign /> : <CreditCard />}<strong>{method}</strong>{payment === method && <i>✓</i>}</button>)}</div></div><div className="checkout-actions"><button onClick={() => window.print()}><Printer size={17} /> Print</button><button className="collect">Collect ₹{bill.total} via {payment} <ChevronRight size={17} /></button></div></section></div>;
}

function Tables() {
  const states = ["AVAILABLE", "DINING", "ORDERING", "PREPARING", "READY", "BILL REQUESTED"];
  return <div><div className="view-intro"><div><p className="eyebrow eyebrow--maroon"><span /> Floor management</p><h2>Twenty tables, one clear view.</h2></div><button className="primary-admin-button">+ Add table</button></div><div className="tables-grid">{Array.from({ length: 20 }, (_, i) => { const number = i + 1; const state = [1, 6, 10, 15, 17, 20].includes(number) ? states[0] : number === 12 ? states[5] : number === 8 ? states[4] : number % 3 === 0 ? states[3] : states[1]; return <article key={number} className={`table-tile table-tile--${state.toLowerCase().replace(" ", "-")}`}><div><span>TABLE</span><strong>{String(number).padStart(2, "0")}</strong></div><span className="table-state"><i />{state}</span><p>{state === "AVAILABLE" ? "Ready for guests" : state === "BILL REQUESTED" ? "Bill requested · 1m" : state === "READY" ? "Order ready to serve" : `Seated · ${12 + number}m`}</p><button>View table <ChevronRight size={15} /></button></article>; })}</div></div>;
}

function MenuManager({ available, setAvailable }: { available: Record<number, boolean>; setAvailable: (value: Record<number, boolean>) => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => menuItems.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [query]);
  return <div><div className="view-intro"><div><p className="eyebrow eyebrow--maroon"><span /> Menu management</p><h2>Keep every dish up to date.</h2></div><button className="primary-admin-button">+ Add dish</button></div><section className="admin-card menu-manager"><div className="manager-toolbar"><label><Search size={17} /><input placeholder="Search dishes…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><button>All categories</button><button>All diets</button></div><div className="manager-table"><div className="manager-head"><span>DISH</span><span>CATEGORY</span><span>PRICE</span><span>AVAILABLE</span><span /></div>{filtered.map((item) => <div className="manager-row" key={item.id}><div><img src={item.image} alt="" /><span><strong>{item.name}</strong><small><FoodMark veg={item.veg} /> {item.group}</small></span></div><span>{item.category}</span><strong>₹{item.price}</strong><label className="availability"><input type="checkbox" checked={available[item.id]} onChange={() => setAvailable({ ...available, [item.id]: !available[item.id] })} /><i /></label><button><MoreHorizontal /></button></div>)}</div></section></div>;
}

function Analytics() {
  const dishes = [["Chicken Dum Biryani", 284, "100%"], ["Chicken 65", 192, "68%"], ["Paneer Tikka", 171, "60%"], ["Mutton Dum Biryani", 126, "44%"], ["Veg Fried Rice", 98, "35%"]];
  return <div><div className="view-intro"><div><p className="eyebrow eyebrow--maroon"><span /> Owner analytics</p><h2>A clearer view of the business.</h2></div><button className="primary-admin-button">This week⌄</button></div><div className="analytics-kpis"><article><span>NET REVENUE</span><strong>₹5.84L</strong><small>↑ 14.8% vs last week</small></article><article><span>ORDERS</span><strong>1,284</strong><small>↑ 9.2% vs last week</small></article><article><span>PEAK HOUR</span><strong>8–9 PM</strong><small>214 orders this week</small></article><article><span>TABLE TURNOVER</span><strong>1h 12m</strong><small>↓ 8m improvement</small></article></div><div className="analytics-grid"><section className="admin-card analytics-revenue"><div className="admin-card__head"><div><h2>Revenue performance</h2><span>Last 7 days</span></div><strong>₹5,84,260</strong></div><BigChart /></section><section className="admin-card popular-dishes"><div className="admin-card__head"><div><h2>Popular dishes</h2><span>By quantity sold</span></div></div>{dishes.map(([name, count, width], i) => <div key={name}><span className="dish-rank">0{i + 1}</span><div><strong>{name}</strong><span><i style={{ width }} /></span></div><b>{count}</b></div>)}</section><section className="admin-card efficiency"><div className="admin-card__head"><div><h2>Kitchen efficiency</h2><span>Average prep time by hour</span></div><strong>18m 42s</strong></div><div className="efficiency-bars">{[34, 44, 58, 72, 93, 81, 66, 42].map((height, i) => <div key={i}><i style={{ height: `${height}%` }} /><span>{5 + i}PM</span></div>)}</div></section></div></div>;
}

function SettingsPanel() {
  return <div><div className="view-intro"><div><p className="eyebrow eyebrow--maroon"><span /> Restaurant settings</p><h2>The details behind the service.</h2></div><button className="primary-admin-button">Save changes</button></div><div className="settings-grid"><section className="admin-card settings-form"><h2>Restaurant profile</h2><label>Restaurant name<input defaultValue="Athidhi Family Restaurant" /></label><label>Phone number<input placeholder="Add the official phone number" /></label><label>Address<textarea placeholder="Add the complete restaurant address" rows={3} /></label><div><label>Opens<input defaultValue="11:00 AM" /></label><label>Closes<input defaultValue="11:00 PM" /></label></div></section><section className="admin-card settings-form"><h2>Ordering preferences</h2><label className="setting-switch"><span><strong>QR table ordering</strong><small>Allow guests to order without signing in</small></span><input type="checkbox" defaultChecked /><i /></label><label className="setting-switch"><span><strong>Parcel charge</strong><small>Add ₹10 to every biryani parcel quantity</small></span><input type="checkbox" defaultChecked /><i /></label><label className="setting-switch"><span><strong>Realtime kitchen alerts</strong><small>Notify the kitchen for each new order</small></span><input type="checkbox" defaultChecked /><i /></label></section></div></div>;
}

function MiniChart() { return <div className="mini-chart"><div className="chart-y"><span>20K</span><span>10K</span><span>0</span></div><div className="chart-bars">{[22, 31, 38, 28, 49, 62, 74, 91, 70].map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div><div className="chart-x"><span>12PM</span><span>3PM</span><span>6PM</span><span>9PM</span></div></div>; }
function BigChart() { const values = [54, 62, 58, 72, 69, 88, 96]; return <div className="big-chart" aria-label="Revenue trend rising through the week"><div className="big-chart__grid"><i /><i /><i /><i /></div><div className="big-chart__bars">{values.map((value, index) => <div key={index}><i style={{ height: `${value}%` }}><b /></i></div>)}</div><div className="big-chart__days">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div></div>; }
