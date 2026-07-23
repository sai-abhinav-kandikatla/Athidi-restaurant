export type OrderStatus =
  | "PLACED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "BILLED"
  | "PAID"
  | "CANCELLED";

export type TableState =
  | "AVAILABLE"
  | "BROWSING"
  | "ORDERING"
  | "ORDER_PLACED"
  | "PREPARING"
  | "READY"
  | "DINING"
  | "BILL_REQUESTED"
  | "PAID"
  | "CLEANING";

export type MenuCategory = {
  id: string;
  restaurant_id: string;
  name: string;
  slug: string;
  sort_order: number;
  active: boolean;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  is_veg: boolean;
  available: boolean;
  bestseller: boolean;
  image_url: string | null;
  sort_order: number;
  category?: Pick<MenuCategory, "id" | "name" | "slug"> | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  is_parcel: boolean;
  parcel_charge: number;
  notes: string | null;
  line_total: number;
};

export type RestaurantOrder = {
  id: string;
  order_number: number;
  branch_id: string;
  table_session_id: string;
  status: OrderStatus;
  subtotal: number;
  parcel_charge: number;
  tax: number;
  total: number;
  notes: string | null;
  spice_level: string | null;
  placed_at: string;
  accepted_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  billed_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  order_items?: OrderItem[];
  table_session?: {
    id: string;
    table?: { id: string; number: number } | null;
  } | null;
};

export type DiningTable = {
  id: string;
  branch_id: string;
  section_id: string | null;
  number: number;
  capacity: number;
  qr_token: string;
  state: TableState;
};

export type ServiceRequest = {
  id: string;
  branch_id: string;
  table_session_id: string;
  request_type: "BILL" | "WAITER" | "WATER" | "SPOON" | "TISSUE";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  priority: number;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  table_session?: {
    table?: { id: string; number: number } | null;
  } | null;
};

export type Payment = {
  id: string;
  order_id: string;
  method: "UPI" | "CASH" | "CARD";
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  created_at: string;
};

export type StaffIdentity = {
  id: string;
  fullName: string;
  restaurantId: string;
  branchId: string;
  branchName: string;
  roleName: string;
  permissions: Record<string, boolean>;
};
