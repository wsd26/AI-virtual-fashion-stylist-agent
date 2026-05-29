/**
 * 按需唤醒的子 Agent (D) — 搭配探索 Agent
 *
 * 职责：
 * - 当需要同时生成多风格、多场景搭配时被主 Agent 唤醒
 * - 并行探索不同风格路径（校园风、运动风、街头风等）
 * - 返回多条搭配路径供主 Agent 选择或组合
 *
 * 设计理由（面试用）：
 * - 并行探索：单一 Agent 串行思考会限制多样性
 *   多条路径独立探索，避免 "锚定效应"
 * - 风格解耦：每条路径独立评估场景适配度
 *   避免一套方案在不同场景间折衷妥协
 */

import { Scene, Weather, OutfitPlan, OutfitItem } from "@/types";
import { CommunityContent, communityProducts } from "@/lib/community";
import { mockProduct } from "@/lib/mock";
import { rankOutfits, ScoredOutfitPlan } from "@/lib/services/outfit";

export interface ExplorationRequest {
  scene: Scene;
  weather: Weather;
  currentProduct: OutfitItem;
  userProfile?: {
    style: string;
    bodyType: string;
    gender: string;
  } | null;
  styleDirections: string[]; // 要探索的风格方向
}

export interface ExplorationResult {
  style: string;
  scene: Scene;
  weather: Weather;
  plans: ScoredOutfitPlan[];
  suitability: "excellent" | "good" | "acceptable";
  reasoning: string;
}

/**
 * 搭配探索主函数
 *
 * 对每条风格路径独立运行搭配排序，
 * 模拟"并行探索"。
 */
export function exploreOutfits(req: ExplorationRequest): ExplorationResult[] {
  const { scene, weather, currentProduct, userProfile, styleDirections } = req;

  const results: ExplorationResult[] = [];

  for (const style of styleDirections) {
    // 每条路径独立调用搭配排序服务
    const scoredPlans = rankOutfits({
      scene,
      weather,
      userProfile: userProfile
        ? { ...userProfile, style }
        : { style, bodyType: "未知", gender: "未知" },
      currentProduct,
      limit: 3,
    });

    // 评估该风格在此场景的适配度
    const avgScore = scoredPlans.length
      ? scoredPlans.reduce((s, p) => s + p.score, 0) / scoredPlans.length
      : 0;

    const suitability =
      avgScore >= 8 ? "excellent" : avgScore >= 5 ? "good" : "acceptable";

    results.push({
      style,
      scene,
      weather,
      plans: scoredPlans,
      suitability,
      reasoning: buildReasoning(style, scene, weather, suitability, avgScore),
    });
  }

  // 按适配度排序
  const order = { excellent: 0, good: 1, acceptable: 2 };
  results.sort((a, b) => order[a.suitability] - order[b.suitability]);

  return results;
}

function buildReasoning(
  style: string,
  scene: Scene,
  weather: Weather,
  suitability: string,
  score: number
): string {
  const sceneLabel = { street: "街头", campus: "校园", sports: "运动场", cafe: "咖啡店", festival: "音乐节" }[scene];
  const weatherLabel = { sunny: "晴天", cloudy: "阴天", rainy: "雨天", snowy: "雪天", sunset: "傍晚" }[weather];

  const templates: Record<string, string> = {
    excellent: `${style}风格在${sceneLabel}·${weatherLabel}场景下匹配度很高，社区有多套高赞参考。`,
    good: `${style}风格在${sceneLabel}·${weatherLabel}场景下可以驾驭，但需要注意单品选择。`,
    acceptable: `${style}风格在${sceneLabel}·${weatherLabel}场景下需要调整，建议混搭。`,
  };

  return templates[suitability] || `综合评分 ${score.toFixed(1)}，建议参考社区穿搭进行调整。`;
}

function dewuUrl(id: string): string {
  return `https://www.dewu.com/product/${id}`;
}

/** 内联 SVG 占位图（不依赖外部 CDN） */
function placeholderSvg(label: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="${bg}" width="200" height="200"/><text fill="white" font-size="20" font-family="sans-serif" text-anchor="middle" x="100" y="108">${label}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/** 判断单品是否为裤子/下装 */
function isBottom(item: CommunityContent | { tags?: string[]; name?: string }): boolean {
  const tags = "tags" in item ? item.tags || [] : [];
  const name = "name" in item ? (item.name || "") : "";
  const keywords = ["裤", "裙", "短裤", "牛仔裤", "工装裤", "cargo", "pants", "半裙", "长裤"];
  return keywords.some((k) => name.includes(k) || tags.some((t) => t.includes(k)));
}

/** 生成搭配方案（复用 rankOutfits，与 LLM 文字方案同源） */
export function generateOutfitPlans(
  scene: Scene,
  weather: Weather,
  profile?: { avatarType: string; skinTone: string; bodyType: string; style: string; gender: string } | null
): OutfitPlan[] {
  const currentProduct: OutfitItem = {
    id: mockProduct.id,
    name: mockProduct.name,
    price: mockProduct.price,
    imageUrl: mockProduct.images[0],
    productUrl: dewuUrl(mockProduct.id),
    emoji: "👟",
    isCurrentProduct: true,
    category: "鞋履",
  };

  const sceneLabel = SCENE_LABELS[scene] || "街头";
  const weatherLabel = WEATHER_LABELS[weather] || "晴天";

  // 用 rankOutfits 获取与 LLM 文字同源的评分搭配
  const directions = suggestStyleDirections(scene, weather);
  const exploration = exploreOutfits({
    scene,
    weather,
    currentProduct,
    userProfile: profile
      ? { style: profile.style, bodyType: profile.bodyType, gender: profile.gender }
      : null,
    styleDirections: directions,
  });

  // 从探索结果中提取 top 3 搭配方案（跨风格取最佳）
  const allPlans: { plan: ScoredOutfitPlan; suitability: string; style: string }[] = [];
  for (const result of exploration) {
    for (const p of result.plans) {
      allPlans.push({ plan: p, suitability: result.suitability, style: result.style });
    }
  }
  allPlans.sort((a, b) => b.plan.score - a.plan.score);
  const top3 = allPlans.slice(0, 3);

  const tops = communityProducts.filter((p) => p.category === "clothing" && !isBottom(p));
  const bottoms = communityProducts.filter((p) => p.category === "clothing" && isBottom(p));
  const accessories = communityProducts.filter((p) => p.category === "accessory");

  const plans: OutfitPlan[] = top3.map((entry, i) => {
    const scored = entry.plan;
    const ref = scored.communityRefs?.[0];

    // 按索引选择不同单品，避免三套方案完全一样
    const top = tops[i % tops.length];
    const bottom = bottoms[i % bottoms.length];
    const accessory = accessories[i % accessories.length];

    const items: OutfitItem[] = [];

    // 上装
    if (top) {
      items.push({ id: top.id, name: top.name, price: top.price, imageUrl: top.images[0], productUrl: dewuUrl(top.id), emoji: "🧥", category: "上装" });
    } else {
      items.push({ id: "basic-tee", name: "重磅纯棉T恤", price: 129, imageUrl: placeholderSvg("Tee", "#ef4444"), productUrl: dewuUrl("basic-tee"), emoji: "🧥", category: "上装" });
    }

    // 下装
    if (bottom) {
      items.push({ id: bottom.id, name: bottom.name, price: bottom.price, imageUrl: bottom.images[0], productUrl: dewuUrl(bottom.id), emoji: "👖", category: "下装" });
    } else {
      items.push({ id: "basic-pants", name: "直筒休闲裤", price: 299, imageUrl: placeholderSvg("Pants", "#3b82f6"), productUrl: dewuUrl("basic-pants"), emoji: "👖", category: "下装" });
    }

    // 鞋子（当前商品）
    items.push(currentProduct);

    // 配饰
    if (accessory) {
      items.push({ id: accessory.id, name: accessory.name, price: accessory.price, imageUrl: accessory.images[0], productUrl: dewuUrl(accessory.id), emoji: "💎", category: "配饰" });
    }

    return {
      id: `outfit-${scene}-${i + 1}`,
      name: scored.plan.name || `${entry.style}路线`,
      style: scored.plan.style || entry.style,
      sceneTip: ref
        ? `${ref.authorName} · ${sceneLabel}${weatherLabel} · ${ref.likes}赞`
        : `${entry.style} · ${sceneLabel}${weatherLabel}`,
      referenceUser: ref?.authorName || "",
      referenceImage: "👤",
      items,
      totalPrice: items.reduce((sum, item) => sum + item.price, 0),
    };
  });

  // 用户形象排序
  if (profile && profile.avatarType !== "none") {
    const userStyle = profile.style;
    const styleMap: Record<string, string[]> = {
      "街头": ["street", "og", "街头", "美式"],
      "日系": ["city", "日系", "japanese"],
      "Clean Fit": ["clean", "简约", "质感"],
      "韩系": ["韩系", "温柔", "korean"],
      "甜酷": ["甜酷", "y2k", "girl"],
      "机能": ["机能", "户外", "gorpcore"],
    };

    const scored = plans.map((plan) => {
      let score = 0;
      const lowerName = (plan.name + plan.style).toLowerCase();
      if (profile.gender === "女" && (lowerName.includes("girl") || lowerName.includes("甜酷") || lowerName.includes("韩系"))) score += 3;
      if (profile.gender === "男" && (lowerName.includes("og") || lowerName.includes("街头") || lowerName.includes("日系"))) score += 3;
      for (const [styleKey, keywords] of Object.entries(styleMap)) {
        if (userStyle.includes(styleKey) || styleKey.includes(userStyle)) {
          for (const kw of keywords) {
            if (lowerName.includes(kw.toLowerCase())) score += 3;
          }
        }
      }
      return { plan, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map(({ plan }) => plan);
  }

  return plans;
}

const SCENE_LABELS: Record<string, string> = {
  street: "街头", campus: "校园", sports: "运动", cafe: "咖啡店", festival: "音乐节",
};
const WEATHER_LABELS: Record<string, string> = {
  sunny: "晴天", cloudy: "阴天", rainy: "雨天", snowy: "雪天", sunset: "傍晚",
};

/** 根据场景+天气推荐应该探索的风格方向 */
export function suggestStyleDirections(scene: Scene, weather: Weather): string[] {
  const defaultDirections: Record<string, string[]> = {
    street: ["街头", "Clean Fit", "日系"],
    campus: ["休闲", "日系", "街头"],
    sports: ["运动休闲", "街头", "机能"],
    cafe: ["Clean Fit", "韩系", "日系"],
    festival: ["撞色", "街头", "甜酷"],
  };

  // 雨天加强机能风
  const base = defaultDirections[scene] || ["街头", "Clean Fit", "日系"];
  if (weather === "rainy" && !base.includes("机能")) {
    base.push("机能");
  }

  return base;
}
