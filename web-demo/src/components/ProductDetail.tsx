"use client";

import { useState } from "react";
import { mockProduct } from "@/lib/mock";

type CommunityTab = "outfit" | "review" | "discussion" | "player";

const TABS: [CommunityTab, string][] = [
  ["outfit", "穿搭精选"],
  ["review", "好物评价"],
  ["discussion", "讨论"],
  ["player", "玩家说"],
];

const OUTFIT_POSTS = [
  { user: "@潮人小张", likes: "2.3k", style: "街头风 AJ1 穿搭", color: "bg-blue-100" },
  { user: "@穿搭达人Lily", likes: "1.8k", style: "Clean Fit 日常搭配", color: "bg-green-100" },
  { user: "@球鞋阿Ken", likes: "3.1k", style: "机能风搭配参考", color: "bg-purple-100" },
  { user: "@潮玩少女", likes: "987", style: "甜酷风 AJ1 上脚", color: "bg-pink-100" },
];

const REVIEWS = [
  {
    stars: "★★★★★",
    text: "脚感真的绝了，比上一批复刻好太多。尺码正，不用买大。唯一的槽点是鞋头有一点溢胶，不仔细看看不出来。",
    user: "@球鞋小白",
    time: "3天前",
  },
  {
    stars: "★★★★☆",
    text: "颜值在线但做工一般。建议买之前去看看实物，鞋头溢胶是普遍现象。不过好看是真的好看。",
    user: "@老鞋头",
    time: "1周前",
  },
];

const DISCUSSIONS = [
  { topic: "这批复刻和上次的到底差在哪？求老玩家对比", replies: 230 },
  { topic: "为什么我的鞋头溢胶这么严重？是我中奖了吗", replies: 156 },
  { topic: "大家觉得这个配色是买大还是买小？", replies: 89 },
];

interface ProductDetailProps {
  className?: string;
}

export default function ProductDetail({ className }: ProductDetailProps) {
  const [activeTab, setActiveTab] = useState<CommunityTab>("outfit");

  return (
    <div className={className}>
      {/* 商品主图 */}
      <div className="aspect-square bg-gradient-to-br from-red-50 to-gray-100 flex items-center justify-center relative overflow-hidden">
        <div className="text-center">
          <div className="text-8xl mb-4">👟</div>
          <div className="text-2xl font-black text-red-600">AJ1 Chicago</div>
          <div className="text-sm text-gray-400 mt-1">AI 生成示例图</div>
        </div>
        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          1/3
        </div>
      </div>

      {/* 商品信息 */}
      <div className="px-4 py-3 bg-white">
        <div className="text-xs text-red-500 font-medium mb-1">NIKE</div>
        <h1 className="text-lg font-bold text-gray-900 leading-tight">
          {mockProduct.name}
        </h1>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-2xl font-black text-red-600">¥{mockProduct.price}</span>
          <span className="text-xs text-gray-400 line-through">¥1699</span>
          <span className="text-xs text-red-500">已售 {mockProduct.salesCount.toLocaleString()} 双</span>
        </div>
        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
          <span className="text-yellow-500">★★★★★</span>
          <span className="font-bold">{mockProduct.rating}</span>
          <span className="text-gray-400">({(mockProduct.ratingCount / 10000).toFixed(1)}万评价)</span>
        </div>
      </div>

      {/* 尺码选择 */}
      <div className="px-4 py-3 bg-white border-t border-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">尺码选择</span>
          <span className="text-sm text-gray-400">36-47.5 码可选 →</span>
        </div>
      </div>

      {/* 社群模块 Tab */}
      <div className="mt-2 bg-white">
        {/* Tab 切换栏 */}
        <div className="flex border-b border-gray-100">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-3 text-sm font-medium text-center transition-all ${
                activeTab === key
                  ? "text-gray-900 border-b-2 border-gray-900"
                  : "text-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 穿搭精选 */}
        {activeTab === "outfit" && (
          <div className="p-4 grid grid-cols-2 gap-3">
            {OUTFIT_POSTS.map((post, i) => (
              <div key={i} className="space-y-2">
                <div className={`aspect-[3/4] ${post.color} rounded-lg flex items-center justify-center text-3xl`}>
                  👟
                </div>
                <div className="text-xs text-gray-500">{post.style}</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{post.user}</span>
                  <span className="text-gray-300">❤ {post.likes}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 好物评价 */}
        {activeTab === "review" && (
          <div className="px-4 py-4">
            <div className="text-sm font-medium text-gray-700 mb-3">精选评价</div>
            <div className="space-y-4">
              {REVIEWS.map((review, i) => (
                <div key={i} className="text-sm text-gray-600">
                  <span className="text-yellow-500">{review.stars}</span>
                  <p className="mt-1">{review.text}</p>
                  <p className="text-xs text-gray-400 mt-1">{review.user} · {review.time}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 讨论 */}
        {activeTab === "discussion" && (
          <div className="px-4 py-4">
            <div className="text-sm font-medium text-gray-700 mb-3">热门讨论</div>
            <div className="space-y-3">
              {DISCUSSIONS.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-red-400">🔥</span>
                  <span className="flex-1">{d.topic}</span>
                  <span className="text-xs text-gray-400 shrink-0">{d.replies}条回复</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 玩家说 */}
        {activeTab === "player" && (
          <div className="px-4 py-4 pb-6">
            <div className="text-sm font-medium text-gray-700 mb-3">玩家说</div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-gray-300 rounded-full" />
                <span className="text-sm font-medium">@球鞋阿聪</span>
                <span className="text-xs text-gray-400">硬核玩家</span>
              </div>
              <p className="text-sm text-gray-600">
                拆了一双，中底科技没缩水，鞋面用料比上批好。但是胶水控制确实有问题，建议官方加强品控。整体来说还是值得买的，毕竟这个配色不会过时。
              </p>
              <p className="text-xs text-gray-400 mt-2">阅读 2.3万 · 点赞 1.8k</p>
            </div>
          </div>
        )}
      </div>

      {/* 底部占位 */}
      <div className="h-28" />
    </div>
  );
}
