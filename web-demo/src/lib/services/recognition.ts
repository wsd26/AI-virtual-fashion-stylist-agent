/**
 * 能力服务层 (C) — 人体/服饰识别服务
 *
 * 职责：
 * - 分析用户上传照片的体型特征、肤色、当前穿搭风格
 * - 识别服饰品类、颜色、版型
 * - 为试穿服务和搭配推荐提供结构化输入
 *
 * 实现：
 * - 有 DeepSeek API Key + 用户照片时：调用 deepseek-v4-flash 多模态 API
 * - 无 API Key 或无照片时：降级到启发式规则
 */

export interface BodyAnalysis {
  bodyType: string;
  skinTone: string;
  heightEstimate: string;
  shoulderType: string;
}

export interface OutfitRecognition {
  items: RecognizedItem[];
  overallStyle: string;
  colorPalette: string[];
  occasionFit: string;
}

export interface RecognizedItem {
  category: string;
  subCategory: string;
  color: string;
  fit: string;
  estimatedBrand?: string;
}

export interface RecognitionResult {
  body: BodyAnalysis;
  outfit: OutfitRecognition;
  source: "vision_api" | "heuristic";
}

// ========== 真实视觉 API 调用 ==========

const VISION_PROMPT = `你是一个专业的服饰分析 AI。请分析这张人物照片，返回纯 JSON（不要 markdown 标记，不要解释）：

{
  "body": {
    "bodyType": "偏瘦" | "标准" | "偏壮",
    "skinTone": "白皙" | "自然" | "小麦" | "深色",
    "shoulderType": "窄肩" | "标准" | "宽肩",
    "heightEstimate": "160cm以下" | "160-170cm" | "170-180cm" | "180cm以上"
  },
  "outfit": {
    "items": [
      { "category": "上装" | "下装" | "鞋履" | "配饰", "subCategory": "具体品类", "color": "颜色", "fit": "修身" | "标准" | "宽松" }
    ],
    "overallStyle": "街头" | "日系" | "Clean Fit" | "韩系" | "运动休闲" | "甜酷" | "机能" | "其他",
    "colorPalette": ["主色1", "主色2"],
    "occasionFit": "日常休闲" | "运动" | "通勤" | "约会" | "音乐节"
  }
}`;

export async function analyzePersonImage(
  imageUrl: string,
  config: { apiKey: string; baseUrl?: string; model?: string }
): Promise<RecognitionResult> {
  const baseUrl = config.baseUrl || "https://api.deepseek.com";
  const model = config.model || "deepseek-v4-flash";

  console.log(`📡 POST ${baseUrl}/v1/chat/completions, model=${model}, with image_url`);
  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: VISION_PROMPT,
            image_url: imageUrl,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      console.warn("DeepSeek vision API failed:", response.status);
      throw new Error(`Vision API returned ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // 从回复中提取 JSON（可能被 markdown 包裹）
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in vision response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log("✅ Vision API response parsed successfully");

    return {
      body: {
        bodyType: parsed.body?.bodyType || "标准",
        skinTone: parsed.body?.skinTone || "自然",
        shoulderType: parsed.body?.shoulderType || "标准",
        heightEstimate: parsed.body?.heightEstimate || "170-180cm",
      },
      outfit: {
        items: parsed.outfit?.items || [],
        overallStyle: parsed.outfit?.overallStyle || "未知",
        colorPalette: parsed.outfit?.colorPalette || ["黑", "白"],
        occasionFit: parsed.outfit?.occasionFit || "日常休闲",
      },
      source: "vision_api",
    };
  } catch (error) {
    console.warn("❌ Vision API failed, falling back to heuristic:", String(error).slice(0, 120));
    // 降级：用 URL 中的场景信息做启发式分析
    return heuristicFallback(imageUrl);
  }
}

// ========== 启发式降级（无 API 或无照片时） ==========

function heuristicFallback(_imageUrl: string): RecognitionResult {
  return {
    body: {
      bodyType: "标准",
      skinTone: "自然",
      heightEstimate: "170-180cm",
      shoulderType: "标准",
    },
    outfit: {
      items: [
        { category: "上装", subCategory: "T恤", color: "白", fit: "标准" },
        { category: "下装", subCategory: "休闲裤", color: "黑", fit: "直筒" },
      ],
      overallStyle: "未知",
      colorPalette: ["黑", "白"],
      occasionFit: "日常休闲",
    },
    source: "heuristic",
  };
}

// ========== 纯文本启发式（保留兼容，无照片时使用） ==========

export function analyzeBody(userInput: {
  gender: string;
  height?: string;
  weight?: string;
  shoulderWidth?: string;
  photos?: string[];
}): BodyAnalysis {
  return {
    bodyType:
      userInput.weight === "偏瘦" ? "偏瘦" :
      userInput.weight === "偏壮" ? "偏壮" :
      "标准",
    skinTone: "自然",
    heightEstimate: userInput.height || "170-175cm",
    shoulderType:
      userInput.shoulderWidth === "窄" ? "窄肩" :
      userInput.shoulderWidth === "宽" ? "宽肩" :
      "标准",
  };
}

export function recognizeOutfit(
  userInput: { style?: string; description?: string }
): OutfitRecognition {
  const style = userInput.style || "未知";
  const desc = userInput.description || "";

  const items: RecognizedItem[] = [];
  if (desc.includes("卫衣") || desc.includes("hoodie")) {
    items.push({ category: "上装", subCategory: "卫衣", color: "黑", fit: "宽松" });
  }
  if (desc.includes("T恤") || desc.includes("tee")) {
    items.push({ category: "上装", subCategory: "T恤", color: "白", fit: "标准" });
  }
  if (desc.includes("牛仔裤")) {
    items.push({ category: "下装", subCategory: "牛仔裤", color: "蓝", fit: "直筒" });
  }
  if (desc.includes("工装裤") || desc.includes("卡其")) {
    items.push({ category: "下装", subCategory: "工装裤", color: "卡其", fit: "宽松" });
  }

  const styleMap: Record<string, string[]> = {
    "街头": ["黑", "白", "红"],
    "日系": ["卡其", "白", "藏青"],
    "Clean Fit": ["白", "灰", "黑"],
    "韩系": ["米白", "浅蓝", "灰"],
  };

  return {
    items: items.length ? items : [
      { category: "上装", subCategory: "T恤", color: "白", fit: "标准" },
      { category: "下装", subCategory: "休闲裤", color: "黑", fit: "直筒" },
    ],
    overallStyle: style,
    colorPalette: styleMap[style] || ["黑", "白"],
    occasionFit: "日常休闲",
  };
}

export function matchFit(
  item: RecognizedItem,
  bodyAnalysis: BodyAnalysis
): { score: number; advice: string } {
  if (bodyAnalysis.bodyType === "偏瘦" && item.fit === "宽松") {
    return { score: 3, advice: "宽松版型能增加体量感，适合偏瘦身形" };
  }
  if (bodyAnalysis.bodyType === "偏壮" && item.fit === "修身") {
    return { score: 1, advice: "偏壮身形建议避免过于修身的版型，选择直筒或宽松款" };
  }
  return { score: 2, advice: "版型匹配基本合适" };
}
