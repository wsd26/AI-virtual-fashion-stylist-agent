/**
 * 能力服务层 (C) — 发布服务
 *
 * 负责：生成穿搭帖文案、标签，模拟审核流程
 */

import { Scene } from "@/types";

export interface PublishDraft {
  caption: string;
  tags: string[];
  target: "穿搭精选" | "讨论区";
}

export interface PublishResult {
  draft: PublishDraft;
  moderation: {
    passed: boolean;
    flags: string[];
  };
}

const CAPTION_TEMPLATES: Record<Scene, string[]> = {
  street: [
    "街头不设限，经典就是经典 🔥",
    "一套街头 look，AJ 是灵魂",
    "出街标配，不用思考的搭配",
  ],
  campus: [
    "校园日常 OOTD，舒服最重要",
    "上课怎么穿？这双就够了",
    "同学说这双很顶 🤙",
  ],
  sports: [
    "运动场边最靓的仔",
    "不是上场穿的，是场边看的 👀",
    "运动休闲风 yyds",
  ],
  cafe: [
    "咖啡店下午茶 OOTD ☕",
    "clean fit 配一杯拿铁刚好",
    "周末约会穿搭，简单有质感",
  ],
  festival: [
    "音乐节炸场穿搭 🎵",
    "灯光下的撞色搭配，回头率拉满",
    "音乐节就要大胆穿！",
  ],
};

const TAG_POOLS: Record<string, string[]> = {
  street: ["#街头穿搭", "#AJ1", "#OOTD", "#今日穿搭"],
  campus: ["#校园穿搭", "#学生党OOTD", "#日常穿搭"],
  sports: ["#运动休闲", "#球场穿搭", "#潮流运动"],
  cafe: ["#约会穿搭", "#cleanfit", "#质感穿搭", "#咖啡店OOTD"],
  festival: ["#音乐节穿搭", "#撞色搭配", "#炸场穿搭", "#音乐节OOTD"],
  general: ["#得物穿搭", "#潮流穿搭", "#OOTD", "#今日穿搭"],
};

/** 生成发布草稿 */
export function generateDraft(
  scene: Scene,
  productName: string,
  userStyle?: string
): PublishDraft {
  const captions = CAPTION_TEMPLATES[scene] || CAPTION_TEMPLATES.street;
  const caption = captions[Math.floor(Math.random() * captions.length)];
  const stylePrefix = userStyle && userStyle !== "未知" ? `${userStyle} · ` : "";

  const sceneTags = TAG_POOLS[scene] || TAG_POOLS.general;
  const tags = [
    ...sceneTags.slice(0, 2),
    `#${productName.replace(/\s+/g, "")}`,
    ...TAG_POOLS.general.slice(0, 1),
  ];

  return {
    caption: stylePrefix + caption,
    tags: [...new Set(tags)],
    target: "穿搭精选",
  };
}

/** 模拟审核 */
export function moderateContent(draft: PublishDraft): PublishResult["moderation"] {
  const flags: string[] = [];

  if (draft.caption.length > 200) {
    flags.push("文案过长，建议控制在 200 字以内");
  }
  if (draft.tags.length > 10) {
    flags.push("标签过多，建议不超过 10 个");
  }
  if (!draft.caption.trim()) {
    flags.push("文案不能为空");
  }

  return {
    passed: flags.length === 0,
    flags,
  };
}

/** 生成发布成功数据 */
export function publishResult(draft: PublishDraft) {
  return {
    ...draft,
    likes: Math.floor(Math.random() * 200) + 50,
    comments: Math.floor(Math.random() * 30) + 5,
    shares: Math.floor(Math.random() * 15) + 3,
    publishedAt: new Date().toISOString(),
  };
}
