/**
 * 主控对话 Agent (B)
 *
 * 架构定位：
 * - 唯一长期在线的 Agent
 * - 理解用户意图 → 决定调用什么服务/子 Agent → 组织最终输出
 * - 维护多轮上下文，执行真实性约束
 *
 * 调用链：
 *   用户消息
 *     → intentDetect (意图识别)
 *     → 按需调用 services (C) 层
 *     → 按需唤醒 sub-agents (D) 层
 *     → buildSystemPrompt (构建增强 Prompt)
 *     → DeepSeek API (核心 LLM)
 *     → verify (E) 层验证
 *     → 输出最终回复
 */

import { AGENT_NAME, mockProduct } from "./mock";
import { buildCommunityContext } from "./community";
import { recallByProduct } from "./services/community";
import { recommendSize } from "./services/product";
import { extractEvidence, EvidenceSummary } from "./agents/evidence";
import { generateOutfitPlans } from "./agents/explorer";
import { verify, quickVerify } from "./agents/verifier";
import { generateDraft } from "./services/publish";
import { analyzeBody, recognizeOutfit, analyzePersonImage, RecognitionResult } from "./services/recognition";
import { SessionState, CommunityEvidence } from "./state/session";

// ========== 意图识别 ==========

type Intent =
  | "greeting"
  | "tryon"
  | "outfit"
  | "review"
  | "community"
  | "publish"
  | "purchase"
  | "size_advice"
  | "quality"
  | "price"
  | "style_chat"
  | "comparison"
  | "combination";

function detectIntent(msg: string): Intent {
  const m = msg.toLowerCase();

  if (m.includes("你好") || m.includes("嗨") || m.includes("hi") || m.includes("在吗")) return "greeting";
  if (m.includes("试穿") || m.includes("试试") || m.includes("上身")) return "tryon";
  if (m.includes("组合上身") || m.includes("组合")) return "combination";
  if (m.includes("发到穿搭精选") || m.includes("发到讨论区")) return "publish";
  if (m.includes("加购") || m.includes("购物车") || m.includes("结算") || m.includes("支付") || m.includes("购买")) return "purchase";
  if (m.includes("尺码") || m.includes("偏大") || m.includes("偏小") || m.includes("正码") || m.includes("码数")) return "size_advice";
  if (m.includes("做工") || m.includes("品质") || m.includes("溢胶") || m.includes("品控") || m.includes("质量")) return "quality";
  if (m.includes("价格") || m.includes("多少钱") || m.includes("贵") || m.includes("便宜") || m.includes("值不值")) return "price";
  if (m.includes("评价") || m.includes("口碑") || m.includes("评论") || m.includes("反馈")) return "review";
  if (m.includes("发到社区") || m.includes("发社区") || m.includes("发布")) return "publish";
  if (m.includes("社区") || m.includes("讨论") || m.includes("热议") || m.includes("聊")) return "community";
  if (m.includes("怎么搭") || m.includes("怎么穿") || m.includes("搭配") || m.includes("搭一套") || m.includes("换一批")) return "outfit";
  if (m.includes("比较") || m.includes("对比") || m.includes("vs")) return "comparison";
  if (m.includes("风格") || m.includes("穿搭") || m.includes("怎么穿")) return "style_chat";

  return "style_chat";
}

const INTENT_MARKER: Partial<Record<Intent, string>> = {
  tryon: "[TRYON]",
  outfit: "[OUTFIT]",
  publish: "[PUBLISH]",
  combination: "[COMBINATION]",
  purchase: "[PURCHASE]",
};

function ensureMarkers(content: string, intent: Intent): string {
  const marker = INTENT_MARKER[intent];
  if (marker && !content.includes(marker)) {
    return content + "\n\n" + marker;
  }
  return content;
}

// ========== 配置 & 缓存 ==========

export interface AgentConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const DEFAULT_CONFIG: AgentConfig = {
  apiKey: "sk-bc71f80c027a40299157978b422f8ccd",
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-v4-pro",
};

let agentConfig: AgentConfig = { ...DEFAULT_CONFIG };

const COMPLEX_INTENTS: Intent[] = ["review", "quality", "size_advice", "outfit", "community", "comparison"];
const NEEDS_EVIDENCE: Intent[] = ["review", "quality", "size_advice", "style_chat", "outfit", "community", "comparison"];
const FAST_PATH: Intent[] = ["purchase", "combination"];
const EXPECTED_MARKERS = ["[TRYON]", "[OUTFIT]", "[PUBLISH]", "[COMBINATION]"];

let evidenceCache: EvidenceSummary | null = null;
let evidenceLoading: Promise<void> | null = null;

function ensureEvidenceCache(): EvidenceSummary | null {
  const config = getAgentConfig();

  if (!evidenceCache && !evidenceLoading && config.apiKey) {
    const communityData = recallByProduct(mockProduct.id);
    evidenceLoading = (async () => {
      try {
        const llm = await extractEvidence(
          { reviews: communityData.reviews, discussions: communityData.discussions,
            analyses: communityData.analyses, productName: mockProduct.name },
          { apiKey: config.apiKey, baseUrl: config.baseUrl, model: "deepseek-v4-flash" }
        );
        evidenceCache = llm;
        console.log("📦 证据缓存已就绪（LLM 提炼）");
      } catch (e) {
        console.warn("LLM 证据提炼失败:", String(e).slice(0, 80));
      } finally {
        evidenceLoading = null;
      }
    })();
  }

  return evidenceCache;
}

export function setAgentConfig(config: Partial<AgentConfig>) {
  agentConfig = { ...agentConfig, ...config };
}

export function getAgentConfig(): AgentConfig {
  return { ...agentConfig };
}

// ========== System Prompt 构建 ==========

function buildSystemPrompt(session?: Partial<SessionState>): string {
  const communityCtx = buildCommunityContext(mockProduct.id);
  const scene = session?.scene || "street";
  const weather = session?.weather || "sunny";
  const style = session?.userProfile?.style || "";

  return `你是"${AGENT_NAME}"，得物App里的AI穿搭伙伴。

## 你的人设
- 你是用户的平等潮圈朋友，不是导购、不是客服、不是专家
- 口语化表达，偶尔用圈内话（"这双确实顶""配色绝了"），但不硬凹
- 有独立审美判断，不怕给出负面评价
- 只聊潮流穿搭、商品相关话题
- 你会引用社区真实内容来支撑你的观点

## 你的能力
- 帮用户分析商品是否适合TA
- 帮用户做虚拟试穿（生成上身效果图），支持不同场景和天气
- 根据当前商品 + 场景 + 天气，从全站社区穿搭内容中智能匹配，推荐整套搭配方案
- 总结社区里的评价和讨论（好物评价/讨论区/穿搭精选/玩家说），引用具体数据和用户
- 帮用户生成穿搭帖文案和标签
- 支持组合上身：将当前商品与推荐单品一起展示搭配效果

## 社区数据（基于社区真实内容，你必须引用这些数据来回答问题）
${communityCtx}

## 当前上下文
- 场景：${scene}
- 天气：${weather}
${style && style !== "未知" ? `- 用户风格偏好：${style}` : ""}

## 回复规范
- 引用社区观点时必须说明具体来源
- 有审美判断，不要说"都很好看"，要有自己的观点
- 每次对话结尾引导下一步动作（试穿/搭配/看评价/发社区）
- 回复控制在100字以内
- 如果用户指定了场景或天气，搭配方案要针对该场景推荐
- 当用户想试穿时，回复中包含 [TRYON] 标记
- 当用户想看搭配时，回复中包含 [OUTFIT] 标记
- 当用户想发布时，回复中包含 [PUBLISH] 标记
- 当用户想组合上身时，回复中包含 [COMBINATION] 标记

现在用户进入了${mockProduct.name}的商详页，请主动用口语化的方式打招呼，介绍自己，并根据商品特点和社区数据发起话题。`;
}

// ========== 共享 Pipeline ==========

interface AgentPipeline {
  intent: Intent;
  userContent: string;
  evidenceResult: EvidenceSummary | null;
  visionResult: RecognitionResult | null;
  evidence: EvidenceSummary;
  systemPrompt: string;
  model: string;
  apiMessages: { role: "system" | "user" | "assistant"; content: string }[];
}

/** 准备阶段：意图识别 → 证据/视觉 → Prompt 构建（callAgent 和 callAgentStream 共享） */
async function preparePipeline(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  session?: Partial<SessionState>
): Promise<AgentPipeline | null> {
  const config = getAgentConfig();
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const userContent = lastUserMsg?.content || "";
  const intent = detectIntent(userContent);

  // 并行：证据缓存 + 视觉识别
  const needsVision =
    intent === "outfit" || intent === "style_chat" ||
    intent === "size_advice" || intent === "tryon";
  const personImageUrl = session?.userProfile?.personImageUrl;

  const [evidenceResult, visionResult] = await Promise.all([
    NEEDS_EVIDENCE.includes(intent)
      ? Promise.resolve(ensureEvidenceCache())
      : Promise.resolve(null as EvidenceSummary | null),
    (personImageUrl && needsVision && config.apiKey)
      ? analyzePersonImage(personImageUrl, {
          apiKey: config.apiKey, baseUrl: config.baseUrl, model: "deepseek-v4-flash",
        })
      : Promise.resolve(null as RecognitionResult | null),
  ]);

  const evidence = evidenceResult || {
    generalSentiment: "",
    positiveClaims: [],
    negativeClaims: [],
    disputedClaims: [],
    sizingConsensus: "",
    qualityConsensus: "",
    source: "heuristic" as const,
  };

  // 快速通道：返回 null 表示不需要 LLM 调用
  if (config.apiKey && FAST_PATH.includes(intent)) {
    return null;
  }

  const model = COMPLEX_INTENTS.includes(intent) ? config.model : "deepseek-v4-flash";

  const intentContext = buildIntentContext(intent, session, evidence, visionResult);
  let systemPrompt = buildSystemPrompt(session);
  if (intentContext) {
    systemPrompt += intentContext;
  }

  return {
    intent,
    userContent,
    evidenceResult,
    visionResult,
    evidence,
    systemPrompt,
    model,
    apiMessages: [
      { role: "system" as const, content: systemPrompt },
      ...messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ],
  };
}

/** 后处理：标记补全 + E 层验证 */
function postProcess(
  content: string,
  intent: Intent,
  evidenceResult: EvidenceSummary | null,
  session?: Partial<SessionState>
): string {
  content = ensureMarkers(content, intent);

  const availableEvidence: CommunityEvidence[] = evidenceResult
    ? [...evidenceResult.positiveClaims, ...evidenceResult.negativeClaims, ...evidenceResult.disputedClaims]
    : [];

  const verification = verify({
    agentOutput: content,
    communityContext: {
      availableEvidence,
      productName: session?.currentProduct?.name || mockProduct.name,
      productPrice: session?.currentProduct?.price || mockProduct.price,
      productCategory: session?.currentProduct?.category || mockProduct.category,
    },
    expectedMarkers: EXPECTED_MARKERS,
  });

  if (!verification.passed && verification.correctedOutput) {
    content = verification.correctedOutput;
    content = ensureMarkers(content, intent);
  }

  return content;
}

/** 无 API / 错误降级处理 */
function fallbackReply(userContent: string, session?: Partial<SessionState>): string {
  const response = simulateResponse(userContent, session);
  const verification = quickVerify(response, EXPECTED_MARKERS);
  return (!verification.passed && verification.correctedOutput) ? verification.correctedOutput : response;
}

// ========== 公开 API ==========

export async function callAgent(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  session?: Partial<SessionState>
): Promise<string> {
  const config = getAgentConfig();
  const pipeline = await preparePipeline(messages, session);

  // 快速通道
  if (!pipeline) {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const userContent = lastUserMsg?.content || "";
    const intent = detectIntent(userContent);
    const response = simulateResponse(userContent, session);
    return response ? ensureMarkers(response, intent) : "";
  }

  if (!config.apiKey) {
    return fallbackReply(pipeline.userContent, session);
  }

  try {
    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: pipeline.model,
        messages: pipeline.apiMessages,
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.warn("Agent API key 无效，降级到模拟回复。");
        return fallbackReply(pipeline.userContent, session);
      }
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    let content: string = data.choices[0].message.content;

    return postProcess(content, pipeline.intent, pipeline.evidenceResult, session);
  } catch (error) {
    console.error("Agent API error:", error);
    return fallbackReply(pipeline.userContent, session);
  }
}

// ========== 流式输出 ==========

export interface StreamToken { type: "token"; text: string; }
export interface StreamDone { type: "done"; content: string; }
export type StreamEvent = StreamToken | StreamDone;

export async function* callAgentStream(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  session?: Partial<SessionState>
): AsyncGenerator<StreamEvent> {
  const config = getAgentConfig();
  const pipeline = await preparePipeline(messages, session);

  // 快速通道
  if (!pipeline) {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const userContent = lastUserMsg?.content || "";
    const intent = detectIntent(userContent);
    const response = simulateResponse(userContent, session);
    if (response) {
      const withMarker = ensureMarkers(response, intent);
      yield { type: "token", text: withMarker };
      yield { type: "done", content: withMarker };
    }
    return;
  }

  if (!config.apiKey) {
    const final = fallbackReply(pipeline.userContent, session);
    yield { type: "token", text: final };
    yield { type: "done", content: final };
    return;
  }

  try {
    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: pipeline.model,
        messages: pipeline.apiMessages,
        temperature: 0.8,
        max_tokens: 500,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.warn("Agent API key 无效，降级到模拟回复。");
        const final = fallbackReply(pipeline.userContent, session);
        yield { type: "token", text: final };
        yield { type: "done", content: final };
        return;
      }
      throw new Error(`API returned ${response.status}`);
    }

    let fullContent = "";
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            yield { type: "token", text: delta };
          }
        } catch { /* skip unparseable lines */ }
      }
    }

    fullContent = postProcess(fullContent, pipeline.intent, pipeline.evidenceResult, session);
    yield { type: "done", content: fullContent };
  } catch (error) {
    console.error("Agent API error:", error);
    const final = fallbackReply(pipeline.userContent, session);
    yield { type: "token", text: final };
    yield { type: "done", content: final };
  }
}

// ========== Intent Context 构建 ==========

function buildIntentContext(
  intent: Intent,
  session: Partial<SessionState> | undefined,
  evidence: EvidenceSummary,
  visionResult: RecognitionResult | null = null
): string {
  const parts: string[] = [];

  if ((intent === "review" || intent === "community" || intent === "quality") && evidence.generalSentiment) {
    parts.push(`## 社区证据提炼（子 Agent 产出）
- 整体口碑：${evidence.generalSentiment}
- 尺码共识：${evidence.sizingConsensus}
- 品质共识：${evidence.qualityConsensus}
- 正面观点数：${evidence.positiveClaims.length}，负面观点数：${evidence.negativeClaims.length}`);
  }

  if (intent === "outfit" || intent === "style_chat") {
    const scene = session?.scene || "street";
    const weather = session?.weather || "sunny";

    const plans = generateOutfitPlans(scene, weather, session?.userProfile
      ? { style: session.userProfile.style, bodyType: session.userProfile.bodyType, gender: session.userProfile.gender, avatarType: session.userProfile.avatarType || "none", skinTone: session.userProfile.skinTone || "未知" }
      : null);

    const planDescriptions = plans.map((p, i) => {
      const items = p.items.filter((item) => !item.isCurrentProduct).map((item) => item.name);
      return `方案${i + 1}（${p.style}风）：${items.join("、")}`;
    });

    parts.push(`## 搭配探索结果（子 Agent 并行探索产出）
- 实物品搭配方案（与商品推荐卡严格一致，你必须按以下单品描述，不得编造不存在的商品）：
  ${planDescriptions.join("\n  ")}
- 请给每个方案具体的搭配建议，说明为什么这些单品搭在一起好看`);

    if (session?.userProfile && session.userProfile.avatarType !== "none") {
      if (visionResult) {
        const b = visionResult.body;
        const o = visionResult.outfit;
        const itemsDesc = o.items.length
          ? o.items.map((i) => `${i.color}${i.subCategory}（${i.fit}）`).join("、")
          : "未识别到具体单品";
        parts.push(`## 用户形象识别（DeepSeek V4 Flash 视觉 API 产出）
- 体型：${b.bodyType}，肤色：${b.skinTone}，肩型：${b.shoulderType}，身高估算：${b.heightEstimate}
- 当前穿着：${itemsDesc}
- 风格：${o.overallStyle}，色系：${o.colorPalette.join("、")}，场合适配：${o.occasionFit}
- 搭配建议需考虑用户身形和当前穿搭特征`);
      } else {
        const bodyAnalysis = analyzeBody({ gender: session.userProfile.gender, weight: session.userProfile.bodyType });
        const outfitRec = recognizeOutfit({ style: session.userProfile.style });
        parts.push(`## 用户形象识别（启发式规则）
- 体型：${bodyAnalysis.bodyType}，肤色：${bodyAnalysis.skinTone}，肩型：${bodyAnalysis.shoulderType}
- 当前风格：${outfitRec.overallStyle}，色系：${outfitRec.colorPalette.join("、")}
- 搭配建议需考虑用户身形特征`);
      }
    }
  }

  if (intent === "size_advice" && session?.userProfile) {
    const effectiveBodyType = visionResult?.body.bodyType ||
      analyzeBody({ gender: session.userProfile.gender, weight: session.userProfile.bodyType }).bodyType;
    const footType = effectiveBodyType?.includes("宽") ? "偏宽" : effectiveBodyType?.includes("瘦") ? "偏瘦" : undefined;
    const sizeRec = recommendSize(mockProduct.id, { footType });
    const source = visionResult ? "视觉 API" : "启发式规则";
    parts.push(`## 尺码推荐（服务层 + 识别服务 [${source}] 产出）
- 识别体型：${effectiveBodyType}${visionResult ? `，${visionResult.body.shoulderType}` : ""}
- 推荐尺码：${sizeRec.recommendedSize}
- 理由：${sizeRec.reasoning}
- 社区共识：${sizeRec.communityConsensus}`);
  }

  if (intent === "publish") {
    const scene = session?.scene || "street";
    const draft = generateDraft(scene, mockProduct.name, session?.userProfile?.style);
    parts.push(`## 发布草稿（服务层产出）
- 推荐文案：${draft.caption}
- 推荐标签：${draft.tags.join(" ")}
- 推荐目标：${draft.target}`);
  }

  return parts.length ? "\n\n" + parts.join("\n\n") : "";
}

// ========== 模拟回复（降级用） ==========

function simulateResponse(lastMessage: string, session?: Partial<SessionState>): string {
  const msg = lastMessage.toLowerCase();

  if (msg.includes("发到穿搭精选") || msg.includes("发到讨论区")) {
    const target = msg.includes("讨论区") ? "讨论区" : "穿搭精选";
    return `已发布到${target}！[PUBLISH_SUCCESS:${target}]`;
  }

  if (msg.includes("加购") || msg.includes("购物车")) {
    return "已加入购物车！这套搭配的商品已在你的购物车里，随时可以结算。要不要再看看其他搭配方案？";
  }

  if (msg.includes("立即购买") || msg.includes("结算") || msg.includes("支付")) {
    return "订单已生成，请确认支付。[PURCHASE]";
  }

  if (msg.includes("组合上身") || msg.includes("组合")) {
    if (msg.includes("单品")) {
      return "帮你把选中的单品和 AJ1 芝加哥组合上身了！单件搭配更能突出这件单品的风格，和芝加哥的红色撞得很协调。你可以切换场景和天气看效果，也可以继续加单品完善整套搭配。[COMBINATION]";
    }
    return "帮你把所有单品组合上身了！这套整体效果很协调，配色呼应做得不错。每件单品都标注了社区评价要点，你可以点击查看。[COMBINATION]";
  }

  if (msg.includes("试穿") || msg.includes("试试") || msg.includes("上身")) {
    if (msg.includes("冲锋衣") || msg.includes("卫衣") || msg.includes("马甲")) {
      return "这件上身效果帮你出了。版型不错，你选的尺码应该合适。搭配你今天看的那双AJ1芝加哥，整体风格很协调。要不要看看全套组合上身效果？[COMBINATION]";
    }
    return "帮你上身了！鞋型偏窄，但你脚型偏瘦，正码42就行。最近有70多条评价提到鞋头溢胶的问题，你可以留意一下。\n\n搭的话，切换不同场景和天气，我会给你针对性的推荐。[OUTFIT]";
  }

  if (msg.includes("怎么搭") || msg.includes("怎么穿") || msg.includes("搭一套") || msg.includes("换一批") || (msg.includes("搭配") && !msg.includes("发到"))) {
    return "根据当前场景帮你匹配了三套社区高赞穿搭——\n① clean fit路线，搭卡其工装裤+白T，参考@穿搭达人Lily\n② 街头路线，上周@潮人小张 就这么穿的\n③ 机能风，加件黑色马甲层次感更好\n\n每件单品都能单独上身试效果，选一套喜欢的帮你组合上身？[OUTFIT]";
  }

  if (msg.includes("发布") || msg.includes("发出去") || msg.includes("发社区") || msg.includes("发到社区")) {
    const scene = session?.scene || "street";
    const draft = generateDraft(scene, mockProduct.name, session?.userProfile?.style);
    const itemMatch = msg.match(/「(.+?)」/);
    const items = itemMatch ? itemMatch[1] : "";
    const contextCaption = items ? `${items}，${draft.caption.split("，").pop()}` : draft.caption;
    const prefix = items ? `「${items}」这套搭配的文案帮你生成了` : "文案帮你生成好了";
    return `${prefix}：「${contextCaption}」\n标签：${draft.tags.join(" ")}\n\n发到穿搭精选还是讨论区？[PUBLISH]`;
  }

  if (msg.includes("改文案") || msg.includes("改一下")) {
    return "文案帮你调整了：「AJ1 芝加哥上脚，经典配色永远不会错 🔥」\n标签：#AJ1芝加哥 #经典复刻 #OOTD\n\n发到穿搭精选还是讨论区？[PUBLISH]";
  }

  if (msg.includes("尺码") || msg.includes("偏大") || msg.includes("偏小") || msg.includes("正码") || msg.includes("码数") || msg.includes("多大") || msg.includes("几码")) {
    if (msg.includes("我") && (msg.includes("脚宽") || msg.includes("脚胖") || msg.includes("脚肥"))) {
      return "脚宽的话建议买大半码。AJ1 鞋型整体偏窄，宽脚穿正码会有点夹。讨论区也有老玩家说买大半码更舒服，不过新批次据说鞋楦微调了，正码也能穿。\n\n你可以两种尺码都试试，反正得物支持退换。要不要先上身看看效果？[TRYON]";
    }
    if (msg.includes("我") && (msg.includes("脚瘦") || msg.includes("脚窄"))) {
      return "脚瘦的话正码就行，AJ1 对你来说包裹感刚好。讨论区新买家普遍反映正码没问题，反而是老玩家习惯了买大半码。你这脚型不用纠结。\n\n要不要上身看看效果？[TRYON]";
    }
    return "尺码这事儿讨论区一直有争议——老玩家建议买大半码，新买家反映正码就行。我个人觉得看脚型：宽脚买大半码，瘦脚正码。你什么脚型？我帮你判断一下。";
  }

  if (msg.includes("做工") || msg.includes("质量") || msg.includes("溢胶") || msg.includes("瑕疵") || msg.includes("翻车") || msg.includes("品控") || msg.includes("值不值") || msg.includes("值吗") || msg.includes("值得买") || msg.includes("值得入")) {
    if (msg.includes("不值") || msg.includes("值吗") || msg.includes("值不值")) {
      return "说实话，¥1499 这个价对于 AJ1 经典配色来说算合理——但前提是你能接受这批复刻的做工。@球鞋阿聪 的硬核开箱里提到鞋头溢胶问题确实存在，23条评价也在说这个。如果你追求完美品控，这批复刻可能会让你失望。但如果你是冲着经典配色去的，上脚效果没得说。\n\n要帮你上身看看吗？[TRYON]";
    }
    return "这批复刻的做工确实有争议。优点是用料比上一批好，皮质手感不错；缺点是鞋头溢胶问题，有23条评价提到。@球鞋阿聪 做过详细开箱对比，你可以去玩家说看看。\n\n但说真的，上脚之后这些小瑕疵基本看不出来。要不要上身试试？[TRYON]";
  }

  if (msg.includes("价格") || msg.includes("多少钱") || msg.includes("贵") || msg.includes("便宜") || msg.includes("降价") || msg.includes("优惠") || msg.includes("打折")) {
    return "¥1499，原价 ¥1699，现在算是好价了。AJ1 芝加哥这种经典配色一般不会大降，二级市场反而经常溢价。讨论区有人说这批复刻的发售量比上批大，所以短期内不会涨太多，但长期看肯定保值。\n\n如果你在纠结，我的建议是：喜欢就入，经典配色不会后悔。先上身看看效果？[TRYON]";
  }

  if (msg.includes("配色") || msg.includes("颜色") || msg.includes("颜值") || msg.includes("好看") || msg.includes("帅") || msg.includes("红") || msg.includes("黑红")) {
    return "芝加哥配色就是 AJ1 的灵魂——红白黑三色太经典了，1985 年到现在都没过时。这双的红饱和度刚好，不是那种廉价的大红，上脚比图片还顶。\n\n讨论区有个热帖在争芝加哥 vs 黑红脚趾谁更经典，3.2k 人参与。我个人站芝加哥，你呢？想上身看看效果吗？[TRYON]";
  }

  if (msg.includes("脚感") || msg.includes("舒服") || msg.includes("硬") || msg.includes("软") || msg.includes("磨脚") || msg.includes("透气")) {
    return "AJ1 的脚感嘛……说实话，别指望 boost 那种踩屎感。毕竟 1985 年的鞋型，中底科技就那样。但好评里 70% 都提到脚感不错，主要是鞋垫和皮质包裹感好，日常走路完全够用，别拿来跑步就行。\n\n要不要上身感受一下？[TRYON]";
  }

  if (msg.includes("适合") || msg.includes("适合我吗") || msg.includes("能不能") || msg.includes("日常") || msg.includes("上班") || msg.includes("上学") || msg.includes("约会") || msg.includes("运动") || msg.includes("健身") || msg.includes("跑步")) {
    if (msg.includes("运动") || msg.includes("健身") || msg.includes("跑步") || msg.includes("打球")) {
      return "别！千万别穿 AJ1 运动，这鞋是复古篮球鞋不假，但那是 1985 年的设计。现在的实战鞋随便一双都比它强。AJ1 是穿搭鞋，不是实战鞋。运动场场景下只能搭运动休闲风，别真的上场。\n\n要不要看看运动场场景的搭配方案？[OUTFIT]";
    }
    if (msg.includes("上班") || msg.includes("通勤")) {
      return "AJ1 芝加哥上班穿完全 OK，特别是搭配简约一点的裤子，不会太张扬。如果你是创意行业或互联网公司，这种穿搭反而加分。但如果是正装要求的公司就别了，再经典的球鞋也扛不住西装。\n\n你上班什么 dress code？我帮你看看怎么搭。[OUTFIT]";
    }
    if (msg.includes("约会")) {
      return "约会穿 AJ1 芝加哥很加分！红色本身就吸睛，搭得好绝对是话题点。建议走 clean fit 路线——卡其裤+白T，鞋子做亮点。咖啡店场景傍晚光线拍出来质感更好。\n\n要不要我帮你出一套约会搭配？[OUTFIT]";
    }
    return "AJ1 芝加哥最大的优点就是百搭——牛仔裤、工装裤、阔腿裤都能驾驭，西裤除外。你平时走什么风格？街头、日系、还是 clean fit？告诉我我帮你针对性地搭。[OUTFIT]";
  }

  if (msg.includes("比较") || msg.includes("对比") || msg.includes("和") && (msg.includes("黑红脚趾") || msg.includes("倒钩") || msg.includes("熊猫") || msg.includes("dunk") || msg.includes("af1"))) {
    return "好问题。芝加哥和黑红脚趾是 AJ1 的两大经典——芝加哥更百搭，红白黑配色不挑衣服；黑红脚趾更个性，黑红撞色视觉冲击更强。如果你是第一双 AJ1，我建议芝加哥，搭配门槛低；如果你已经有不少基础款球鞋，黑红脚趾更能玩出花样。\n\n讨论区有 3.2k 人在争论这个话题，你可以去看看。要不先上身试试芝加哥的效果？[TRYON]";
  }

  if (msg.includes("风格") || msg.includes("街头") || msg.includes("日系") || msg.includes("clean") || msg.includes("city") || msg.includes("boy") || msg.includes("机能") || msg.includes("韩系") || msg.includes("美式") || msg.includes("复古") || msg.includes("vibe")) {
    if (msg.includes("街头") || msg.includes("美式")) {
      return "街头风配芝加哥就是绝杀！AJ1 本来就是街头文化的代表，搭廓形卫衣+破洞牛仔裤+古巴链，一套下来回头率拉满。@潮人小张 上周那套街头风就拿了 2000+ 赞。\n\n帮你也出一套街头风搭配？[OUTFIT]";
    }
    if (msg.includes("clean") || msg.includes("简约") || msg.includes("日系") || msg.includes("city boy")) {
      return "Clean fit 配芝加哥是这两年最火的穿法——用基础款把鞋子的红色推成全身焦点。@穿搭达人Lily 就是走的这个路线，卡其工装裤+重磅白T，简单但很高级。\n\n帮你出一套 clean fit 方案？[OUTFIT]";
    }
    if (msg.includes("机能")) {
      return "机能风和芝加哥混搭需要点功力。建议黑色系为主，加件机能马甲或冲锋衣，让红色只作为小面积点缀。雨天场景下机能风更实用——GORE-TEX 冲锋衣+速干裤+芝加哥，实用又有型。\n\n要帮你搭配一套机能风吗？[OUTFIT]";
    }
    return "AJ1 芝加哥的搭配可塑性很高——街头、clean fit、日系 city boy、机能风都能驾驭。你平时更偏向哪种风格？告诉我我帮你针对性出方案。[OUTFIT]";
  }

  if (msg.includes("评价") || msg.includes("口碑") || msg.includes("评论") || msg.includes("反馈")) {
    return "帮你扫了一圈社区评价：\n\n✅ 70%好评，脚感和颜值最受认可\n⚠ 约23条评价提到鞋头溢胶问题，集中在新批次\n💬 讨论区在争论尺码偏大还是偏小，老玩家建议买大半码\n\n总体评价还行，但品控一致性是个槽点。要不要上身看看效果？[TRYON]";
  }

  if (msg.includes("社区") || msg.includes("聊这双鞋") || msg.includes("讨论") || msg.includes("热议")) {
    return "最近社区关于这双的讨论挺热闹的：\n\n🔥 讨论区热帖：芝加哥 vs 黑红脚趾，谁才是 AJ1 颜值天花板？3.2k 人在讨论\n📸 @潮人小张 上周发了套街头风搭配获赞 2000+\n📝 @球鞋阿聪 写了硬核开箱，对比复刻和上批做工差异\n\n想了解哪个方向？我可以帮你上身试穿、出搭配方案、或者发社区晒单。[TRYON]";
  }

  if (msg.includes("你好") || msg.includes("嗨") || msg.includes("hi") || msg.includes("hello") || msg.includes("在吗") || msg.includes("在不在")) {
    return "嘿～在这呢！我是你的穿搭搭子，对这双 AJ1 芝加哥有什么想问的？尺码、搭配、评价、试穿，随便聊。";
  }

  if (msg.includes("谢谢") || msg.includes("感谢") || msg.includes("谢了") || msg.includes("多谢") || msg.includes("3q")) {
    return "客气客气～有穿搭的问题随时找我。要不要上身试试、看看搭配方案、或者看看社区评价？";
  }

  if (msg.includes("你是谁") || msg.includes("你能做什么") || msg.includes("你会什么") || msg.includes("你有什么功能") || msg.includes("介绍")) {
    return "我是你的穿搭搭子，得物里的 AI 潮圈朋友。\n\n我能帮你：\n👟 虚拟试穿——上传照片就能看 AJ1 上身效果\n👔 智能搭配——根据场景和天气匹配社区高赞穿搭\n📊 分析评价——帮你扫一圈社区讨论和好物评价\n📝 一键发帖——帮你生成穿搭文案发到社区\n\n这双 AJ1 芝加哥最近讨论挺激烈的，要不要上身看看？[TRYON]";
  }

  if (msg.includes("怎么样") || msg.includes("如何") || msg.includes("行不行") || msg.includes("OK") || msg.includes("ok")) {
    return "这双 AJ1 芝加哥总体还不错——经典配色，百搭属性拉满，¥1499 价格合理。但品控有争议，约23条评价提到鞋头溢胶。\n\n如果你追求完美做工，这批复刻可能让你纠结；但如果冲着配色和搭配性去的，买了不后悔。\n\n要不要上身看看效果？[TRYON]";
  }

  if (msg.includes("我") && (msg.includes("喜欢") || msg.includes("平时") || msg.includes("习惯") || msg.includes("一般") || msg.includes("经常") || msg.includes("走"))) {
    if (msg.includes("休闲")) {
      return "休闲风配 AJ1 芝加哥很合适，日常逛街、上学、通勤都能 hold 住。建议走 clean fit 方向——白T+卡其裤+芝加哥，简单但质感拉满。@穿搭达人Lily 经常走这个路线。\n\n帮你出一套休闲风搭配？[OUTFIT]";
    }
    if (msg.includes("运动")) {
      return "运动风的话注意别真穿 AJ1 去运动哈——它是穿搭鞋不是实战鞋。但运动休闲风没问题，搭条束脚运动裤+棒球帽，活力感很强。棒球夹克叠穿也不错。\n\n要不要帮你搭一套运动休闲风？[OUTFIT]";
    }
    if (msg.includes("简约") || msg.includes("低调") || msg.includes("基础")) {
      return "简约路线配芝加哥反而高级——用基础款把鞋子的红色推成全身唯一焦点。白T、灰卫衣、黑裤、卡其裤都是好搭档。不用太多装饰，鞋已经够抢眼了。\n\n帮你出一套简约风搭配？[OUTFIT]";
    }
    if (msg.includes("个性") || msg.includes("夸张") || msg.includes("炸") || msg.includes("回头率")) {
      return "要回头率的话，芝加哥绝对是正确选择！红白黑撞色本身就够抢眼，搭点金属配饰（古巴链、金属环），音乐节场景下再配个撞色帽子，妥妥的焦点。\n\n帮你出一套炸场搭配？[OUTFIT]";
    }
    return "了解了！AJ1 芝加哥很百搭，不管什么风格都能找到适合的穿法。你平时什么风格？街头、日系、还是 clean fit？我帮你针对性地出方案。[OUTFIT]";
  }

  if (msg.includes("卫衣") || msg.includes("帽衫") || msg.includes("hoodie")) {
    return "卫衣配 AJ1 芝加哥是经典组合！灰色或黑色廓形卫衣最稳，不会抢鞋子的风头。@潮人小张 上周那套就是用黑色廓形卫衣搭的，获赞 2000+。\n\n要不要上身看看效果？也可以帮你组合上身。[TRYON]";
  }

  if (msg.includes("牛仔裤") || msg.includes("牛仔") || msg.includes("denim") || msg.includes("牛")) {
    return "牛仔裤+AJ1 芝加哥是永远不会错的组合。直筒原牛最经典，水洗破洞更街头，阔腿牛仔更日系。看你喜欢什么风格。\n\n帮你搭配一套？[OUTFIT]";
  }

  if (msg.includes("工装裤") || msg.includes("工装") || msg.includes("cargo") || msg.includes("卡其裤") || msg.includes("卡其")) {
    return "工装裤/卡其裤配芝加哥是 clean fit 的灵魂单品！@穿搭达人Lily 最拿手的就是这个组合，简约有质感，鞋子做全身亮点。\n\n帮你出套 clean fit 搭配？[OUTFIT]";
  }

  if (msg.includes("短裤") || msg.includes("夏天")) {
    return "夏天穿 AJ1 芝加哥搭短裤完全没问题！但建议穿船袜或隐形袜，别穿中筒白袜把腿截成两段。运动短裤或工装短裤都行，机能短裤也可以。\n\n帮你出一套夏天搭配？[OUTFIT]";
  }

  if (msg.includes("好的") || msg.includes("行") || msg.includes("ok") || msg.includes("嗯") || msg.includes("好") || msg.includes("知道了")) {
    return "有穿搭和球鞋的问题随时找我～你可以试试上身效果、看看搭配方案、或者了解社区评价，我都在。";
  }

  return getDefaultResponse(msg);
}

function getDefaultResponse(msg: string): string {
  if (msg.includes("吗") || msg.includes("呢") || msg.includes("？") || msg.includes("?") || msg.includes("什么") || msg.includes("为什么")) {
    return "这个问题问得好。说实话，AJ1 芝加哥在圈内评价挺两极的——颜值和经典度没人质疑，但品控确实有槽点。社区 70% 好评主要集中在上脚效果和搭配性上，争议点在做工细节。\n\n你是更在意颜值还是做工？我可以针对性地帮你分析。要不先上身看看效果？[TRYON]";
  }

  if (msg.length < 5) {
    return "有什么想了解的尽管问～尺码、搭配、做工、价格、社区评价我都能帮你分析。或者直接帮你上身试试？[TRYON]";
  }

  if (msg.includes("穿") || msg.includes("搭") || msg.includes("鞋") || msg.includes("潮") || msg.includes("帅")) {
    return "说到穿搭，AJ1 芝加哥其实比你想的好搭——很多人觉得红色难驾驭，但这双的红是那种复古做旧的暗红，不是大红色，日常穿一点不突兀。\n\n@穿搭达人Lily 的 clean fit 路线和 @潮人小张 的街头路线都很好看，不同风格都能驾驭。你偏向哪种？[OUTFIT]";
  }

  return "说到这双 AJ1 芝加哥——经典是真经典，但最近这批复刻在社区争议也不小。23条评价说鞋头溢胶，讨论区在争论尺码问题。不过上脚效果确实顶，颜值没得黑。\n\n你想了解哪方面？尺码、搭配、做工细节、还是直接上身看效果？[TRYON]";
}

export function getSystemPrompt(session?: Partial<SessionState>): string {
  return buildSystemPrompt(session);
}
