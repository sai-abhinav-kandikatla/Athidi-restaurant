import rawMenuData from "./a9_bawarchi_menu.json";

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string; // Lucide icon name representation
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string; // category slug
  image: string;
  prepTime: number; // in minutes
  isVeg: boolean;
  isBestSeller: boolean;
  isChefSpecial: boolean;
  isTodaysSpecial: boolean;
  isKids: boolean;
  spiceLevel: number; // 0 to 3
  rating: number;
  reviewsCount: number;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
  role: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export const CATEGORIES: Category[] = [
  { id: "cat-1", name: "Chef Specials", slug: "chef-specials", icon: "Crown" },
  { id: "cat-2", name: "Biryani", slug: "biryani", icon: "ChefHat" },
  { id: "cat-3", name: "Starters", slug: "starters", icon: "Flame" },
  { id: "cat-4", name: "Chicken Curries", slug: "chicken-curries", icon: "UtensilsCrossed" },
  { id: "cat-5", name: "Veg Curries", slug: "veg-curries", icon: "Salad" },
  { id: "cat-6", name: "Mutton Curries", slug: "mutton-curries", icon: "Utensils" },
  { id: "cat-7", name: "Seafood", slug: "seafood", icon: "Fish" },
  { id: "cat-8", name: "Naans & Breads", slug: "indian-breads", icon: "Cookie" },
  { id: "cat-9", name: "Fried Rice", slug: "rice-fried-rice", icon: "Soup" },
  { id: "cat-10", name: "Others & Drinks", slug: "beverages", icon: "GlassWater" }
];

// Helper to map category name to category slug
const categoryToSlug: { [key: string]: string } = {
  "Chef Specials": "chef-specials",
  "Biryani": "biryani",
  "Starters": "starters",
  "Chicken Curries": "chicken-curries",
  "Veg Curries": "veg-curries",
  "Mutton Curries": "mutton-curries",
  "Seafood": "seafood",
  "Indian Breads": "indian-breads",
  "Rice & Fried Rice": "rice-fried-rice",
  "Beverages": "beverages"
};

// Helper to map spice level string to number (0 to 3)
const spiceToNumber = (spice: string): number => {
  switch (spice) {
    case "Mild": return 0;
    case "Medium": return 2;
    case "Hot": return 3;
    default: return 0;
  }
};

export const MENU_ITEMS: MenuItem[] = (rawMenuData as any[]).map((item, index) => {
  // Generate deterministic rating (4.5 to 5.0) and review counts for visual richness
  const rating = 4.5 + parseFloat(((index * 7) % 5).toFixed(1)) * 0.1;
  const reviewsCount = 30 + ((index * 23) % 450);

  // Kids friendly check (Desserts, Beverages, Soups, Salads, Breads, or Mild spice)
  const isKids = 
    item.category === "Desserts" || 
    item.category === "Beverages" || 
    item.category === "Indian Breads" || 
    item.spiceLevel === "Mild" ||
    item.name.toLowerCase().includes("kid") ||
    item.name.toLowerCase().includes("sweet");

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: categoryToSlug[item.category] || "chef-specials",
    image: item.image,
    prepTime: item.preparationTime,
    isVeg: item.veg,
    isBestSeller: item.bestSeller,
    isChefSpecial: item.chefSpecial,
    isTodaysSpecial: item.todaysSpecial,
    isKids: isKids,
    spiceLevel: spiceToNumber(item.spiceLevel),
    rating: parseFloat(rating.toFixed(2)),
    reviewsCount: reviewsCount
  };
});

export const REVIEWS: Review[] = [
  {
    id: "r-1",
    name: "Aditya Roy Kapur",
    rating: 5,
    comment: "The Royal Mutton Dum Biryani is absolutely sensational. The meat was fall-off-the-bone tender, and the saffron flavor was delicate yet deeply satisfying. Truly a majestic experience!",
    date: "14-07-2026",
    role: "Verified Foodie"
  },
  {
    id: "r-2",
    name: "Dr. Ananya Sen",
    rating: 5,
    comment: "Stunning experience. Ordered the Truffle Dal Makhani Gold Edition and it literally melted. The edible gold foil made it feel incredibly regal. Fast service and wonderful presentation.",
    date: "10-07-2026",
    role: "Regular Guest"
  },
  {
    id: "r-3",
    name: "Vikram Malhotra",
    rating: 5,
    comment: "Athidi has redefined fine dining in Hyderabad. The digital QR menu is smoother than any app I've used. Beautiful food visuals, and excellent service.",
    date: "05-07-2026",
    role: "UI/UX Director"
  },
  {
    id: "r-4",
    name: "Sarah D'Souza",
    rating: 4,
    comment: "Lovely ambiance and delicious Pathar Ka Gosht! Using the digital system to request water or call the waiter makes dining so much more relaxing. Highly recommend the desserts too.",
    date: "28-06-2026",
    role: "Food Blogger"
  }
];

export const FAQS: FAQ[] = [
  {
    question: "Do I need to sign up or log in to order?",
    answer: "No. Our digital dining experience is designed to be frictionless. Simply scan the QR code on your table, choose your dishes, and place your order directly. Your session is tied to your table number automatically."
  },
  {
    question: "How long does it take for the food to arrive?",
    answer: "Each item has an estimated preparation time shown on the card (typically 15-30 minutes). Once you order, you can view the live progress of your dishes: Received, Preparing, Ready, Serving, and Delivered."
  },
  {
    question: "Can I customize the spiciness or add special instructions?",
    answer: "Yes. When viewing an item, you can select its spice level, and inside your shopping cart, you can add specific instructions (e.g., 'no onions', 'extra spicy', 'allergy alert') which will be sent directly to the kitchen."
  },
  {
    question: "How do I request water, call a waiter, or pay the bill?",
    answer: "At the bottom of your screen, there is a dedicated 'Service' button. Click it to immediately request water, call a waiter, or request the bill. You can also view your live bill total directly in the app."
  },
  {
    question: "What payment methods are supported?",
    answer: "You can pay digitally via UPI, Credit/Debit cards, Net Banking, or pay directly by cash/card with the waiter when they serve your order."
  }
];
