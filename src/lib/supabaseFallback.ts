import { MENU_ITEMS, MenuItem, REVIEWS, Review } from "@/data/mockData";
import { useRestaurantStore } from "./store/useRestaurantStore";

// Fallback Database helper utilizing our central Zustand store for absolute real-time sync.
class SupabaseFallbackService {
  private delay(ms: number = 200) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get Menu Items
  async getMenuItems(): Promise<MenuItem[]> {
    await this.delay(100);
    
    // Merge price & availability changes from the store's menuAvailability
    const availability = useRestaurantStore.getState().menuAvailability;
    return MENU_ITEMS.map(item => {
      const override = availability[item.id];
      if (override) {
        return {
          ...item,
          price: override.price > 0 ? override.price : item.price,
          // Note: Availability check is handled in categories filters
        };
      }
      return item;
    });
  }

  // Get Reviews
  async getReviews(): Promise<Review[]> {
    await this.delay(100);
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("athidi_reviews");
      if (stored) return JSON.parse(stored);
    }
    return REVIEWS;
  }

  // Add Review
  async addReview(name: string, rating: number, comment: string): Promise<Review> {
    await this.delay(200);
    const newReview: Review = {
      id: `r-${Date.now()}`,
      name,
      rating,
      comment,
      date: new Date().toLocaleDateString("en-IN"),
      role: "Guest Reviewer"
    };

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("athidi_reviews");
      const current = stored ? JSON.parse(stored) : REVIEWS;
      const updated = [newReview, ...current];
      localStorage.setItem("athidi_reviews", JSON.stringify(updated));
    }
    return newReview;
  }

  // Create Order
  async createOrder(orderData: {
    tableNumber: number;
    items: { menuItemId: string; name: string; quantity: number; price: number; spiceLevel?: number }[];
    totalAmount: number;
    specialInstructions?: string;
    couponCode?: string;
  }) {
    await this.delay(300);

    const spiceLabels = ["Mild", "Medium", "Spicy", "Extra Spicy"];
    const mappedItems = orderData.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      spiceLevel: item.spiceLevel !== undefined ? spiceLabels[item.spiceLevel] : undefined
    }));

    // Trigger state change in the global Zustand store
    const store = useRestaurantStore.getState();
    const orderId = store.placeOrder(orderData.tableNumber, mappedItems, orderData.specialInstructions);

    // Get the newly created order
    const createdOrder = store.orders.find(o => o.id === orderId);

    const orderResponse = {
      id: orderId,
      tableNumber: orderData.tableNumber,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      specialInstructions: orderData.specialInstructions || "",
      couponCode: orderData.couponCode || "",
      status: "Received",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...createdOrder
    };

    return orderResponse;
  }

  // Get Order By ID
  async getOrderById(id: string) {
    await this.delay(100);
    const store = useRestaurantStore.getState();
    const order = store.orders.find((o) => o.id === id);
    if (order) {
      return {
        id: order.id,
        tableNumber: order.tableNumber,
        items: order.items.map((it, idx) => ({
          menuItemId: `item-${idx}`,
          name: it.name,
          quantity: it.quantity,
          price: it.price
        })),
        totalAmount: order.totalAmount,
        status: order.status,
        specialInstructions: order.specialInstructions || "",
        couponCode: order.couponCode || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    return null;
  }

  // Create Service Request (Waiter, Water, Bill, Spoon, Tissue)
  async createServiceRequest(tableNumber: number, type: "waiter" | "water" | "bill" | "spoon" | "tissue") {
    await this.delay(200);

    const store = useRestaurantStore.getState();
    store.addServiceRequest(tableNumber, type);

    const request = store.serviceRequests.find(r => r.tableNumber === tableNumber && r.type === type);

    return {
      id: request?.id || `srv-${Date.now()}`,
      tableNumber,
      type,
      status: "Pending",
      createdAt: new Date().toISOString()
    };
  }
}

export const db = new SupabaseFallbackService();
