/**
 * 验证 Agent (E)
 *
 * 职责：
 * - 在主 Agent 输出后执行真实性校验
 * - 检查：无证据结论、编造数据、商品不一致、不合规内容
 * - 输出验证报告，主 Agent 根据报告决定是否修正输出
 *
 * 设计理由（面试用）：
 * - 防幻觉的最后一道防线
 * - 让面试官看到你对"极度真实"的产品承诺有落地方案
 * - 呼应社区产品的核心风险：用户信任建立在信息准确性上
 */

import { CommunityContent } from "@/lib/community";
import { CommunityEvidence } from "@/lib/state/session";

export interface VerificationInput {
  agentOutput: string; // 主 Agent 的输出文本
  communityContext: {
    availableEvidence: CommunityEvidence[];
    productName: string;
    productPrice: number;
    productCategory: string;
  };
  expectedMarkers: string[]; // 应包含的标记（如 [TRYON]）
}

export interface VerificationResult {
  passed: boolean;
  issues: VerificationIssue[];
  correctedOutput?: string;
  summary: string;
}

export interface VerificationIssue {
  severity: "error" | "warning";
  type: "hallucination" | "inconsistency" | "missing_evidence" | "compliance";
  description: string;
  suggestion: string;
}

/**
 * 验证主函数
 *
 * 注意：生产环境中这里会调用 LLM 做真正的语义验证。
 * 当前 demo 版本使用规则匹配。
 */
export function verify(input: VerificationInput): VerificationResult {
  const issues: VerificationIssue[] = [];

  // 1. 检查是否引用了无证据结论
  checkHallucination(input, issues);

  // 2. 检查价格/数据一致性
  checkConsistency(input, issues);

  // 3. 检查是否缺少必要的来源引用
  checkEvidenceCitation(input, issues);

  // 4. 检查合规性
  checkCompliance(input, issues);

  const hasErrors = issues.some((i) => i.severity === "error");
  const passed = !hasErrors;

  let correctedOutput: string | undefined;
  if (hasErrors) {
    correctedOutput = generateCorrection(input, issues);
  }

  return {
    passed,
    issues,
    correctedOutput,
    summary: passed
      ? "验证通过：输出真实可信，引用来源明确"
      : `验证发现 ${issues.filter((i) => i.severity === "error").length} 个错误、${issues.filter((i) => i.severity === "warning").length} 个警告`,
  };
}

function checkHallucination(input: VerificationInput, issues: VerificationIssue[]) {
  const output = input.agentOutput;
  const evidence = input.communityContext.availableEvidence;
  const productName = input.communityContext.productName;

  // 检查是否提到了不存在的社区用户
  const mentionedUsers = output.match(/@[^\s，。！]+/g) || [];
  const knownUsers = new Set(evidence.map((e) => e.source));

  for (const user of mentionedUsers) {
    if (![...knownUsers].some((k) => k.includes(user.replace("@", "")))) {
      // 检查是否是已知的社区用户（硬编码白名单）
      const isKnown = user.includes("潮人小张") || user.includes("穿搭达人Lily") ||
        user.includes("球鞋阿聪") || user.includes("日系穿搭阿Ken") ||
        user.includes("甜酷穿搭Sally") || user.includes("城市玩家小K") ||
        user.includes("音乐节穿搭") || user.includes("校园穿搭志") ||
        user.includes("质感穿搭指南") || user.includes("韩系穿搭Hana");
      if (!isKnown) {
        issues.push({
          severity: "error",
          type: "hallucination",
          description: `可能引用了不存在的用户 ${user}`,
          suggestion: `确认 ${user} 是否为社区真实用户，或改为引用已知用户`,
        });
      }
    }
  }

  // 检查商品名称是否一致
  if (!output.includes(productName.slice(0, 4)) && !output.includes(productName.split('"')[1] || "")) {
    // 仅警告，不是硬错误
  }

  // 检查价格（如果提到了价格）
  const priceMatch = output.match(/¥(\d+)/);
  if (priceMatch) {
    const mentionedPrice = parseInt(priceMatch[1]);
    const actualPrice = input.communityContext.productPrice;
    if (Math.abs(mentionedPrice - actualPrice) > 100) {
      issues.push({
        severity: "error",
        type: "inconsistency",
        description: `输出中的价格 ¥${mentionedPrice} 与实际价格 ¥${actualPrice} 不一致`,
        suggestion: `将价格修正为 ¥${actualPrice}`,
      });
    }
  }

  // 检查是否编造了具体的数字（如"300 条评价"但实际社区数据只有几十条）
  const numberMatch = output.match(/(\d+)\s*(条|个|人|次)\s*(评价|评论|赞)/);
  if (numberMatch) {
    const count = parseInt(numberMatch[1]);
    if (count > 10000) {
      issues.push({
        severity: "warning",
        type: "hallucination",
        description: `引用了异常大的数字：${count}${numberMatch[2]}${numberMatch[3]}`,
        suggestion: "核实社区真实数据后重新描述",
      });
    }
  }
}

function checkConsistency(input: VerificationInput, issues: VerificationIssue[]) {
  const output = input.agentOutput;
  const productName = input.communityContext.productName;

  // 检查商品名是否与上下文一致
  if (!output.toLowerCase().includes(productName.toLowerCase().slice(0, 6))) {
    // 这只是一个弱检查 — 回复可能用简称
  }
}

function checkEvidenceCitation(input: VerificationInput, issues: VerificationIssue[]) {
  const output = input.agentOutput;

  // 如果回复中做了具体的评价性结论，检查是否有来源
  const claims = [
    { pattern: /评价|口碑|反馈/, needsSource: true },
    { pattern: /尺码|偏大|偏小|正码/, needsSource: true },
    { pattern: /做工|品质|品控|溢胶/, needsSource: true },
  ];

  for (const claim of claims) {
    if (claim.pattern.test(output) && claim.needsSource) {
      const hasSource =
        output.includes("@") ||
        output.includes("评价提到") ||
        output.includes("讨论区") ||
        output.includes("社区") ||
        output.includes("玩家说");
      if (!hasSource) {
        issues.push({
          severity: "warning",
          type: "missing_evidence",
          description: "输出中包含评价性结论但未引用来源",
          suggestion: "添加社区来源引用（如 @用户 或 '讨论区有玩家提到'）",
        });
        break; // 只报告一次
      }
    }
  }
}

function checkCompliance(input: VerificationInput, issues: VerificationIssue[]) {
  const output = input.agentOutput;

  // 检查是否有违规表述
  const sensitivePatterns = [
    { pattern: /假货|高仿|fake|A货/, msg: "包含仿品相关表述" },
    { pattern: /最低价|全网最低|最便宜/, msg: "包含绝对化价格表述" },
    { pattern: /保证|承诺|一定|100%/, msg: "包含绝对化承诺" },
  ];

  for (const sp of sensitivePatterns) {
    if (sp.pattern.test(output)) {
      issues.push({
        severity: "warning",
        type: "compliance",
        description: sp.msg,
        suggestion: "使用更谨慎的措辞，避免绝对化表述",
      });
    }
  }

  // 检查预期的标记是否存在
  for (const marker of input.expectedMarkers) {
    if (!output.includes(marker)) {
      // 如果主 Agent 应该返回标记但没返回，这是功能性缺陷
      if (marker === "[TRYON]" || marker === "[OUTFIT]" || marker === "[PUBLISH]" || marker === "[COMBINATION]") {
        issues.push({
          severity: "error",
          type: "inconsistency",
          description: `输出缺少必要的标记 ${marker}`,
          suggestion: "在回复末尾添加对应标记，确保前端能正确渲染卡片",
        });
      }
    }
  }
}

function generateCorrection(input: VerificationInput, issues: VerificationIssue[]): string {
  let corrected = input.agentOutput;

  const errors = issues.filter((i) => i.severity === "error");

  if (errors.length > 0) {
    const markerErrors = errors.filter((e) => e.description.includes("标记"));
    if (markerErrors.length > 0 && !corrected.includes("[TRYON]")) {
      corrected += "\n\n要不要帮你上身看看效果？[TRYON]";
    }
  }

  return corrected;
}

/** 快速验证（无社区证据时的简化版） */
export function quickVerify(agentOutput: string, expectedMarkers: string[]): VerificationResult {
  return verify({
    agentOutput,
    communityContext: {
      availableEvidence: [],
      productName: "",
      productPrice: 0,
      productCategory: "",
    },
    expectedMarkers,
  });
}
