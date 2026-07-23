import type { MenuCategory, MenuItem } from "./restaurant-types";

export type { MenuCategory, MenuItem };

export const defaultMenuImage =
  "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85";

export function itemCategory(item: MenuItem): string {
  return item.category?.name ?? "Other";
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function normalizeMenuItem(item: MenuItem): MenuItem {
  return {
    ...item,
    price: Number(item.price),
    sort_order: Number(item.sort_order),
  };
}

export function normalizeCategories(categories: MenuCategory[]): MenuCategory[] {
  return [...categories].sort(
    (left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name),
  );
}
