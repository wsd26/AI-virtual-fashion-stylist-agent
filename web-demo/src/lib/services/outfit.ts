/**
 * 能力服务层 (C) — 搭配排序服务
 *
 * 负责：根据场景 × 天气 × 用户画像 对搭配方案进行评分和排序
 */

import { Scene, Weather, OutfitPlan, OutfitItem } from "@/types";
import { communityProducts } from "@/lib/community";
import { recallOutfits } from "./community";
import { CommunityContent } from "@/lib/community";

interface RankingInput {
  scene: Scene;
  weather: Weather;
  userProfile?: {
    style: string;
    bodyType: string;
    gender: string;
  } | null;
  currentProduct: OutfitItem;
  limit?: number;
}

interface ScoredOutfitPlan {
  plan: OutfitPlan;
  score: number;
  scoreBreakdown: {
    sceneMatch: number;
    weatherMatch: number;
    styleMatch: number;
    communityPopularity: number;
    priceMatch: number;
  };
  communityRefs: CommunityRef[];
}

interface CommunityRef {
  contentId: string;
  authorName: string;
  likes: number;
  snippet: string;
}

/** 场景适配权重 */
const SCENE_WEIGHTS: Record<Scene, Record<string, number>> = {
  street: { "街头": 3, "美式": 2, "日系": 1, "机能": 2 },
  campus: { "休闲": 3, "校园": 3, "日系": 2, "Clean Fit": 2 },
  sports: { "运动": 3, "街头": 2, "机能": 2 },
  cafe: { "Clean Fit": 3, "韩系": 3, "日系": 2, "简约": 2 },
  festival: { "撞色": 3, "Y2K": 2, "街头": 2, "音乐节": 3, "甜酷": 2 },
};

/** 天气适配权重 */
const WEATHER_WEIGHTS: Record<Weather, Record<string, number>> = {
  sunny: { "轻薄": 2, "短裤": 1, "浅色": 1 },
  cloudy: { "百搭": 1 },
  rainy: { "防水": 3, "机能": 3, "冲锋衣": 3, "速干": 2 },
  snowy: { "保暖": 3, "厚": 2, "羽绒": 3 },
  sunset: { "拍照": 2, "约会": 2, "质感": 2 },
};

/** 搭配排序主函数 */
export function rankOutfits(input: RankingInput): ScoredOutfitPlan[] {
  const { scene, weather, userProfile, currentProduct, limit = 3 } = input;

  // 从社区召回穿搭引用
  const communityOutfits = recallOutfits({
    productId: currentProduct.id,
    scene,
    weather,
    limit: 10,
  });

  // 基于社区内容生成搭配方案
  const scored: ScoredOutfitPlan[] = communityOutfits
    .slice(0, limit * 2)
    .map((co, idx) => {
      const plan = buildOutfitPlanFromCommunity(co, currentProduct, idx);
      const breakdown = scorePlan(plan, scene, weather, userProfile, co);
      const totalScore = Object.values(breakdown).reduce((a, b) => a + b, 0);

      return {
        plan,
        score: totalScore,
        scoreBreakdown: breakdown,
        communityRefs: [
          {
            contentId: co.id,
            authorName: co.authorId,
            likes: co.likes,
            snippet: co.body.slice(0, 100),
          },
        ],
      };
    });

  // 按分数降序排列
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/** 从社区内容构建搭配方案 */
function buildOutfitPlanFromCommunity(
  content: CommunityContent,
  currentProduct: OutfitItem,
  idx: number
): OutfitPlan {
  const clothing = communityProducts.filter((p) => p.category === "clothing");
  const accessories = communityProducts.filter((p) => p.category === "accessory");

  const topItem = clothing[idx % clothing.length];
  const accItem = accessories[idx % accessories.length];

  const items: OutfitItem[] = [
    topItem
      ? { id: topItem.id, name: topItem.name, price: topItem.price, imageUrl: topItem.images[0], productUrl: "#", emoji: "🧥", category: "上装" }
      : { id: "basic-top", name: "基础款上装", price: 199, imageUrl: "", productUrl: "#", emoji: "🧥", category: "上装" },
    { id: "basic-pants", name: "直筒休闲裤", price: 349, imageUrl: "", productUrl: "#", emoji: "👖", category: "下装" },
    currentProduct,
  ];

  if (accItem) {
    items.push({ id: accItem.id, name: accItem.name, price: accItem.price, imageUrl: accItem.images[0], productUrl: "#", emoji: "💎", category: "配饰" });
  }

  return {
    id: `ranked-${content.id}`,
    name: content.style ? `${content.style}路线` : "社区精选",
    style: content.tags[0] || "百搭风",
    sceneTip: content.body.slice(0, 50),
    referenceUser: content.authorId,
    referenceImage: "",
    items,
    totalPrice: items.reduce((sum, i) => sum + i.price, 0),
  };
}

/** 打分 */
function scorePlan(
  plan: OutfitPlan,
  scene: Scene,
  weather: Weather,
  userProfile?: RankingInput["userProfile"],
  community?: CommunityContent
): ScoredOutfitPlan["scoreBreakdown"] {
  const name = plan.name + plan.style;
  let sceneMatch = 1;
  let weatherMatch = 1;
  let styleMatch = userProfile?.style && plan.style.includes(userProfile.style) ? 3 : 1;
  let communityPopularity = community ? Math.min(community.likes / 1000, 5) : 1;
  let priceMatch = plan.totalPrice < 2500 ? 2 : 1;

  // 场景匹配
  const sw = SCENE_WEIGHTS[scene] || {};
  for (const [kw, w] of Object.entries(sw)) {
    if (name.includes(kw)) sceneMatch = Math.max(sceneMatch, w);
  }

  // 天气匹配
  const ww = WEATHER_WEIGHTS[weather] || {};
  for (const [kw, w] of Object.entries(ww)) {
    if (name.includes(kw)) weatherMatch = Math.max(weatherMatch, w);
  }

  return { sceneMatch, weatherMatch, styleMatch, communityPopularity, priceMatch };
}

export type { ScoredOutfitPlan };
