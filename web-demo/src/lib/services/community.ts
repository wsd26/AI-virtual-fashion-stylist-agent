/**
 * 能力服务层 (C) — 社区内容召回服务
 *
 * 负责：按商品/场景/风格检索社区穿搭帖、评价、讨论、玩家说
 * 这是对 lib/community.ts 数据引擎的服务层封装
 */

import {
  getContentByProduct,
  getOutfitsBySceneWeather,
  getOutfitsByStyle,
  getReviews,
  getDiscussions,
  getAnalyses,
  buildOutfitReference,
  buildCommunityContext,
  getCommunityStats,
  CommunityContent,
} from "@/lib/community";
import { Scene, Weather } from "@/types";

export interface CommunityRecallResult {
  outfits: CommunityContent[];
  reviews: CommunityContent[];
  discussions: CommunityContent[];
  analyses: CommunityContent[];
  stats: ReturnType<typeof getCommunityStats>;
}

/** 召回某个商品的全部社区内容 */
export function recallByProduct(productId: string): CommunityRecallResult {
  return {
    outfits: getContentByProduct(productId).filter((c) => c.type === "outfit"),
    reviews: getReviews(productId),
    discussions: getDiscussions(productId),
    analyses: getAnalyses(productId),
    stats: getCommunityStats(productId),
  };
}

/** 场景 × 天气 × 风格 多维召回穿搭内容 */
export function recallOutfits(params: {
  productId?: string;
  scene?: Scene;
  weather?: Weather;
  style?: string;
  limit?: number;
}) {
  let results = params.productId
    ? getContentByProduct(params.productId).filter((c) => c.type === "outfit")
    : [];

  if (params.scene && params.weather) {
    const sceneWeatherResults = getOutfitsBySceneWeather(params.scene, params.weather);
    if (params.productId) {
      const ids = new Set(results.map((r) => r.id));
      results = [...results, ...sceneWeatherResults.filter((r) => !ids.has(r.id))];
    } else {
      results = sceneWeatherResults;
    }
  }

  if (params.style) {
    const styleResults = getOutfitsByStyle(params.style);
    const ids = new Set(results.map((r) => r.id));
    results = [...results, ...styleResults.filter((r) => !ids.has(r.id))];
  }

  return results.slice(0, params.limit || 10);
}

/** 生成社区上下文（供 Agent System Prompt 使用） */
export function generateContext(productId: string): string {
  return buildCommunityContext(productId);
}

/** 生成搭配引用 */
export function generateReferences(productId: string, scene?: Scene, weather?: Weather, style?: string) {
  return buildOutfitReference(productId, style, scene, weather);
}

export type { CommunityContent };
