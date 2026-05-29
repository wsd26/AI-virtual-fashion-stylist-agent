// 消息类型
export interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  card?: TryOnCard | OutfitCards | PublishCard | CombinationTryOnCard | PurchaseCard | PublishSuccessCard;
  timestamp: number;
}

// 试穿场景
export type Scene = "street" | "campus" | "sports" | "cafe" | "festival";
export type Weather = "sunny" | "cloudy" | "rainy" | "snowy" | "sunset";

export interface SceneOption {
  key: Scene;
  label: string;
  icon: string;
}

export interface WeatherOption {
  key: Weather;
  label: string;
  icon: string;
}

// 试穿结果卡片
export interface TryOnCard {
  type: "tryon";
  imageUrl: string;
  annotations: Annotation[];
  activeScene?: Scene;
  activeWeather?: Weather;
}

export const SCENE_OPTIONS: SceneOption[] = [
  { key: "street", label: "街头", icon: "🏙" },
  { key: "campus", label: "校园", icon: "🎓" },
  { key: "sports", label: "运动场", icon: "🏟" },
  { key: "cafe", label: "咖啡店", icon: "☕" },
  { key: "festival", label: "音乐节", icon: "🎵" },
];

export const WEATHER_OPTIONS: WeatherOption[] = [
  { key: "sunny", label: "晴天", icon: "☀️" },
  { key: "cloudy", label: "阴天", icon: "☁️" },
  { key: "rainy", label: "雨天", icon: "🌧" },
  { key: "snowy", label: "雪天", icon: "❄️" },
  { key: "sunset", label: "傍晚", icon: "🌅" },
];

export interface Annotation {
  icon: string;
  text: string;
  source?: string;
}

// 搭配方案卡片
export interface OutfitCards {
  type: "outfit";
  scene: Scene;
  weather: Weather;
  plans: OutfitPlan[];
}

export interface OutfitPlan {
  id: string;
  name: string;
  style: string;
  sceneTip: string;
  items: OutfitItem[];
  referenceUser?: string;
  referenceImage?: string;
  totalPrice: number;
}

export interface OutfitItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  productUrl: string;
  emoji: string;
  isCurrentProduct?: boolean;
  category: string;
}

// 组合试穿卡片
export interface CombinationTryOnCard {
  type: "combination_tryon";
  scene: Scene;
  weather: Weather;
  items: OutfitItem[];
  totalPrice: number;
  annotations: Annotation[];
}

// 发布卡片
export interface PublishCard {
  type: "publish";
  imageUrl: string;
  caption: string;
  tags: string[];
  published?: boolean;
  publishTarget?: string;
  publishStats?: {
    likes: number;
    comments: number;
    shares: number;
  };
  orderNumber?: string;
}

// 购买确认卡片
export interface PurchaseCard {
  type: "purchase";
  items: OutfitItem[];
  totalPrice: number;
  orderNumber: string;
  status: "pending" | "paid";
}

// 发布成功卡片
export interface PublishSuccessCard {
  type: "publish_success";
  caption: string;
  tags: string[];
  target: string;
  likes: number;
  comments: number;
  shares: number;
  imageUrl: string;
}

// 商品信息
export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  images: string[];
  salesCount: number;
  rating: number;
  ratingCount: number;
  category: "sneaker" | "clothing" | "accessory" | "toy";
}

// 对话面板状态
export type PanelState = "hidden" | "half" | "full";
