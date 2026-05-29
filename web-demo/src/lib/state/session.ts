/**
 * 全局状态中心 (A)
 *
 * 统一托管：
 * - 用户画像
 * - 当前会话状态
 * - 当前商品与候选搭配
 * - 社区证据索引
 * - 试穿结果
 * - 内容草稿与审核状态
 */

import { Scene, Weather, OutfitItem } from "@/types";
import { CommunityContent } from "@/lib/community";

export interface SessionState {
  // 用户画像（继承自 userProfile）
  userProfile: {
    avatarType: "none" | "photo" | "digital";
    skinTone: string;
    bodyType: string;
    style: string;
    gender: string;
    hasPersonImage: boolean;
    personImageUrl?: string;
  };

  // 当前商品上下文
  currentProduct: {
    id: string;
    name: string;
    price: number;
    category: string;
  };

  // 当前场景/天气
  scene: Scene;
  weather: Weather;

  // 候选搭配方案
  outfitCandidates: OutfitItem[][];

  // 社区证据索引（检索到的社区内容引用）
  evidenceIndex: CommunityEvidence[];

  // 试穿结果
  tryOnResults: TryOnResult[];

  // 内容草稿
  draftContent: {
    caption: string;
    tags: string[];
    target: string;
  } | null;

  // 审核状态
  moderationStatus: "pending" | "approved" | "rejected" | null;
}

export interface CommunityEvidence {
  id: string;
  type: "review" | "discussion" | "analysis" | "outfit";
  source: string; // e.g. "@球鞋阿聪", "好物评价"
  claim: string; // the key claim
  confidence: "high" | "medium" | "low";
  originalText: string;
}

export interface TryOnResult {
  productId: string;
  imageUrl: string;
  scene: Scene;
  weather: Weather;
  annotations: string[];
}

export function createDefaultSession(overrides?: Partial<SessionState>): SessionState {
  return {
    userProfile: {
      avatarType: "none",
      skinTone: "未知",
      bodyType: "未知",
      style: "未知",
      gender: "未知",
      hasPersonImage: false,
    },
    currentProduct: {
      id: "aj1-chicago-2025",
      name: "Air Jordan 1 High OG \"Chicago\" 芝加哥",
      price: 1499,
      category: "sneaker",
    },
    scene: "street" as Scene,
    weather: "sunny" as Weather,
    outfitCandidates: [],
    evidenceIndex: [],
    tryOnResults: [],
    draftContent: null,
    moderationStatus: null,
    ...overrides,
  };
}
