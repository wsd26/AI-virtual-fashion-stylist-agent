# AI 虚拟穿搭伙伴 Agent

社区电商场景下的 AI 穿搭助手，嵌入商品详情页，提供虚拟试穿、搭配推荐、社区评价解读、一键发布等能力。

**在线体验**: [https://wsd26.github.io/AI-virtual-fashion-stylist-agent/](https://wsd26.github.io/AI-virtual-fashion-stylist-agent/)

## 核心功能

- **AI 虚拟试穿** — 5 种场景 × 5 种天气共 25 种组合，实时生成上身效果
- **智能搭配推荐** — 3 套方案横向滑动，社区高赞穿搭参考，5 维度评分排序
- **社区评价解读** — Agent 提炼评价正负面观点、争议点、尺码共识，附来源引用
- **一键发布** — AI 生成文案 + 标签，穿搭精选/讨论区分发
- **订单购买** — 单品/整套加购，支付模拟

## 技术架构

5 层 Agent 架构：

```
A 层 会话状态管理  →  场景/天气/用户形象/对话历史
B 层 主对话 Agent  →  意图识别（11 种）→ 模型路由 → SSE 流式输出
C 层 服务层       →  搭配排序、社区召回、商品检索、试穿、识别、发布
D 层 子 Agent     →  探索 Agent、证据提炼 Agent
E 层 验证 Agent   →  幻觉检测、一致性校验、合规检查
```

- **意图模型路由**: COMPLEX_INTENTS → DeepSeek V4 Pro，其他 → DeepSeek V4 Flash
- **证据缓存**: 异步 LLM 提取，不阻塞首次回复
- **降级兜底**: API 不可用时自动切换至 70+ 条预写回复模板

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 + React 19 + TypeScript 5 |
| 样式 | TailwindCSS v4 |
| AI | DeepSeek V4 Pro / Flash |
| 流式 | SSE Streaming |
| 试穿 | IDM-VTON (Replicate) |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看。

## 项目结构

```
web-demo/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/
│   │   │   ├── generate-avatar/  # 形象生成 API
│   │   │   └── tryon/            # 虚拟试穿 API
│   │   ├── layout.tsx
│   │   └── page.tsx              # 主页面（商详页 + 对话面板）
│   ├── components/
│   │   ├── ChatBubble.tsx        # 聊天气泡组件
│   │   ├── ChatPanel.tsx         # 对话面板（半屏/全屏/隐藏）
│   │   ├── ClientProviders.tsx   # 客户端 Providers
│   │   ├── ProductDetail.tsx     # 商品详情页
│   │   └── WelcomeGuide.tsx      # 首访引导
│   ├── lib/
│   │   ├── agent.ts              # B 层：主对话 Agent
│   │   ├── community.ts          # 社区数据
│   │   ├── mock.ts               # 模拟数据（70+ 回复模板）
│   │   ├── userProfile.tsx       # 用户形象管理
│   │   ├── agents/
│   │   │   ├── evidence.ts       # D 层：证据提炼 Agent
│   │   │   ├── explorer.ts       # D 层：搭配探索 Agent
│   │   │   └── verifier.ts       # E 层：验证 Agent
│   │   ├── services/
│   │   │   ├── community.ts      # C 层：社区内容召回
│   │   │   ├── outfit.ts         # C 层：搭配排序
│   │   │   ├── product.ts        # C 层：商品检索
│   │   │   ├── publish.ts        # C 层：发布文案生成
│   │   │   ├── recognition.ts    # C 层：人体/服饰识别
│   │   │   └── tryon.ts          # C 层：虚拟试穿
│   │   └── state/
│   │       └── session.ts        # A 层：会话状态
│   └── types/
│       └── index.ts              # 类型定义
├── public/                       # 静态资源
└── package.json
```

## 环境变量

```bash
# DeepSeek API（必需）
DEEPSEEK_API_KEY=your_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# Replicate API（虚拟试穿，可选，无 API 时使用模拟效果）
REPLICATE_API_KEY=your_api_key
```

## 文档

详细产品设计见 [PRD.md](https://github.com/wsd26/AI-virtual-fashion-stylist-agent/blob/main/AI虚拟穿搭伙伴agent作品集/PRD.md)（本地 `AI虚拟穿搭伙伴agent作品集/` 目录）。
