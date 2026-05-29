import { Product } from "@/types";

export const mockProduct: Product = {
  id: "aj1-chicago-2025",
  name: 'Air Jordan 1 High OG "Chicago" 芝加哥',
  brand: "Nike",
  price: 1499,
  images: [
    "https://picsum.photos/seed/shoe1/400/400",
    "https://picsum.photos/seed/shoe2/400/400",
    "https://picsum.photos/seed/shoe3/400/400",
  ],
  salesCount: 23800,
  rating: 4.8,
  ratingCount: 12600,
  category: "sneaker",
};

// 预生成的试穿效果图
export const tryOnImages: Record<string, string> = {
  aj1: "https://picsum.photos/seed/tryon-aj1/400/500",
  dunk: "https://picsum.photos/seed/tryon-dunk/400/500",
  hoodie: "https://picsum.photos/seed/tryon-hoodie/400/500",
};

// 搭子产品名称
export const AGENT_NAME = "穿搭搭子";
