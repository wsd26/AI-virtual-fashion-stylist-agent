/**
 * 能力服务层 (C) — 商品与尺码检索服务
 *
 * 负责：商品信息查询、尺码建议、相关性搜索
 */

import { communityProducts, CommunityProduct } from "@/lib/community";

export interface SizeRecommendation {
  productId: string;
  productName: string;
  recommendedSize: string;
  reasoning: string;
  communityConsensus: string;
  confidence: "high" | "medium" | "low";
}

export interface ProductSearchResult {
  product: CommunityProduct;
  relevanceScore: number;
  matchReason: string;
}

/** 查询商品详情 */
export function getProductById(id: string): CommunityProduct | undefined {
  return communityProducts.find((p) => p.id === id);
}

/** 根据条件检索商品 */
export function searchProducts(params: {
  category?: string;
  maxPrice?: number;
  minPrice?: number;
  tags?: string[];
}): ProductSearchResult[] {
  let results = [...communityProducts];

  if (params.category) {
    results = results.filter((p) => p.category === params.category);
  }
  if (params.maxPrice !== undefined) {
    results = results.filter((p) => p.price <= params.maxPrice!);
  }
  if (params.minPrice !== undefined) {
    results = results.filter((p) => p.price >= params.minPrice!);
  }
  if (params.tags?.length) {
    results = results.filter((p) =>
      params.tags!.some((t) => p.tags.some((pt) => pt.includes(t)))
    );
  }

  return results.map((p) => {
    let score = 1;
    if (p.rating >= 4.5) score += 0.5;
    if (p.salesCount > 10000) score += 0.3;
    return { product: p, relevanceScore: score, matchReason: p.tags.slice(0, 3).join("、") };
  });
}

/** 尺码推荐 */
export function recommendSize(
  productId: string,
  userInfo?: { footType?: string; usualSize?: string }
): SizeRecommendation {
  const product = getProductById(productId);
  if (!product) {
    return {
      productId,
      productName: "未知商品",
      recommendedSize: "正码",
      reasoning: "缺少该商品数据",
      communityConsensus: "暂无社区数据",
      confidence: "low",
    };
  }

  const isSneaker = product.category === "sneaker";

  if (!isSneaker) {
    return {
      productId,
      productName: product.name,
      recommendedSize: userInfo?.usualSize || "正码",
      reasoning: "服饰类商品按正常尺码选择",
      communityConsensus: "社区普遍反映正码即可",
      confidence: "high",
    };
  }

  // 鞋类尺码分析
  if (userInfo?.footType === "宽" || userInfo?.footType === "偏宽") {
    return {
      productId,
      productName: product.name,
      recommendedSize: "买大半码",
      reasoning: "AJ1/Dunk 鞋型偏窄，宽脚穿正码可能夹脚",
      communityConsensus: "讨论区老玩家普遍建议宽脚买大半码",
      confidence: "high",
    };
  }

  if (userInfo?.footType === "瘦" || userInfo?.footType === "偏瘦") {
    return {
      productId,
      productName: product.name,
      recommendedSize: "正码",
      reasoning: "脚型偏瘦，正码包裹感刚好",
      communityConsensus: "新批次鞋楦微调后正码即可，新买家普遍反馈正码合适",
      confidence: "high",
    };
  }

  return {
    productId,
    productName: product.name,
    recommendedSize: "正码（不确定时建议试穿）",
    reasoning: "没有脚型数据，无法精准判断",
    communityConsensus: "讨论区存在争议：老玩家建议买大半码，新买家反映正码就行",
    confidence: "medium",
  };
}
