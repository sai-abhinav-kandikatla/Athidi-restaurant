import { create } from "zustand";

export interface Table {
  number: number;
  status: "AVAILABLE" | "BROWSING" | "ORDERING" | "ORDER_PLACED" | "PREPARING" | "READY" | "SERVING" | "DINING" | "BILL_REQUESTED" | "COMPLETED" | "CLEANING";
  currentBill: number;
  guestCount: number;
  assignedWaiter?: string;
  section: "Main Hall" | "VIP" | "Outdoor" | "Family" | "AC";
  elapsedMinutes: number;
  x: number; // grid position x
  y: number; // grid position y
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  spiceLevel?: string;
}

export interface Order {
  id: string;
  tableNumber: number;
  items: OrderItem[];
  status: "Received" | "Preparing" | "Ready" | "Served" | "Completed" | "Cancelled";
  specialInstructions?: string;
  couponCode?: string;
  timestamp: string; // HH:MM:SS
  totalAmount: number;
  elapsedSeconds: number; // Elapsed prep time
  expectedMinutes: number; // Target prep time
  chefName?: string;
  station?: string;
  timeline: { status: string; timestamp: string }[];
}

export interface ServiceRequest {
  id: string;
  tableNumber: number;
  type: "water" | "waiter" | "bill" | "spoon" | "tissue";
  status: "pending" | "resolved";
  priority: "critical" | "high" | "medium" | "low";
  createdAt: string; // HH:MM:SS
}

export interface Notification {
  id: string;
  message: string;
  type: "order" | "request" | "kitchen" | "payment";
  priority: "critical" | "high" | "medium" | "low";
  isRead: boolean;
  createdAt: string; // HH:MM:SS
}

export interface MenuItemAvailability {
  id: string;
  available: boolean;
  price: number;
  stock: number;
}

interface RestaurantState {
  tables: Table[];
  orders: Order[];
  serviceRequests: ServiceRequest[];
  notifications: Notification[];
  menuAvailability: { [key: string]: MenuItemAvailability };
  
  // Actions
  hydrate: () => void;
  setTableStatus: (tableNumber: number, status: Table["status"], metadata?: Partial<Table>) => void;
  updateTablePosition: (tableNumber: number, x: number, y: number) => void;
  placeOrder: (tableNumber: number, items: OrderItem[], specialInstructions?: string) => string;
  updateOrderStatus: (orderId: string, status: Order["status"]) => void;
  assignChef: (orderId: string, chefName: string) => void;
  addServiceRequest: (tableNumber: number, type: ServiceRequest["type"]) => void;
  resolveServiceRequest: (requestId: string) => void;
  processPayment: (tableNumber: number, method: string) => void;
  clearTable: (tableNumber: number) => void;
  toggleMenuItemAvailability: (itemId: string) => void;
  updateMenuItemPrice: (itemId: string, price: number) => void;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
  tickPrepTimers: () => void;
}

// Initialise default table layout
const initialTables: Table[] = [
  // Main Hall (Tables 1-8)
  { number: 1, status: "AVAILABLE", currentBill: 0, guestCount: 0, section: "Main Hall", elapsedMinutes: 0, x: 50, y: 50 },
  { number: 2, status: "DINING", currentBill: 860, guestCount: 3, assignedWaiter: "Ramesh", section: "Main Hall", elapsedMinutes: 45, x: 200, y: 50 },
  { number: 3, status: "AVAILABLE", currentBill: 0, guestCount: 0, section: "Main Hall", elapsedMinutes: 0, x: 350, y: 50 },
  { number: 4, status: "AVAILABLE", currentBill: 0, guestCount: 0, section: "Main Hall", elapsedMinutes: 0, x: 500, y: 50 },
  { number: 5, status: "AVAILABLE", currentBill: 0, guestCount: 0, section: "Main Hall", elapsedMinutes: 0, x: 50, y: 180 },
  { number: 6, status: "AVAILABLE", currentBill: 0, guestCount: 0, section: "Main Hall", elapsedMinutes: 0, x: 200, y: 180 },
  { number: 7, status: "AVAILABLE", currentBill: 0, guestCount: 0, section: "Main Hall", elapsedMinutes: 0, x: 350, y: 180 },
  { number: 8, status: "AVAILABLE", currentBill: 0, guestCount: 0, section: "Main Hall", elapsedMinutes: 0, x: 500, y: 180 },
  
  // VIP Section (Tables 9-12)
  { number: 9, status: "PREPARING", currentBill: 1240, guestCount: 4, assignedWaiter: "David", section: "VIP", elapsedMinutes: 20, x: 50, y: 50 },
  { number: 10, status: "AVAILABLE", currentBill: 0, guestCount: 0, section: "VIP", elapsedMinutes: 0, x: 220, y: 50 },
  { number: 11, status: "AVAILABLE", currentBill: 0, guestCount: 0, section: "VIP", elapsedMinutes: 0, x: 50, y: 200 },
  { number: 12, status: "AVAILABLE", currentBill: 0, guestCount: 0, section: "VIP", elapsedMinutes: 0, x: 220, y: 200 },

  // Outdoor Terrace (Tables 13-16)
  { number: 13, status: "BROWSING", currentBill: 0, guestCount: 2, section: "Outdoor", elapsedMinutes: 5, x: 50, y: 50 },
  { number: 14, status: "AVAILABLE", currentBill: 0, guestCount: 0, section: "Outdoor", elapsedMinutes: 0, x: 220, y: 50 },
  { number: 15, status: "AVAILABLE", currentBill: 0, guestCount: 0, section: "Outdoor", elapsedMinutes: 0, x: 50, y: 200 },
  { number: 16, status: "AVAILABLE", currentBill: 0, guestCount: 0, section: "Outdoor", elapsedMinutes: 0, x: 220, y: 200 },

  // AC Family Room (Tables 17-20)
  { number: 17, status: "AVAILABLE", currentBill: 0, guestCount: 0, section: "AC", elapsedMinutes: 0, x: 50, y: 50 },
  { number: 18, status: "AVAILABLE", currentBill: 0, guestCount: 0, section: "AC", elapsedMinutes: 0, x: 220, y: 50 },
  { number: 19, status: "AVAILABLE", currentBill: 0, guestCount: 0, section: "AC", elapsedMinutes: 0, x: 50, y: 200 },
  { number: 20, status: "AVAILABLE", currentBill: 0, guestCount: 0, section: "AC", elapsedMinutes: 0, x: 220, y: 200 }
];

// Initial mock orders
const initialOrders: Order[] = [
  {
    id: "ord-2342",
    tableNumber: 2,
    items: [
      { name: "Athidi Special Chicken Dum Biryani", quantity: 2, price: 379, spiceLevel: "Spicy" },
      { name: "Double Ka Meetha", quantity: 2, price: 149 }
    ],
    status: "Served",
    specialInstructions: "Please make it spicy and serve double ka meetha at the end.",
    timestamp: "07:35:10",
    totalAmount: 1056,
    elapsedSeconds: 1200,
    expectedMinutes: 20,
    chefName: "Abdul",
    station: "Biryani",
    timeline: [
      { status: "Received", timestamp: "07:35:10" },
      { status: "Preparing", timestamp: "07:37:15" },
      { status: "Ready", timestamp: "07:51:30" },
      { status: "Served", timestamp: "07:53:40" }
    ]
  },
  {
    id: "ord-8831",
    tableNumber: 9,
    items: [
      { name: "Kundan Qaliya", quantity: 1, price: 799, spiceLevel: "Medium" },
      { name: "Butter Naan", quantity: 4, price: 69 }
    ],
    status: "Preparing",
    specialInstructions: "Less oil, serve Naan hot.",
    timestamp: "08:05:00",
    totalAmount: 1182,
    elapsedSeconds: 480,
    expectedMinutes: 22,
    chefName: "Vikram",
    station: "Curries",
    timeline: [
      { status: "Received", timestamp: "08:05:00" },
      { status: "Preparing", timestamp: "08:08:12" }
    ]
  }
];

// Initial active requests
const initialRequests: ServiceRequest[] = [
  { id: "req-1", tableNumber: 2, type: "water", status: "pending", priority: "medium", createdAt: "08:08:15" }
];

// Initial notifications
const initialNotifications: Notification[] = [
  { id: "not-1", message: "Table 2 placed a new order.", type: "order", priority: "high", isRead: false, createdAt: "07:35:12" },
  { id: "not-2", message: "Table 2 requested Water.", type: "request", priority: "medium", isRead: false, createdAt: "08:08:15" },
  { id: "not-3", message: "Kitchen completed order for Table 2.", type: "kitchen", priority: "high", isRead: true, createdAt: "07:51:30" }
];

// Set up Broadcast Channel for cross-tab synchronisation
let channel: BroadcastChannel | null = null;
if (typeof window !== "undefined") {
  channel = new BroadcastChannel("athidi_bawarchi_sync");
}

let syncBlocked = false;

const persistStateToStorage = (state: {
  tables?: Table[];
  orders?: Order[];
  serviceRequests?: ServiceRequest[];
  notifications?: Notification[];
  menuAvailability?: { [key: string]: MenuItemAvailability };
}) => {
  if (typeof window !== "undefined") {
    try {
      if (state.tables) localStorage.setItem("athidi_tables", JSON.stringify(state.tables));
      if (state.orders) localStorage.setItem("athidi_orders", JSON.stringify(state.orders));
      if (state.serviceRequests) localStorage.setItem("athidi_requests", JSON.stringify(state.serviceRequests));
      if (state.notifications) localStorage.setItem("athidi_notifications", JSON.stringify(state.notifications));
      if (state.menuAvailability) localStorage.setItem("athidi_menu_availability", JSON.stringify(state.menuAvailability));
    } catch (e) {
      console.error("Local storage persistence error:", e);
    }
  }
};

export const useRestaurantStore = create<RestaurantState>((set, get) => {
  // Sync state helper to trigger BroadcastChannel
  const syncState = (newState: Partial<RestaurantState>) => {
    const fullState = {
      tables: get().tables,
      orders: get().orders,
      serviceRequests: get().serviceRequests,
      notifications: get().notifications,
      menuAvailability: get().menuAvailability,
      ...newState
    };
    persistStateToStorage(fullState);
    if (channel && !syncBlocked) {
      channel.postMessage(JSON.stringify({
        tables: fullState.tables,
        orders: fullState.orders,
        serviceRequests: fullState.serviceRequests,
        notifications: fullState.notifications,
        menuAvailability: fullState.menuAvailability
      }));
    }
  };

  return {
    tables: initialTables,
    orders: initialOrders,
    serviceRequests: initialRequests,
    notifications: initialNotifications,
    menuAvailability: {},

    hydrate: () => {
      if (typeof window !== "undefined") {
        try {
          const storedTables = localStorage.getItem("athidi_tables");
          const storedOrders = localStorage.getItem("athidi_orders");
          const storedRequests = localStorage.getItem("athidi_requests");
          const storedNotifications = localStorage.getItem("athidi_notifications");
          const storedMenuAvailability = localStorage.getItem("athidi_menu_availability");

          const updates: Partial<RestaurantState> = {};
          if (storedTables) updates.tables = JSON.parse(storedTables);
          if (storedOrders) updates.orders = JSON.parse(storedOrders);
          if (storedRequests) updates.serviceRequests = JSON.parse(storedRequests);
          if (storedNotifications) updates.notifications = JSON.parse(storedNotifications);
          if (storedMenuAvailability) updates.menuAvailability = JSON.parse(storedMenuAvailability);

          if (Object.keys(updates).length > 0) {
            syncBlocked = true;
            set(updates);
            syncBlocked = false;
          }
        } catch (e) {
          console.error("Hydration error:", e);
        }
      }
    },

    setTableStatus: (tableNumber, status, metadata = {}) => {
      const isValidTransition = (current: Table["status"], next: Table["status"]): boolean => {
        const allowed: { [key in Table["status"]]: Table["status"][] } = {
          AVAILABLE: ["BROWSING", "ORDERING", "ORDER_PLACED", "CLEANING"],
          BROWSING: ["ORDERING", "AVAILABLE"],
          ORDERING: ["ORDER_PLACED", "AVAILABLE"],
          ORDER_PLACED: ["PREPARING", "AVAILABLE"],
          PREPARING: ["READY", "AVAILABLE"],
          READY: ["SERVING", "AVAILABLE"],
          SERVING: ["DINING"],
          DINING: ["BILL_REQUESTED", "COMPLETED", "CLEANING"],
          BILL_REQUESTED: ["COMPLETED", "CLEANING", "AVAILABLE"],
          COMPLETED: ["CLEANING", "AVAILABLE"],
          CLEANING: ["AVAILABLE"]
        };
        return allowed[current]?.includes(next) ?? true;
      };

      set((state) => {
        const table = state.tables.find((t) => t.number === tableNumber);
        if (table && !isValidTransition(table.status, status)) {
          console.warn(`Table State Machine Blocked Jump: ${table.status} -> ${status}`);
          return {};
        }

        const nextTables = state.tables.map((t) =>
          t.number === tableNumber ? { ...t, status, ...metadata } : t
        );
        const updated = { tables: nextTables };
        syncState(updated);
        return updated;
      });
    },

    updateTablePosition: (tableNumber, x, y) => {
      set((state) => {
        const nextTables = state.tables.map((t) =>
          t.number === tableNumber ? { ...t, x, y } : t
        );
        const updated = { tables: nextTables };
        syncState(updated);
        return updated;
      });
    },

    placeOrder: (tableNumber, items, specialInstructions = "") => {
      const orderId = `ord-${Math.floor(1000 + Math.random() * 9000)}`;
      const timeStr = new Date().toLocaleTimeString("en-IN", { hour12: false });
      const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const newOrder: Order = {
        id: orderId,
        tableNumber,
        items,
        status: "Received",
        specialInstructions,
        timestamp: timeStr,
        totalAmount,
        elapsedSeconds: 0,
        expectedMinutes: 20, // default prep estimation
        timeline: [{ status: "Received", timestamp: timeStr }]
      };

      const newNotification: Notification = {
        id: `not-${Date.now()}`,
        message: `Table ${tableNumber} placed a new order of ₹${totalAmount}.`,
        type: "order",
        priority: "high",
        isRead: false,
        createdAt: timeStr
      };

      set((state) => {
        const nextTables = state.tables.map((t) =>
          t.number === tableNumber
            ? { ...t, status: "ORDER_PLACED" as const, currentBill: totalAmount, guestCount: t.guestCount || 2 }
            : t
        );
        const nextOrders = [newOrder, ...state.orders];
        const nextNotifications = [newNotification, ...state.notifications];

        const updated = {
          tables: nextTables,
          orders: nextOrders,
          notifications: nextNotifications
        };
        syncState(updated);
        
        // Dispatch window event locally for immediate tracking update
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("orderStatusUpdate", { detail: { orderId, status: "Received" } }));
        }

        return updated;
      });

      return orderId;
    },

    updateOrderStatus: (orderId, status) => {
      const timeStr = new Date().toLocaleTimeString("en-IN", { hour12: false });
      set((state) => {
        const order = state.orders.find((o) => o.id === orderId);
        if (!order) return {};

        const nextOrders = state.orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status,
                timeline: [...o.timeline, { status, timestamp: timeStr }]
              }
            : o
        );

        // Map order status to table status
        let tableStatus: Table["status"] = "AVAILABLE";
        const table = state.tables.find((t) => t.number === order.tableNumber);
        if (table) {
          if (status === "Preparing") tableStatus = "PREPARING";
          else if (status === "Ready") tableStatus = "READY";
          else if (status === "Served") tableStatus = "DINING";
          else if (status === "Completed") tableStatus = "COMPLETED";
          else if (status === "Cancelled") tableStatus = "AVAILABLE";
        }

        const nextTables = state.tables.map((t) =>
          t.number === order.tableNumber ? { ...t, status: tableStatus } : t
        );

        let nextNotifications = [...state.notifications];
        if (status === "Ready") {
          nextNotifications = [
            {
              id: `not-${Date.now()}`,
              message: `Kitchen completed Table ${order.tableNumber}'s order.`,
              type: "kitchen",
              priority: "high",
              isRead: false,
              createdAt: timeStr
            },
            ...nextNotifications
          ];
        }

        const updated = {
          orders: nextOrders,
          tables: nextTables,
          notifications: nextNotifications
        };
        syncState(updated);

        // Dispatch window event locally for tracking update
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("orderStatusUpdate", { detail: { orderId, status } }));
        }

        return updated;
      });
    },

    assignChef: (orderId, chefName) => {
      set((state) => {
        const nextOrders = state.orders.map((o) =>
          o.id === orderId ? { ...o, chefName } : o
        );
        const updated = { orders: nextOrders };
        syncState(updated);
        return updated;
      });
    },

    addServiceRequest: (tableNumber, type) => {
      const timeStr = new Date().toLocaleTimeString("en-IN", { hour12: false });
      const requestId = `req-${Date.now()}`;
      
      const priorities: { [key: string]: ServiceRequest["priority"] } = {
        waiter: "high",
        water: "medium",
        bill: "critical",
        spoon: "medium",
        tissue: "low"
      };

      const newRequest: ServiceRequest = {
        id: requestId,
        tableNumber,
        type,
        status: "pending",
        priority: priorities[type] || "medium",
        createdAt: timeStr
      };

      const messages = {
        waiter: `Table ${tableNumber} called a Waiter.`,
        water: `Table ${tableNumber} requested Water.`,
        bill: `Table ${tableNumber} requested the Bill.`,
        spoon: `Table ${tableNumber} requested an Extra Spoon.`,
        tissue: `Table ${tableNumber} requested Extra Tissues.`
      };

      const newNotification: Notification = {
        id: `not-${Date.now()}`,
        message: messages[type],
        type: "request",
        priority: priorities[type],
        isRead: false,
        createdAt: timeStr
      };

      set((state) => {
        const nextRequests = [newRequest, ...state.serviceRequests];
        const nextNotifications = [newNotification, ...state.notifications];

        // Update table state based on request
        const nextTables = state.tables.map((t) => {
          if (t.number === tableNumber) {
            let status = t.status;
            if (type === "bill") status = "BILL_REQUESTED";
            else if (status !== "BILL_REQUESTED" && status !== "PREPARING") {
              status = "BILL_REQUESTED"; // highlight
            }
            return { ...t, status };
          }
          return t;
        });

        const updated = {
          serviceRequests: nextRequests,
          notifications: nextNotifications,
          tables: nextTables
        };
        syncState(updated);
        return updated;
      });
    },

    resolveServiceRequest: (requestId) => {
      set((state) => {
        const req = state.serviceRequests.find((r) => r.id === requestId);
        if (!req) return {};

        const nextRequests = state.serviceRequests.map((r) =>
          r.id === requestId ? { ...r, status: "resolved" as const } : r
        );

        // Check if there are other pending requests for the table
        const hasOtherRequests = nextRequests.some(
          (r) => r.tableNumber === req.tableNumber && r.status === "pending"
        );

        const nextTables = state.tables.map((t) => {
          if (t.number === req.tableNumber && !hasOtherRequests) {
            let status = t.status;
            if (status === "BILL_REQUESTED") {
              status = req.type === "bill" ? "COMPLETED" : t.status;
            } else {
              status = "DINING";
            }
            return { ...t, status };
          }
          return t;
        });

        const updated = {
          serviceRequests: nextRequests,
          tables: nextTables
        };
        syncState(updated);

        // Dispatch window event locally for customer notifications
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("serviceRequestUpdate", { detail: requestId }));
        }

        return updated;
      });
    },

    processPayment: (tableNumber, method) => {
      const timeStr = new Date().toLocaleTimeString("en-IN", { hour12: false });
      set((state) => {
        const table = state.tables.find((t) => t.number === tableNumber);
        if (!table) return {};

        // Find active order to mark completed
        const activeOrder = state.orders.find(
          (o) => o.tableNumber === tableNumber && o.status !== "Completed" && o.status !== "Cancelled"
        );

        const nextOrders = state.orders.map((o) =>
          activeOrder && o.id === activeOrder.id ? { ...o, status: "Completed" as const } : o
        );

        const nextTables = state.tables.map((t) =>
          t.number === tableNumber
            ? { ...t, status: "COMPLETED" as const, currentBill: 0 }
            : t
        );

        const newNotification: Notification = {
          id: `not-${Date.now()}`,
          message: `Payment completed for Table ${tableNumber} (₹${table.currentBill} via ${method.toUpperCase()}).`,
          type: "payment",
          priority: "high",
          isRead: false,
          createdAt: timeStr
        };

        const updated = {
          tables: nextTables,
          orders: nextOrders,
          notifications: [newNotification, ...state.notifications]
        };
        syncState(updated);
        return updated;
      });
    },

    clearTable: (tableNumber) => {
      set((state) => {
        const nextTables = state.tables.map((t) =>
          t.number === tableNumber
            ? { ...t, status: "AVAILABLE" as const, currentBill: 0, guestCount: 0, assignedWaiter: undefined }
            : t
        );

        // Resolve any remaining requests
        const nextRequests = state.serviceRequests.map((r) =>
          r.tableNumber === tableNumber ? { ...r, status: "resolved" as const } : r
        );

        const updated = {
          tables: nextTables,
          serviceRequests: nextRequests
        };
        syncState(updated);
        return updated;
      });
    },

    toggleMenuItemAvailability: (itemId) => {
      set((state) => {
        const current = state.menuAvailability[itemId] || { id: itemId, available: true, price: 0, stock: 100 };
        const updatedAvailability = {
          ...state.menuAvailability,
          [itemId]: { ...current, available: !current.available }
        };
        const updated = { menuAvailability: updatedAvailability };
        syncState(updated);
        return updated;
      });
    },

    updateMenuItemPrice: (itemId, price) => {
      set((state) => {
        const current = state.menuAvailability[itemId] || { id: itemId, available: true, price: 0, stock: 100 };
        const updatedAvailability = {
          ...state.menuAvailability,
          [itemId]: { ...current, price }
        };
        const updated = { menuAvailability: updatedAvailability };
        syncState(updated);
        return updated;
      });
    },

    markNotificationsRead: () => {
      set((state) => {
        const nextNotifications = state.notifications.map((n) => ({ ...n, isRead: true }));
        const updated = { notifications: nextNotifications };
        syncState(updated);
        return updated;
      });
    },

    clearNotifications: () => {
      set({ notifications: [] });
      syncState({ notifications: [] });
    },

    tickPrepTimers: () => {
      set((state) => {
        const nextOrders = state.orders.map((o) => {
          if (o.status === "Preparing" || o.status === "Received") {
            return { ...o, elapsedSeconds: o.elapsedSeconds + 1 };
          }
          return o;
        });
        return { orders: nextOrders };
      });
    }
  };
});

// Setup receiver for BroadcastChannel cross-tab sync
if (channel) {
  channel.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const prevOrders = useRestaurantStore.getState().orders;
      const prevRequests = useRestaurantStore.getState().serviceRequests;

      syncBlocked = true;
      useRestaurantStore.setState({
        tables: data.tables,
        orders: data.orders,
        serviceRequests: data.serviceRequests,
        notifications: data.notifications,
        menuAvailability: data.menuAvailability
      });
      persistStateToStorage(data);
      syncBlocked = false;

      // Dispatch window events locally on status transitions to trigger pages in other tabs
      if (typeof window !== "undefined") {
        data.orders.forEach((newOrder: any) => {
          const oldOrder = prevOrders.find((o) => o.id === newOrder.id);
          if (!oldOrder || oldOrder.status !== newOrder.status) {
            window.dispatchEvent(new CustomEvent("orderStatusUpdate", { detail: { orderId: newOrder.id, status: newOrder.status } }));
          }
        });

        data.serviceRequests.forEach((newReq: any) => {
          const oldReq = prevRequests.find((r) => r.id === newReq.id);
          if (oldReq && oldReq.status !== newReq.status && newReq.status === "resolved") {
            window.dispatchEvent(new CustomEvent("serviceRequestUpdate", { detail: newReq.id }));
          }
        });
      }
    } catch (err) {
      console.error("BroadcastChannel sync parse error:", err);
    }
  };
}
