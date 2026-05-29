/**
 * 按需唤醒的子 Agent (D) — 证据提炼 Agent
 *
 * 职责：
 * - 当商品相关的评论、问答、穿搭帖数量较多时被主 Agent 唤醒
 * - 用 LLM 对召回内容做 去噪→压缩→归纳→证据对齐
 * - API 不可用时降级到启发式规则
 *
 * 设计理由（面试用）：
 * - 上下文保护：大量社区内容会撑爆主 Agent 的 context window
 *   由子 Agent 独立处理原始内容，只输出精炼结论
 * - 证据可溯源：每条结论附带来源引用
 * - 大模型的价值：高频结论提取、正反观点归纳、尺码风险总结
 *   正是最适合 LLM 的位置
 */

import { CommunityContent } from "@/lib/community";
import { CommunityEvidence } from "@/lib/state/session";

export interface EvidenceExtractionInput {
  reviews: CommunityContent[];
  discussions: CommunityContent[];
  analyses: CommunityContent[];
  productName: string;
}

export interface EvidenceSummary {
  generalSentiment: string;
  positiveClaims: CommunityEvidence[];
  negativeClaims: CommunityEvidence[];
  disputedClaims: CommunityEvidence[];
  sizingConsensus: string;
  qualityConsensus: string;
  source: "llm" | "heuristic";
}

// ========== LLM 驱动的证据提炼 ==========

const EVIDENCE_PROMPT = `你是社区内容分析专家。请分析以下商品社区内容，提取关键证据。返回纯 JSON（不要 markdown）：

{
  "generalSentiment": "一句话概括整体口碑",
  "positiveClaims": [
    { "source": "来源（如 @用户名 / 好物评价）", "claim": "正面观点（30字以内）", "confidence": "high" | "medium" | "low" }
  ],
  "negativeClaims": [
    { "source": "来源", "claim": "负面观点（30字以内）", "confidence": "high" | "medium" | "low" }
  ],
  "disputedClaims": [
    { "source": "来源", "claim": "争议观点（30字以内）", "confidence": "high" | "medium" | "low" }
  ],
  "sizingConsensus": "尺码共识（如：多数建议买大半码 / 普遍正码 / 存在分歧）",
  "qualityConsensus": "品质共识（如：材质不错但品控不稳 / 整体做工优秀）"
}

规则：
- 每条 claim 必须是对原文的归纳，不能编造
- positiveClaims 和 negativeClaims 各最多 5 条
- disputedClaims 最多 3 条
- confidence 根据点赞数和出现频率判断：高赞高频 → high，偶尔出现 → low`;

export async function extractEvidenceWithLLM(
  input: EvidenceExtractionInput,
  config: { apiKey: string; baseUrl?: string; model?: string }
): Promise<EvidenceSummary> {
  const baseUrl = config.baseUrl || "https://api.deepseek.com";
  const model = config.model || "deepseek-v4-pro";

  const contentText = formatContentForLLM(input);

  try {
    console.log("📡 证据提炼 Agent 调用 LLM 进行归纳...");
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: EVIDENCE_PROMPT },
          { role: "user", content: contentText },
        ],
        temperature: 0.3,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API returned ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in LLM response");

    const parsed = JSON.parse(jsonMatch[0]);
    console.log("✅ 证据提炼 LLM 归纳完成");

    return {
      generalSentiment: parsed.generalSentiment || "社区口碑中性",
      positiveClaims: (parsed.positiveClaims || []).map((c: any, i: number) => ({
        id: `llm-pos-${i}`,
        type: "review" as const,
        source: c.source || "社区用户",
        claim: c.claim || "",
        confidence: (c.confidence as "high" | "medium" | "low") || "medium",
        originalText: c.claim || "",
      })),
      negativeClaims: (parsed.negativeClaims || []).map((c: any, i: number) => ({
        id: `llm-neg-${i}`,
        type: "review" as const,
        source: c.source || "社区用户",
        claim: c.claim || "",
        confidence: (c.confidence as "high" | "medium" | "low") || "medium",
        originalText: c.claim || "",
      })),
      disputedClaims: (parsed.disputedClaims || []).map((c: any, i: number) => ({
        id: `llm-disp-${i}`,
        type: "discussion" as const,
        source: c.source || "社区用户",
        claim: c.claim || "",
        confidence: (c.confidence as "high" | "medium" | "low") || "medium",
        originalText: c.claim || "",
      })),
      sizingConsensus: parsed.sizingConsensus || "暂无尺码共识",
      qualityConsensus: parsed.qualityConsensus || "暂无品质共识",
      source: "llm",
    };
  } catch (error) {
    console.warn("❌ 证据提炼 LLM 失败，降级到启发式:", String(error).slice(0, 120));
    return extractEvidenceHeuristic(input);
  }
}

/** 将社区内容格式化为 LLM prompt */
function formatContentForLLM(input: EvidenceExtractionInput): string {
  const parts: string[] = [];
  parts.push(`## 商品：${input.productName}`);

  if (input.reviews.length) {
    parts.push(`\n## 好物评价（${input.reviews.length}条）`);
    for (const r of input.reviews.slice(0, 10)) {
      parts.push(`- [${r.authorId}] ${r.body.slice(0, 150)} （${r.likes}赞）`);
    }
  }

  if (input.discussions.length) {
    parts.push(`\n## 讨论区（${input.discussions.length}条）`);
    for (const d of input.discussions.slice(0, 8)) {
      parts.push(`- [${d.authorId}] 《${d.title}》${d.body.slice(0, 120)} （${d.likes}赞 ${d.comments}评）`);
    }
  }

  if (input.analyses.length) {
    parts.push(`\n## 玩家说（${input.analyses.length}条）`);
    for (const a of input.analyses.slice(0, 5)) {
      parts.push(`- [${a.authorId}] 《${a.title}》${a.body.slice(0, 120)} （${a.likes}赞）`);
    }
  }

  parts.push("\n请分析以上内容，提取关键证据。");
  return parts.join("\n");
}

// ========== 启发式降级（无 API 时使用） ==========

function extractEvidenceHeuristic(input: EvidenceExtractionInput): EvidenceSummary {
  const { reviews, discussions, analyses } = input;

  const positiveClaims: CommunityEvidence[] = [];
  const negativeClaims: CommunityEvidence[] = [];
  const disputedClaims: CommunityEvidence[] = [];

  for (const review of reviews) {
    const body = review.body;
    if (body.includes("好评") || body.includes("不错") || body.includes("推荐") || body.includes("好") || body.includes("升级")) {
      positiveClaims.push({
        id: `ev-${review.id}`,
        type: "review",
        source: review.authorId,
        claim: extractFirstSentence(body, 60),
        confidence: review.likes > 1000 ? "high" : "medium",
        originalText: body,
      });
    }
    if (body.includes("缺点") || body.includes("问题") || body.includes("不足") || body.includes("溢胶") || body.includes("瑕疵") || body.includes("扣一星") || body.includes("慎重")) {
      negativeClaims.push({
        id: `ev-${review.id}-neg`,
        type: "review",
        source: review.authorId,
        claim: extractFirstSentence(body, 60),
        confidence: review.likes > 500 ? "high" : "medium",
        originalText: body,
      });
    }
  }

  for (const disc of discussions) {
    if (disc.title.includes("争议") || disc.title.includes("vs") || disc.title.includes("争论") || disc.title.includes("选哪个") || disc.body.includes("争议")) {
      disputedClaims.push({
        id: `ev-${disc.id}`,
        type: "discussion",
        source: disc.authorId,
        claim: disc.title,
        confidence: disc.likes > 2000 ? "high" : "medium",
        originalText: disc.body,
      });
    }
  }

  for (const analysis of analyses) {
    positiveClaims.push({
      id: `ev-${analysis.id}`,
      type: "analysis",
      source: analysis.authorId,
      claim: analysis.title,
      confidence: "high",
      originalText: analysis.body.slice(0, 200),
    });
  }

  const totalNeg = negativeClaims.length;
  const totalPos = positiveClaims.length;
  const generalSentiment =
    totalPos > totalNeg * 2 ? "多数好评，存在少量品控争议" :
    totalNeg > totalPos * 2 ? "争议较大，建议购买前留意评价" :
    "口碑中性偏正面，存在一些争议点";

  return {
    generalSentiment,
    positiveClaims: positiveClaims.slice(0, 5),
    negativeClaims: negativeClaims.slice(0, 5),
    disputedClaims: disputedClaims.slice(0, 3),
    sizingConsensus: buildSizingConsensus(reviews, discussions),
    qualityConsensus: buildQualityConsensus(reviews, analyses),
    source: "heuristic",
  };
}

function extractFirstSentence(text: string, maxLen: number): string {
  const sentences = text.split(/[。！？.!?]/);
  const first = sentences[0]?.trim() || text.slice(0, maxLen);
  return first.length > maxLen ? first.slice(0, maxLen) + "..." : first;
}

function buildSizingConsensus(reviews: CommunityContent[], discussions: CommunityContent[]): string {
  const relevant = [...reviews, ...discussions].filter(
    (c) => c.body.includes("尺码") || c.body.includes("偏大") || c.body.includes("偏小") || c.body.includes("正码") || c.title.includes("尺码")
  );
  if (relevant.length === 0) return "暂无尺码相关讨论";
  const halfUp = relevant.filter((c) => c.body.includes("大半码")).length;
  const normal = relevant.filter((c) => c.body.includes("正码")).length;
  if (halfUp > normal) return "社区倾向于建议买大半码";
  if (normal > halfUp) return "社区普遍反映正码即可";
  return "社区在尺码上存在分歧：老玩家建议大半码，新买家认为正码 OK";
}

function buildQualityConsensus(reviews: CommunityContent[], analyses: CommunityContent[]): string {
  const relevant = [...reviews, ...analyses].filter(
    (c) => c.body.includes("做工") || c.body.includes("品质") || c.body.includes("品控") || c.body.includes("溢胶") || c.title.includes("品质")
  );
  if (relevant.length === 0) return "暂无品质相关讨论";
  const positive = relevant.filter((c) => c.body.includes("好") || c.body.includes("升级") || c.body.includes("细腻")).length;
  const negative = relevant.filter((c) => c.body.includes("问题") || c.body.includes("溢胶") || c.body.includes("瑕疵")).length;
  if (negative > positive) return "品质争议较大：溢胶是主要槽点，但材质有升级";
  return "品质评价中性：材质有提升，但品控一致性待改善";
}

// ========== 统一入口：LLM 优先，启发式兜底 ==========

export async function extractEvidence(
  input: EvidenceExtractionInput,
  config?: { apiKey: string; baseUrl?: string; model?: string }
): Promise<EvidenceSummary> {
  if (config?.apiKey) {
    return extractEvidenceWithLLM(input, config);
  }
  return extractEvidenceHeuristic(input);
}
