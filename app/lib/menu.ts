export type MenuItem = {
  id: number;
  name: string;
  category: string;
  group: string;
  price: number;
  veg: boolean;
  bestseller?: boolean;
  description: string;
  image: string;
};

export const menuItems: MenuItem[] = [
  {
    id: 1,
    name: "Athidhi Chicken Dum Biryani",
    category: "Biryani",
    group: "Dum Biryani",
    price: 289,
    veg: false,
    bestseller: true,
    description: "Slow-cooked basmati rice, tender chicken and house-ground spices.",
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 2,
    name: "Paneer Tikka",
    category: "Starters",
    group: "Paneer",
    price: 249,
    veg: true,
    bestseller: true,
    description: "Charred cottage cheese, peppers and a smoky yoghurt marinade.",
    image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 3,
    name: "Chicken 65",
    category: "Starters",
    group: "Chicken",
    price: 259,
    veg: false,
    bestseller: true,
    description: "Crisp, fiery chicken tossed with curry leaves and green chilli.",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 4,
    name: "Gobi Manchurian",
    category: "Starters",
    group: "Gobi",
    price: 189,
    veg: true,
    description: "Crisp cauliflower in a tangy Indo-Chinese glaze.",
    image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 5,
    name: "Mutton Dum Biryani",
    category: "Biryani",
    group: "Mutton",
    price: 349,
    veg: false,
    description: "Fragrant basmati layered with succulent mutton and saffron.",
    image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 6,
    name: "Veg Dum Biryani",
    category: "Biryani",
    group: "Veg Fulls",
    price: 219,
    veg: true,
    description: "Seasonal vegetables and basmati rice sealed with aromatic spices.",
    image: "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 7,
    name: "Butter Naan",
    category: "Naans",
    group: "Naans",
    price: 59,
    veg: true,
    description: "Soft tandoor-baked bread brushed with cultured butter.",
    image: "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 8,
    name: "Paneer Butter Masala",
    category: "Curry",
    group: "Veg Curries",
    price: 249,
    veg: true,
    description: "Paneer in a velvety tomato, cashew and butter gravy.",
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 9,
    name: "Andhra Chicken Curry",
    category: "Curry",
    group: "Non-Veg Curries",
    price: 289,
    veg: false,
    description: "A robust regional curry finished with roasted chilli and spices.",
    image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 10,
    name: "Veg Fried Rice",
    category: "Fried Rice",
    group: "Fried Rice",
    price: 179,
    veg: true,
    description: "Wok-tossed rice with garden vegetables and spring onion.",
    image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 11,
    name: "Chicken Fried Rice",
    category: "Fried Rice",
    group: "Fried Rice",
    price: 219,
    veg: false,
    description: "Smoky wok rice with chicken, egg and crisp vegetables.",
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 12,
    name: "Gulab Jamun",
    category: "Others",
    group: "Desserts",
    price: 99,
    veg: true,
    description: "Warm milk dumplings in cardamom and rose syrup.",
    image: "https://images.unsplash.com/photo-1666190094769-7c0b0f35e28d?auto=format&fit=crop&w=900&q=85",
  },
];

export const menuCategories = ["All", "Starters", "Biryani", "Naans", "Curry", "Fried Rice", "Others"];
