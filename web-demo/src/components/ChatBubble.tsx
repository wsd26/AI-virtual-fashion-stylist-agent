"use client";

import { useState } from "react";
import {
  Message,
  TryOnCard,
  OutfitCards,
  PublishCard,
  CombinationTryOnCard,
  PurchaseCard,
  PublishSuccessCard,
  Scene,
  Weather,
  SCENE_OPTIONS,
  WEATHER_OPTIONS,
  OutfitPlan,
  OutfitItem,
} from "@/types";
import { useUserProfile } from "@/lib/userProfile";

interface ChatBubbleProps {
  message: Message;
  onAction?: (action: string, itemId?: string) => void;
  onSceneWeatherChange?: (scene: Scene, weather: Weather) => void;
}

export default function ChatBubble({ message, onAction, onSceneWeatherChange }: ChatBubbleProps) {
  const isAgent = message.role === "agent";
  const { getPersonImage } = useUserProfile();
  const userPhoto = !isAgent ? getPersonImage() : null;

  return (
    <div className={`flex ${isAgent ? "justify-start" : "justify-end"} mb-4`}>
      {isAgent && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center text-white text-sm font-bold shrink-0 mr-2 mt-1">
          🤖
        </div>
      )}
      <div className={`max-w-[80%] ${isAgent ? "" : "order-2"}`}>
        {/* 文字气泡 */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isAgent
              ? "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
              : "bg-gray-900 text-white rounded-tr-sm"
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* 卡片附件 */}
        {message.card && (
          <div className="mt-2">
            {message.card.type === "tryon" && (
              <TryOnCardView
                card={message.card}
                onAction={onAction!}
                onSceneWeatherChange={onSceneWeatherChange}
              />
            )}
            {message.card.type === "outfit" && (
              <OutfitCardView card={message.card} onAction={onAction!} />
            )}
            {message.card.type === "publish" && (
              <PublishCardView card={message.card} onAction={onAction!} />
            )}
            {message.card.type === "combination_tryon" && (
              <CombinationTryOnCardView card={message.card} onAction={onAction!} />
            )}
            {message.card.type === "publish_success" && (
              <PublishSuccessCardView card={message.card} onAction={onAction!} />
            )}
            {message.card.type === "purchase" && (
              <PurchaseCardView card={message.card} onAction={onAction!} />
            )}
          </div>
        )}
      </div>
      {!isAgent && (
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold shrink-0 ml-2 mt-1 order-3 overflow-hidden">
          {userPhoto ? (
            <img src={userPhoto} alt="我" className="w-full h-full object-cover" />
          ) : (
            "我"
          )}
        </div>
      )}
    </div>
  );
}

function TryOnCardView({
  card,
  onAction,
  onSceneWeatherChange,
}: {
  card: TryOnCard;
  onAction: (action: string, itemId?: string) => void;
  onSceneWeatherChange?: (scene: Scene, weather: Weather) => void;
}) {
  const [activeScene, setActiveScene] = useState<Scene>(card.activeScene || "street");
  const [activeWeather, setActiveWeather] = useState<Weather>(card.activeWeather || "sunny");
  const [regenerating, setRegenerating] = useState(false);

  const handleSceneChange = async (scene: Scene) => {
    if (scene === activeScene || regenerating) return;
    setRegenerating(true);
    await new Promise((r) => setTimeout(r, 1200));
    setActiveScene(scene);
    setRegenerating(false);
    onSceneWeatherChange?.(scene, activeWeather);
  };

  const handleWeatherChange = async (weather: Weather) => {
    if (weather === activeWeather || regenerating) return;
    setRegenerating(true);
    await new Promise((r) => setTimeout(r, 1200));
    setActiveWeather(weather);
    setRegenerating(false);
    onSceneWeatherChange?.(activeScene, weather);
  };

  const sceneBg = getSceneBackground(activeScene, activeWeather);
  const hasImage = card.imageUrl && !card.imageUrl.startsWith("generating:");

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* 试穿图像区域 + 场景天气叠加 */}
      <div className={`aspect-[4/5] relative ${sceneBg} flex items-center justify-center overflow-hidden`}>
        {/* 实际生成的试穿图像 */}
        {hasImage && (
          <img
            src={card.imageUrl}
            alt="AI 试穿效果"
            className="absolute inset-0 w-full h-full object-cover z-10"
          />
        )}

        {/* 天气叠加层 */}
        {activeWeather === "rainy" && <RainOverlay />}
        {activeWeather === "snowy" && <SnowOverlay />}
        {activeWeather === "sunny" && <SunOverlay />}
        {activeWeather === "sunset" && <SunsetOverlay />}

        {/* 主体内容 - 无真实图片时使用用户照片合成 */}
        {!hasImage && (
          <MockTryOnPreview scene={activeScene} weather={activeWeather} />
        )}

        {/* 加载/生成状态 */}
        {(regenerating || card.imageUrl?.startsWith("generating:")) && (
          <div className="absolute inset-0 z-30 bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-black/50 backdrop-blur rounded-full px-4 py-2 flex items-center gap-2">
              <div className="flex gap-0.5">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-100" />
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-200" />
              </div>
              <span className="text-white text-xs">
                {card.imageUrl?.startsWith("generating:") ? "AI 生成试穿效果中..." : "重新生成中..."}
              </span>
            </div>
          </div>
        )}

        {/* 场景标签 */}
        {!regenerating && !card.imageUrl?.startsWith("generating:") && (
          <div className="absolute bottom-3 left-3 right-3 z-30">
            <div className="bg-black/40 backdrop-blur rounded-full px-3 py-1 inline-block">
              <span className="text-white text-xs">
                {WEATHER_OPTIONS.find((w) => w.key === activeWeather)?.icon}{" "}
                {SCENE_OPTIONS.find((s) => s.key === activeScene)?.label}{" "}
                {hasImage ? "AI 试穿效果" : "试穿预览"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 场景选择器 */}
      <div className="px-3 pt-3">
        <div className="text-xs text-gray-400 mb-2">场景</div>
        <div className="flex gap-1.5 flex-wrap">
          {SCENE_OPTIONS.map((scene) => (
            <button
              key={scene.key}
              onClick={() => handleSceneChange(scene.key)}
              disabled={regenerating}
              className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeScene === scene.key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              } disabled:opacity-50`}
            >
              {scene.icon} {scene.label}
            </button>
          ))}
        </div>
      </div>

      {/* 天气选择器 */}
      <div className="px-3 pt-2">
        <div className="text-xs text-gray-400 mb-2">天气</div>
        <div className="flex gap-1.5 flex-wrap">
          {WEATHER_OPTIONS.map((weather) => (
            <button
              key={weather.key}
              onClick={() => handleWeatherChange(weather.key)}
              disabled={regenerating}
              className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeWeather === weather.key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              } disabled:opacity-50`}
            >
              {weather.icon} {weather.label}
            </button>
          ))}
        </div>
      </div>

      {/* 适配标注 */}
      <div className="p-3 space-y-2">
        {card.annotations.map((a, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span>{a.icon}</span>
            <span className="text-gray-700">{a.text}</span>
            {a.source && (
              <span className="text-blue-500 shrink-0 ml-auto cursor-pointer hover:underline">
                → 来源
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="px-3 pb-3 flex gap-2">
        <button
          onClick={() => onAction("outfit")}
          className="flex-1 py-2 bg-gray-900 text-white text-xs rounded-lg font-medium hover:bg-gray-800"
        >
          怎么搭？
        </button>
        <button
          onClick={() => onAction("review")}
          className="flex-1 py-2 border border-gray-200 text-gray-700 text-xs rounded-lg font-medium hover:bg-gray-50"
        >
          评价怎么说
        </button>
        <button
          onClick={() => onAction("publish")}
          className="flex-1 py-2 border border-gray-200 text-gray-700 text-xs rounded-lg font-medium hover:bg-gray-50"
        >
          发社区
        </button>
      </div>
    </div>
  );
}

// 场景背景色
function getSceneBackground(scene: Scene, weather: Weather): string {
  const sceneMap: Record<Scene, string> = {
    street: "from-amber-100 via-gray-100 to-blue-100",
    campus: "from-green-100 via-emerald-50 to-yellow-100",
    sports: "from-red-100 via-orange-50 to-gray-100",
    cafe: "from-yellow-100 via-amber-50 to-brown-100",
    festival: "from-purple-200 via-pink-100 to-indigo-200",
  };

  const weatherMap: Record<Weather, string> = {
    sunny: "brightness-110 saturate-110",
    cloudy: "brightness-90 saturate-75",
    rainy: "brightness-75 saturate-60",
    snowy: "brightness-105 saturate-50",
    sunset: "brightness-95 saturate-130 hue-rotate-[15deg]",
  };

  return `bg-gradient-to-br ${sceneMap[scene]} ${weatherMap[weather]}`;
}

// 无 API 时的照片合成预览（用真实照片而非 emoji 占位）
function MockTryOnPreview({ scene, weather }: { scene: Scene; weather: Weather }) {
  const { getPersonImage } = useUserProfile();
  const personImage = getPersonImage();
  const sceneEmoji: Record<Scene, string> = {
    street: "🏙", campus: "🎓", sports: "🏟", cafe: "☕", festival: "🎵",
  };
  const weatherEmoji: Record<Weather, string> = {
    sunny: "☀️", cloudy: "☁️", rainy: "🌧", snowy: "❄️", sunset: "🌅",
  };

  return (
    <div className="relative z-10 w-full h-full">
      {/* 用户照片作为人物底图 */}
      {personImage ? (
        <img
          src={personImage}
          alt="你的形象照"
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-7xl drop-shadow-lg">{sceneEmoji[scene]}</div>
        </div>
      )}

      {/* 场景/天气标记 */}
      <div className="absolute top-3 left-3 z-20 flex gap-1.5">
        <span className="bg-black/50 backdrop-blur rounded-full px-2.5 py-1 text-white text-xs">
          {sceneEmoji[scene]} {SCENE_OPTIONS.find((o) => o.key === scene)?.label}
        </span>
        <span className="bg-black/50 backdrop-blur rounded-full px-2.5 py-1 text-white text-xs">
          {weatherEmoji[weather]} {WEATHER_OPTIONS.find((o) => o.key === weather)?.label}
        </span>
      </div>

      {/* 商品指示 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-black/40 backdrop-blur rounded-full px-3 py-1.5 flex items-center gap-2">
          <span className="text-lg">👟</span>
          <span className="text-white text-xs">AJ1 芝加哥 · 试穿预览</span>
        </div>
      </div>

      {/* 无照片时的提示 */}
      {!personImage && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 bg-orange-400/90 backdrop-blur rounded-full px-3 py-1">
          <span className="text-white text-xs">上传照片后可看到真实试穿效果 →</span>
        </div>
      )}
    </div>
  );
}

// 天气叠加效果组件
function RainOverlay() {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
      <div className="rain-container">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="rain-drop"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${0.5 + Math.random() * 0.5}s`,
              opacity: 0.3 + Math.random() * 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SnowOverlay() {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="snow-flake"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
            fontSize: `${0.5 + Math.random() * 1}rem`,
            opacity: 0.4 + Math.random() * 0.5,
          }}
        >
          ❄
        </div>
      ))}
    </div>
  );
}

function SunOverlay() {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      <div className="absolute top-3 right-4 text-4xl opacity-60 animate-pulse">
        ☀️
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 80% 10%, rgba(255,200,50,0.3) 0%, transparent 50%)",
        }}
      />
    </div>
  );
}

function SunsetOverlay() {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      <div className="absolute top-3 right-4 text-4xl opacity-60">🌅</div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,150,50,0.25) 0%, rgba(255,100,100,0.15) 50%, transparent 100%)",
        }}
      />
    </div>
  );
}

function ProductItemImage({ item }: { item: OutfitItem }) {
  const [imgError, setImgError] = useState(false);

  return (
    <a
      href={item.productUrl || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg shrink-0 overflow-hidden"
      title={`查看「${item.name}」详情`}
    >
      {item.imageUrl && !imgError ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        item.emoji
      )}
    </a>
  );
}

function OutfitCardView({
  card,
  onAction,
}: {
  card: OutfitCards;
  onAction: (action: string, itemId?: string) => void;
}) {
  const sceneInfo = SCENE_OPTIONS.find((o) => o.key === card.scene);
  const weatherInfo = WEATHER_OPTIONS.find((o) => o.key === card.weather);

  return (
    <div className="space-y-3">
      {/* 场景天气标签 */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
          {sceneInfo?.icon} {sceneInfo?.label}
        </span>
        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
          {weatherInfo?.icon} {weatherInfo?.label}
        </span>
        <span className="text-xs text-gray-400">
          为你匹配 {card.plans.length} 套社区高赞穿搭
        </span>
      </div>

      {/* 方案卡片横向滑动 */}
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
        {card.plans.map((plan) => (
          <OutfitPlanCard
            key={plan.id}
            plan={plan}
            onAction={onAction}
          />
        ))}
      </div>

      {/* 底部操作 */}
      <div className="flex gap-2 px-1">
        <button
          onClick={() => onAction("reshuffle")}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          ← 换一批
        </button>
        <button
          onClick={() => onAction("publish")}
          className="text-xs text-blue-500 hover:text-blue-700 ml-auto"
        >
          发到社区 →
        </button>
      </div>
    </div>
  );
}

function OutfitPlanCard({
  plan,
  onAction,
}: {
  plan: OutfitPlan;
  onAction: (action: string, itemId?: string) => void;
}) {
  return (
    <div className="min-w-[240px] bg-white border border-gray-200 rounded-xl p-3 shrink-0 snap-start">
      {/* 方案标题 */}
      <div className="text-sm font-bold text-gray-900">{plan.name}</div>
      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
        <span>{plan.style}</span>
        <span className="text-gray-300">·</span>
        <span>{plan.sceneTip}</span>
      </div>

      {/* 社区参考 */}
      {plan.referenceUser && (
        <div className="flex items-center gap-1 mt-2 text-xs text-blue-500 bg-blue-50 rounded-lg px-2 py-1">
          <span>📸</span>
          <span>{plan.referenceUser} 类似穿搭</span>
          <span className="ml-auto">→</span>
        </div>
      )}

      {/* 单品列表 */}
      <div className="mt-3 space-y-2">
        {plan.items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-2 p-2 rounded-lg ${
              item.isCurrentProduct
                ? "bg-gray-50 border border-gray-200"
                : "hover:bg-gray-50"
            }`}
          >
            {/* 单品图片 */}
            <ProductItemImage item={item} />
            {/* 单品信息 */}
            <div className="flex-1 min-w-0">
              <a
                href={item.productUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-gray-800 truncate block hover:text-blue-600 hover:underline"
              >
                {item.name}
                {item.isCurrentProduct && (
                  <span className="ml-1 text-xs text-red-500">当前商品</span>
                )}
              </a>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <span>{item.category}</span>
                <span>·</span>
                <span className="text-red-500 font-medium">¥{item.price}</span>
              </div>
            </div>
            {/* 操作按钮 */}
            {item.isCurrentProduct ? (
              <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full shrink-0">
                已上身
              </span>
            ) : (
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction("tryOnItem", item.id);
                  }}
                  className="text-xs bg-gray-900 text-white px-2 py-1 rounded-full hover:bg-gray-700 transition-colors"
                >
                  试穿
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction("addCartItem", item.id);
                  }}
                  className="text-xs bg-red-500 text-white px-2 py-1 rounded-full hover:bg-red-600 transition-colors"
                >
                  加购
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 组合上身 + 加购按钮 */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onAction("combinationTryOn")}
          className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 text-xs rounded-lg font-medium hover:bg-gray-50"
        >
          👔 组合上身
        </button>
        <button
          onClick={() => onAction("addCart")}
          className="flex-1 py-2 bg-red-500 text-white text-xs rounded-lg font-medium hover:bg-red-600"
        >
          加购整套 ¥{plan.totalPrice}
        </button>
      </div>
    </div>
  );
}

// 组合上身卡片
function CombinationTryOnCardView({
  card,
  onAction,
}: {
  card: CombinationTryOnCard;
  onAction: (action: string, itemId?: string) => void;
}) {
  const sceneLabel = SCENE_OPTIONS.find((o) => o.key === card.scene)?.label;
  const weatherIcon = WEATHER_OPTIONS.find((o) => o.key === card.weather)?.icon;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* 组合上身效果图 */}
      <div className="aspect-[4/5] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative">
        <div className="text-center relative z-10">
          <div className="text-5xl mb-2">🧑</div>
          <div className="flex items-center justify-center gap-2">
            {card.items.map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-3xl drop-shadow-md">{item.emoji}</span>
                <span className="text-[10px] text-gray-500 mt-0.5">{item.name.length > 6 ? item.name.slice(0, 6) + "…" : item.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 bg-black/50 backdrop-blur rounded-full px-3 py-1 inline-block">
            <span className="text-white text-xs">
              {weatherIcon} {sceneLabel} · AI 组合上身效果
            </span>
          </div>
        </div>
      </div>

      {/* 单品列表 */}
      <div className="p-3 space-y-2">
        <div className="text-xs font-medium text-gray-600">
          {card.items.length <= 2 ? "单品组合（" + card.items.length + " 件）" : "搭配清单（" + card.items.length + " 件）"}
        </div>
        {card.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
          >
            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center text-sm">
              {item.emoji}
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-700">{item.name}</div>
              <div className="text-xs text-gray-400">{item.category}</div>
            </div>
            <div className="text-xs font-bold text-red-500">¥{item.price}</div>
          </div>
        ))}
      </div>

      {/* 适配标注 */}
      <div className="px-3 pb-2 space-y-1">
        {card.annotations.map((a, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span>{a.icon}</span>
            <span className="text-gray-600">{a.text}</span>
            {a.source && (
              <span className="text-blue-500 shrink-0 ml-auto cursor-pointer hover:underline">
                → 来源
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="px-3 pb-3 flex gap-2">
        <button
          onClick={() => onAction("reshuffle")}
          className="flex-1 py-2 border border-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-50"
        >
          ← 换一套
        </button>
        <button
          onClick={() => onAction("addCart")}
          className="flex-1 py-2 bg-red-500 text-white text-xs rounded-lg font-medium hover:bg-red-600"
        >
          一键加购 ¥{card.totalPrice}
        </button>
        <button
          onClick={() => onAction("publish")}
          className="flex-1 py-2 bg-gray-900 text-white text-xs rounded-lg font-medium hover:bg-gray-800"
        >
          发到社区
        </button>
      </div>
    </div>
  );
}

function PublishCardView({
  card,
  onAction,
}: {
  card: PublishCard;
  onAction: (action: string, itemId?: string) => void;
}) {
  const hasImage = card.imageUrl && !card.imageUrl.startsWith("generating:");

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="aspect-[4/5] bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center relative overflow-hidden">
        {hasImage ? (
          <img
            src={card.imageUrl}
            alt="发布预览"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <div className="text-6xl">📸</div>
            <div className="text-xs text-gray-400 mt-2">发布预览</div>
          </div>
        )}
      </div>
      <div className="p-3 space-y-3">
        <div className="text-sm text-gray-700">{card.caption}</div>
        <div className="flex gap-2 flex-wrap">
          {card.tags.map((tag, i) => (
            <span
              key={i}
              className="text-xs bg-gray-100 text-blue-500 px-2 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAction("publishToOutfit")}
            className="flex-1 py-2 bg-gray-900 text-white text-xs rounded-lg"
          >
            发到穿搭精选
          </button>
          <button
            onClick={() => onAction("publishToDiscussion")}
            className="flex-1 py-2 border border-gray-200 text-gray-700 text-xs rounded-lg"
          >
            发到讨论区
          </button>
        </div>
        <button
          onClick={() => onAction("editCaption")}
          className="w-full text-xs text-gray-400 text-center"
        >
          修改文案
        </button>
      </div>
    </div>
  );
}

function PublishSuccessCardView({
  card,
}: {
  card: PublishSuccessCard;
  onAction: (action: string, itemId?: string) => void;
}) {
  const targetLabel = card.target === "讨论区" ? "讨论区" : "穿搭精选";
  const targetColor = card.target === "讨论区" ? "from-blue-400 to-blue-600" : "from-red-400 to-orange-400";
  const hasImage = card.imageUrl && !card.imageUrl.startsWith("generating:");

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* 发布成功头图 */}
      <div className={`aspect-[4/5] bg-gradient-to-br ${targetColor} flex items-center justify-center relative overflow-hidden`}>
        {hasImage ? (
          <img
            src={card.imageUrl}
            alt="发布效果"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="text-center z-10">
            <div className="text-6xl mb-3">✅</div>
            <div className="bg-white/20 backdrop-blur rounded-full px-4 py-1.5 inline-block">
              <span className="text-white text-sm font-medium">已发布到{targetLabel}</span>
            </div>
          </div>
        )}
        {hasImage && (
          <div className="absolute bottom-3 left-3 z-10">
            <div className="bg-black/40 backdrop-blur rounded-full px-3 py-1 inline-block">
              <span className="text-white text-xs">已发布到{targetLabel}</span>
            </div>
          </div>
        )}
      </div>

      {/* 帖子内容预览 */}
      <div className="p-3 space-y-3">
        <div className="text-sm text-gray-700 font-medium">{card.caption}</div>
        <div className="flex gap-2 flex-wrap">
          {card.tags.map((tag, i) => (
            <span
              key={i}
              className="text-xs bg-gray-100 text-blue-500 px-2 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 社区数据 */}
        <div className="flex items-center justify-around py-3 border-t border-gray-100">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{card.likes}</div>
            <div className="text-xs text-gray-400">赞</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{card.comments}</div>
            <div className="text-xs text-gray-400">评论</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{card.shares}</div>
            <div className="text-xs text-gray-400">分享</div>
          </div>
        </div>

        <div className="text-xs text-gray-400 text-center">
          内容已发布，社区用户正在围观中 👀
        </div>
      </div>
    </div>
  );
}

function PurchaseCardView({
  card,
  onAction,
}: {
  card: PurchaseCard;
  onAction: (action: string, itemId?: string) => void;
}) {
  const [paid, setPaid] = useState(card.status === "paid");

  const handlePay = () => {
    setPaid(true);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* 订单头部 */}
      <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-white text-sm font-bold">
            {paid ? "支付成功" : "确认订单"}
          </div>
          <div className="text-gray-400 text-xs mt-0.5">
            订单号：{card.orderNumber}
          </div>
        </div>
        <div className="text-2xl">{paid ? "✅" : "📋"}</div>
      </div>

      {/* 单品列表 */}
      <div className="p-3 space-y-2">
        <div className="text-xs font-medium text-gray-500">
          商品清单（{card.items.length} 件）
        </div>
        {card.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
          >
            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center text-sm">
              {item.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-700 truncate">
                {item.name}
              </div>
              <div className="text-xs text-gray-400">{item.category}</div>
            </div>
            <div className="text-xs font-bold text-red-500">¥{item.price}</div>
          </div>
        ))}
      </div>

      {/* 合计与操作 */}
      <div className="px-3 pb-3 space-y-2">
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">合计</span>
          <span className="text-base font-bold text-red-500">¥{card.totalPrice}</span>
        </div>

        {paid ? (
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-sm font-medium text-green-700">支付成功</div>
            <div className="text-xs text-green-500 mt-1">
              预计 2-4 天送达，可在「我的订单」查看物流
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => onAction("addCart")}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-xs rounded-lg font-medium hover:bg-gray-50"
            >
              加入购物车
            </button>
            <button
              onClick={handlePay}
              className="flex-1 py-2.5 bg-red-500 text-white text-xs rounded-lg font-medium hover:bg-red-600"
            >
              确认支付
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
