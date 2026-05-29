"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Message, PanelState, Scene, Weather, SCENE_OPTIONS } from "@/types";
import { callAgent, callAgentStream, getSystemPrompt, setAgentConfig } from "@/lib/agent";
import type { StreamEvent } from "@/lib/agent";
import { mockProduct } from "@/lib/mock";
import { SessionState } from "@/lib/state/session";
import { generateOutfitPlans } from "@/lib/agents/explorer";
import { useUserProfile } from "@/lib/userProfile";
import { generateAvatar, generateTryOn } from "@/lib/client-api";
import ChatBubble from "./ChatBubble";
import WelcomeGuide from "./WelcomeGuide";

interface ChatPanelProps {
  panelState: PanelState;
  onClose: () => void;
  onChangeState: (state: PanelState) => void;
}

let messageId = 0;
function nextId() {
  return `msg-${++messageId}`;
}

export default function ChatPanel({
  panelState,
  onClose,
  onChangeState,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [apiKey, setApiKey] = useState("sk-bc71f80c027a40299157978b422f8ccd");
  const [replicateKey, setReplicateKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [tryOnProgress, setTryOnProgress] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const { profile, setGeneratedAvatar, getPersonImage } = useUserProfile();

  // Keep messagesRef in sync for use in callbacks
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 数字分身生成
  const handleGenerateAvatar = useCallback(async () => {
    setShowWelcome(false);
    setLoading(true);
    try {
      const data = await generateAvatar(
        profile.uploadedPhotos,
        profile.gender,
        profile.style,
      );
      if (data.avatarUrl) {
        setGeneratedAvatar(data.avatarUrl);
      }
    } catch (err) {
      console.error("Avatar generation failed:", err);
    }
    setLoading(false);
    // 发送问候消息
    setLoading(true);
    const session = buildSession(profile, messagesRef.current, getPersonImage());
    const systemPrompt = getSystemPrompt(session);
    const reply = await callAgent([
      { role: "system", content: systemPrompt },
      { role: "user", content: "（用户刚进入商详页，已生成数字分身）" },
    ], session);
    const { imageUrl: tryOnImg } = getLatestTryOnInfo(messagesRef.current);
    const processed = processAgentReply(reply, undefined, undefined, profile, tryOnImg);
    setMessages([
      {
        id: nextId(),
        role: "agent",
        content: processed.content,
        card: processed.card,
        timestamp: Date.now(),
      },
    ]);
    setLoading(false);
  }, [profile, replicateKey, setGeneratedAvatar]);

  // 触发真实 AI 试穿生成
  const startTryOnGeneration = useCallback(
    async (msgId: string, productImageUrl: string, scene: Scene, weather: Weather) => {
      const personImage = getPersonImage();
      if (!personImage) return;

      try {
        const data = await generateTryOn(personImage, productImageUrl, scene, weather);
        const imageUrl = data.imageUrl || "";

        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === msgId && m.card?.type === "tryon") {
              return {
                ...m,
                card: { ...m.card, imageUrl },
              };
            }
            return m;
          })
        );
      } catch (err) {
        console.error("Try-on generation failed:", err);
        // Fallback: clear generating state
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === msgId && m.card?.type === "tryon") {
              return {
                ...m,
                card: { ...m.card, imageUrl: "" },
              };
            }
            return m;
          })
        );
      }
    },
    [getPersonImage, replicateKey]
  );

  // 首条招呼消息
  const sendGreeting = useCallback(() => {
    setLoading(true);
    setShowWelcome(false);
    const session = buildSession(profile, messagesRef.current, getPersonImage());
    const systemPrompt = getSystemPrompt(session);
    callAgent([
      { role: "system", content: systemPrompt },
      { role: "user", content: "（用户刚进入商详页）" },
    ], session).then((reply) => {
      const { imageUrl: tryOnImg } = getLatestTryOnInfo(messagesRef.current);
      const processed = processAgentReply(reply, undefined, undefined, profile, tryOnImg);
      setMessages([
        {
          id: nextId(),
          role: "agent",
          content: processed.content,
          card: processed.card,
          timestamp: Date.now(),
        },
      ]);
      setLoading(false);
    });
  }, [profile]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = {
      id: nextId(),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };
    const agentMsgId = nextId();
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // 预先创建空的 agent 消息，streaming 时逐 token 填充
    const history = messages.map((m) => ({
      role: (m.role === "agent" ? "assistant" : "user") as "assistant" | "user",
      content: m.content,
    }));

    try {
      const session = buildSession(profile, messagesRef.current, getPersonImage());
      const stream = callAgentStream([
        { role: "system", content: getSystemPrompt(session) },
        ...history,
        { role: "user", content: userMsg.content },
      ], session);

      let fullContent = "";
      let isFirstToken = true;

      for await (const event of stream) {
        if (event.type === "token") {
          fullContent += event.text;
          if (isFirstToken) {
            isFirstToken = false;
            setMessages((prev) => [...prev, {
              id: agentMsgId,
              role: "agent",
              content: fullContent,
              timestamp: Date.now(),
            }]);
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === agentMsgId ? { ...m, content: fullContent } : m))
            );
          }
        } else if (event.type === "done") {
          fullContent = event.content;
          const { scene, weather, imageUrl: tryOnImg } = getLatestTryOnInfo(messagesRef.current);
          const processed = processAgentReply(fullContent, scene, weather, profile, tryOnImg);
          const newMsgId = agentMsgId;

          let card = processed.card;
          if (card?.type === "combination_tryon") {
            const itemMatch = userMsg.content.match(/（(.+?)）/) || userMsg.content.match(/\((.+?)\)/);
            if (itemMatch) {
              const targetId = itemMatch[1];
              const currentItem = card.items.find((i) => i.isCurrentProduct);
              const targetItem = card.items.find((i) => i.id === targetId && !i.isCurrentProduct);
              if (currentItem && targetItem) {
                card = {
                  ...card,
                  items: [currentItem, targetItem],
                  totalPrice: currentItem.price + targetItem.price,
                  annotations: [
                    { icon: "✅", text: `${currentItem.name} + ${targetItem.name} 组合上身`, source: "AI 搭配分析" },
                    ...card.annotations.slice(1),
                  ],
                };
              }
            }
          }

          setMessages((prev) =>
            prev.map((m) => (m.id === newMsgId ? { ...m, content: processed.content, card } : m))
          );

          if (card?.type === "tryon" && getPersonImage()) {
            startTryOnGeneration(newMsgId, mockProduct.images[0], scene!, weather!);
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "agent",
          content: "抱歉，出了点问题。试试重新问我？",
          timestamp: Date.now(),
        },
      ]);
    }
    setLoading(false);
  };

  /** 根据最近消息判断当前发布上下文，构造带搭配信息的消息 */
  const getPublishMessage = (): string => {
    const msgs = messagesRef.current;
    // 查找最近的非 tryon 卡片（outfit / combination / combination_tryon）
    const recentCards = msgs.filter((m) => m.card).reverse();

    const outfitCard = recentCards.find((m) => m.card?.type === "outfit");
    const comboCards = recentCards.filter((m) =>
      m.card?.type === "combination_tryon"
    );
    const tryOnCard = recentCards.find((m) => m.card?.type === "tryon");

    if (comboCards.length > 0) {
      // 有组合搭配 → 描述具体单品
      const items = comboCards[0].card?.type === "combination_tryon"
        ? (comboCards[0].card as any).items?.map((i: any) => i.name).join(" + ") || "组合搭配"
        : "组合搭配";
      const scene = tryOnCard?.card?.type === "tryon" ? tryOnCard.card.activeScene : "street";
      const sceneLabel = SCENE_OPTIONS.find((x) => x.key === scene)?.label || "街头";
      return `帮我把「${items}」这套搭配发到社区（场景：${sceneLabel}）`;
    }

    if (outfitCard?.card?.type === "outfit") {
      const plans = outfitCard.card.plans;
      const topPlan = plans?.[0];
      const style = topPlan?.style || "";
      const items = topPlan?.items?.map((i: any) => i.name).slice(0, 3).join("、") || "";
      return `帮我把这套${style}搭配发到社区（单品：${items}）`;
    }

    if (tryOnCard?.card?.type === "tryon") {
      const scene = tryOnCard.card.activeScene;
      const weather = tryOnCard.card.activeWeather;
      const sceneLabel = SCENE_OPTIONS.find((x) => x.key === scene)?.label || "街头";
      return `帮我把 AJ1 芝加哥的上身效果发到社区（场景：${sceneLabel}，天气：${weather}）`;
    }

    return "帮我把当前穿搭发到社区";
  };

  const handleQuickAction = (action: string) => {
    if (action === "addCart") {
      directAddTextMessage("已加入购物车！这套搭配的商品已在你的购物车里，随时可以结算。");
      return;
    }
    if (action === "purchase") {
      const { scene, weather } = getLatestTryOnScene(messagesRef.current);
      const plans = generateOutfitPlans(scene || "street", weather || "sunny", profile);
      const plan = plans[0];
      directAddCardMessage("已为你生成订单，请确认支付。", {
        type: "purchase",
        items: plan.items,
        totalPrice: plan.totalPrice,
        orderNumber: `DW${Date.now().toString(36).toUpperCase()}`,
        status: "pending",
      });
      return;
    }

    if (action === "publish") {
      handleSendWithText(getPublishMessage());
      return;
    }

    const actionMap: Record<string, string> = {
      tryon: "帮我上身试试",
      outfit: "怎么搭？",
      review: "评价里怎么说？",
      community: "社区里怎么聊这双鞋？",
      reshuffle: "换一批搭配",
    };
    const text = actionMap[action] || action;
    handleSendWithText(text);
  };

  const handleCardAction = (action: string, itemId?: string) => {
    // 发社区：带上搭配上下文
    if (action === "publish") {
      handleSendWithText(getPublishMessage());
      return;
    }

    const actionMap: Record<string, string> = {
      outfit: "帮我搭一套",
      review: "评价里怎么说？",
      addCart: "好的，加购这套",
      reshuffle: "换一批搭配",
      editCaption: "帮我改一下文案",
    };

    // 单品试穿 → 组合上身：当前商品 + 选中单品
    if (action === "tryOnItem" && itemId) {
      handleSendWithText(`帮我把这件单品和AJ1芝加哥组合上身（${itemId}）`);
      return;
    }

    // 组合上身
    if (action === "combinationTryOn") {
      handleSendWithText("帮我组合上身看看效果");
      return;
    }

    // 发布确认：直接生成发布成功卡片，不经过 Agent
    if (action === "publishToOutfit" || action === "publishToDiscussion") {
      const target = action === "publishToDiscussion" ? "讨论区" : "穿搭精选";
      const { scene, imageUrl: tryOnImg } = getLatestTryOnInfo(messagesRef.current);
      // 复用最近一个 PublishCard 的 LLM 生成文案
      const lastPublishCard = [...messagesRef.current].reverse().find((m) => m.card?.type === "publish");
      const pubCard = lastPublishCard?.card?.type === "publish" ? lastPublishCard.card : null;
      directAddCardMessage(target === "讨论区" ? "已发布到讨论区！" : "已发布到穿搭精选！", {
        type: "publish_success",
        imageUrl: tryOnImg,
        caption: pubCard?.caption || `${SCENE_OPTIONS.find((x) => x.key === scene)?.label || "街头"}穿搭，经典就是经典 🔥`,
        tags: pubCard?.tags.length ? pubCard.tags : ["#AJ1芝加哥", `#${getSceneLabel(scene || "street")}穿搭`, "#OOTD"],
        target,
        likes: Math.floor(Math.random() * 200) + 50,
        comments: Math.floor(Math.random() * 30) + 5,
        shares: Math.floor(Math.random() * 15) + 3,
      });
      return;
    }

    // 购买：直接生成订单卡片，不经过 Agent
    if (action === "purchase") {
      const { scene, weather } = getLatestTryOnScene(messagesRef.current);
      const plans = generateOutfitPlans(scene || "street", weather || "sunny", profile);
      const plan = plans[0];
      directAddCardMessage("已为你生成订单，请确认支付。", {
        type: "purchase",
        items: plan.items,
        totalPrice: plan.totalPrice,
        orderNumber: `DW${Date.now().toString(36).toUpperCase()}`,
        status: "pending",
      });
      return;
    }

    // 单品加购
    if (action === "addCartItem" && itemId) {
      const { scene, weather } = getLatestTryOnScene(messagesRef.current);
      const plans = generateOutfitPlans(scene || "street", weather || "sunny", profile);
      const allItems = plans.flatMap((p) => p.items);
      const item = allItems.find((i) => i.id === itemId);
      directAddTextMessage(
        item
          ? `已加购「${item.name}」¥${item.price}，可在购物车中查看。`
          : "已加入购物车，可在购物车中查看。"
      );
      return;
    }

    // 整套加购：只返回文本
    if (action === "addCart") {
      directAddTextMessage("已加入购物车！这套搭配的商品已在你的购物车里，随时可以结算。");
      return;
    }

    const text = actionMap[action] || action;
    handleSendWithText(text);
  };

  // 直接添加带卡片的 Agent 消息（绕过 Agent API）
  const directAddCardMessage = (content: string, card: Message["card"]) => {
    const userMsg: Message = {
      id: nextId(),
      role: "user",
      content: "好的",
      timestamp: Date.now(),
    };
    const agentMsg: Message = {
      id: nextId(),
      role: "agent",
      content,
      card,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg, agentMsg]);
  };

  // 直接添加纯文本 Agent 消息（绕过 Agent API）
  const directAddTextMessage = (content: string) => {
    const userMsg: Message = {
      id: nextId(),
      role: "user",
      content: "好的",
      timestamp: Date.now(),
    };
    const agentMsg: Message = {
      id: nextId(),
      role: "agent",
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg, agentMsg]);
  };

  const handleSendWithText = async (text: string) => {
    if (loading) return;
    setInput("");
    setLoading(true);
    const userMsg: Message = {
      id: nextId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const history = messagesRef.current.map((m) => ({
      role: (m.role === "agent" ? "assistant" : "user") as
        | "assistant"
        | "user",
      content: m.content,
    }));

    // Simulate try-on generation delay
    if (text.includes("试穿") || text.includes("上身") || text.includes("试试")) {
      setTryOnProgress(true);
      await new Promise((r) => setTimeout(r, 2500));
      setTryOnProgress(false);
    }

    try {
      const session = buildSession(profile, messagesRef.current, getPersonImage());
      const stream = callAgentStream([
        { role: "system", content: getSystemPrompt(session) },
        ...history,
        { role: "user", content: text },
      ], session);

      const newMsgId = nextId();
      let fullContent = "";
      let isFirstToken = true;

      for await (const event of stream) {
        if (event.type === "token") {
          fullContent += event.text;
          if (isFirstToken) {
            isFirstToken = false;
            setMessages((prev) => [...prev, {
              id: newMsgId,
              role: "agent",
              content: fullContent,
              timestamp: Date.now(),
            }]);
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === newMsgId ? { ...m, content: fullContent } : m))
            );
          }
        } else if (event.type === "done") {
          fullContent = event.content;
          const { scene, weather, imageUrl: tryOnImg } = getLatestTryOnInfo(messagesRef.current);
          const processed = processAgentReply(fullContent, scene, weather, profile, tryOnImg);

          let card = processed.card;
          if (card?.type === "combination_tryon") {
            const itemMatch = text.match(/（(.+?)）/) || text.match(/\((.+?)\)/);
            if (itemMatch) {
              const targetId = itemMatch[1];
              const currentItem = card.items.find((i) => i.isCurrentProduct);
              const targetItem = card.items.find((i) => i.id === targetId && !i.isCurrentProduct);
              if (currentItem && targetItem) {
                card = {
                  ...card,
                  items: [currentItem, targetItem],
                  totalPrice: currentItem.price + targetItem.price,
                  annotations: [
                    {
                      icon: "✅",
                      text: `${currentItem.name} + ${targetItem.name} 组合上身，风格统一`,
                      source: "AI 搭配分析",
                    },
                    ...card.annotations.slice(1),
                  ],
                };
              }
            }
          }

          setMessages((prev) =>
            prev.map((m) => (m.id === newMsgId ? { ...m, content: processed.content, card } : m))
          );

          if (card?.type === "tryon" && getPersonImage()) {
            startTryOnGeneration(newMsgId, mockProduct.images[0], scene!, weather!);
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "agent",
          content: "抱歉，出了点问题。试试重新问我？",
          timestamp: Date.now(),
        },
      ]);
    }
    setLoading(false);
  };

  const isHalf = panelState === "half";
  const isHidden = panelState === "hidden";

  // 拖拽状态（使用 window 级事件避免 mouseUp 丢失）
  const dragStartRef = useRef(0);
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const y = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = y;
    if (!("touches" in e)) {
      const handleMouseMove = (me: MouseEvent) => {}; // eslint-disable-line
      const handleMouseUp = (me: MouseEvent) => {
        const delta = me.clientY - dragStartRef.current;
        if (delta > 60) {
          if (panelState === "full") onChangeState("half");
          else if (panelState === "half") onClose();
        } else if (delta < -60) {
          if (panelState === "half") onChangeState("full");
        }
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
  };
  const handleDragEndTouch = (e: React.TouchEvent) => {
    const y = e.changedTouches[0].clientY;
    const delta = y - dragStartRef.current;
    if (delta > 60) {
      if (panelState === "full") onChangeState("half");
      else if (panelState === "half") onClose();
    } else if (delta < -60) {
      if (panelState === "half") onChangeState("full");
    }
  };

  if (isHidden) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* 对话面板 */}
      <div
        className={`fixed left-0 right-0 z-50 bg-gray-50 flex flex-col rounded-t-2xl shadow-2xl transition-all duration-300 ${
          isHalf
            ? "bottom-0 h-[55vh]"
            : "bottom-0 h-[90vh] rounded-t-3xl"
        }`}
      >
        {/* 拖拽指示条 */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          onTouchEnd={handleDragEndTouch}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 标题栏 */}
        <div className="px-4 pb-2 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center text-white text-xs">
              🤖
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">穿搭搭子</div>
              <div className="text-xs text-green-500">{apiKey ? "在线 · AI 潮圈伙伴" : "在线 · 模拟模式"}</div>
            </div>
            {profile.avatarType !== "none" && (
              <div className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 ml-2">
                {profile.avatarType === "photo" ? "📷 真人" : "🧑 数字人"}
                {" · "}{profile.skinTone}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMessages([]);
                setShowWelcome(true);
                setShowSettings(false);
              }}
              className="text-gray-400 hover:text-gray-600 text-sm"
              title="重新选择形象"
            >
              ↻
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-400 hover:text-gray-600 text-lg"
            >
              ⚙
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">
              ✕
            </button>
          </div>
        </div>

        {/* 设置面板 */}
        {showSettings && (
          <div className="px-4 py-3 bg-white border-b border-gray-100">
            <div className="text-xs font-medium text-gray-600 mb-2">
              配置 API Key（可选，不填则使用模拟回复）
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setAgentConfig({ apiKey: e.target.value });
              }}
              placeholder="输入 DeepSeek / OpenAI API Key"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
            />
            <div className="text-xs text-gray-400 mt-1">
              支持 DeepSeek、OpenAI 等兼容接口。不填也能体验模拟对话。
            </div>
            <div className="text-xs font-medium text-gray-600 mt-3 mb-2">
              Replicate API Key（用于 AI 试穿图像生成）
            </div>
            <input
              type="password"
              value={replicateKey}
              onChange={(e) => setReplicateKey(e.target.value)}
              placeholder="输入 Replicate API Key (r8_...)"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
            />
            <div className="text-xs text-gray-400 mt-1">
              用于 IDM-VTON 虚拟试穿模型。不填则显示模拟效果。
            </div>
            <div className="border-t border-gray-100 mt-3 pt-3">
              <button
                onClick={() => {
                  setMessages([]);
                  setShowWelcome(true);
                  setShowSettings(false);
                }}
                className="w-full py-2 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50"
              >
                ↻ 重新选择形象 / 照片
              </button>
            </div>
          </div>
        )}

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {showWelcome && messages.length === 0 ? (
            <WelcomeGuide
              onStart={() => sendGreeting()}
              onGenerateAvatar={() => handleGenerateAvatar()}
              onSkip={() => {
                setShowWelcome(false);
                sendGreeting();
              }}
            />
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              加载中...
            </div>
          ) : (
            messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                onAction={handleCardAction}
                onSceneWeatherChange={(scene, weather) => {
                  // 同步试穿卡片的场景/天气变更到消息状态
                  setMessages((prev) =>
                    prev.map((m) => {
                      if (m.card?.type === "tryon") {
                        return {
                          ...m,
                          card: { ...m.card, activeScene: scene, activeWeather: weather },
                        };
                      }
                      return m;
                    })
                  );
                }}
              />
            ))
          )}
          {loading && (
            <div className="flex justify-start mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center text-white text-sm font-bold shrink-0 mr-2">
                🤖
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[75%]">
                {tryOnProgress ? (
                  <div>
                    <div className="flex gap-1 mb-2 justify-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      正在生成上身效果...
                    </div>
                    <TriviaRotator />
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 快捷操作栏 */}
        {messages.length > 0 && (
          <div className="px-4 py-2 flex gap-2 overflow-x-auto">
            {getQuickActions(messages).map((action) => (
              <button
                key={action.key}
                onClick={() => handleQuickAction(action.key)}
                className="shrink-0 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50 active:bg-gray-100"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* 输入区域 */}
        <div className="px-4 py-3 bg-white border-t border-gray-100">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="输入你想问的..."
              className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center disabled:opacity-30 shrink-0"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// 从 LLM 回复中提取发布文案和标签
function parsePublishInfo(text: string): { caption: string; tags: string[] } {
  // 匹配「...」中的文案
  const captionMatch = text.match(/「([^」]+)」/);
  const caption = captionMatch ? captionMatch[1] : "";
  // 匹配"标签："后的内容
  const tagsMatch = text.match(/标签[：:]\s*(.+)/);
  const tags = tagsMatch
    ? tagsMatch[1].split(/[\s#]+/).filter((t) => t.startsWith("#") || t.length > 0).map((t) => t.startsWith("#") ? t : `#${t}`)
    : [];
  return { caption, tags };
}

// 解析 Agent 回复中的标记，提取卡片类型
function processAgentReply(
  reply: string,
  scene?: Scene,
  weather?: Weather,
  profile?: { avatarType: string; skinTone: string; bodyType: string; style: string; gender: string },
  tryOnImageUrl?: string
): {
  content: string;
  card?: Message["card"];
} {
  let content = reply
    .replace(/\[TRYON\]/g, "")
    .replace(/\[OUTFIT\]/g, "")
    .replace(/\[PUBLISH\]/g, "")
    .replace(/\[COMBINATION\]/g, "")
    .replace(/\[PUBLISH_SUCCESS:[^\]]+\]/g, "")
    .replace(/\[PURCHASE\]/g, "")
    .trim();

  const s = scene || "street";
  const w = weather || "sunny";

  // 注意：LLM 常在各场景末尾加 "要不要上身看看？[TRYON]" 作为通用 CTA
  // 所以 [TRYON] 必须放在最后匹配，避免覆盖意图特定的标记

  const publishImage = tryOnImageUrl || "";

  if (reply.includes("[PUBLISH_SUCCESS:")) {
    const match = reply.match(/\[PUBLISH_SUCCESS:(.+?)\]/);
    const target = match ? match[1] : "穿搭精选";
    return {
      content,
      card: {
        type: "publish_success",
        imageUrl: publishImage,
        caption: `${SCENE_OPTIONS.find((x) => x.key === s)?.label}穿搭，经典就是经典 🔥`,
        tags: ["#AJ1芝加哥", `#${getSceneLabel(s)}穿搭`, "#OOTD"],
        target,
        likes: Math.floor(Math.random() * 200) + 50,
        comments: Math.floor(Math.random() * 30) + 5,
        shares: Math.floor(Math.random() * 15) + 3,
      },
    };
  }

  if (reply.includes("[PUBLISH]")) {
    const parsed = parsePublishInfo(content);
    return {
      content,
      card: {
        type: "publish",
        imageUrl: publishImage,
        caption: parsed.caption || `${SCENE_OPTIONS.find((x) => x.key === s)?.label}穿搭，经典就是经典 🔥`,
        tags: parsed.tags.length > 0 ? parsed.tags : ["#AJ1芝加哥", `#${getSceneLabel(s)}穿搭`, "#OOTD"],
      },
    };
  }

  if (reply.includes("[OUTFIT]")) {
    return {
      content,
      card: {
        type: "outfit",
        scene: s,
        weather: w,
        plans: generateOutfitPlans(s, w, profile),
      },
    };
  }

  if (reply.includes("[COMBINATION]")) {
    const plans = generateOutfitPlans(s, w, profile);
    const plan = plans[0];
    return {
      content,
      card: {
        type: "combination_tryon",
        scene: s,
        weather: w,
        items: plan.items,
        totalPrice: plan.totalPrice,
        annotations: [
          {
            icon: "✅",
            text: `全套${plan.items.length}件单品组合上身，风格统一，配色呼应`,
            source: "AI 搭配分析",
          },
          {
            icon: "📸",
            text: `参考 @${plan.referenceUser} 的穿搭思路`,
            source: "穿搭精选",
          },
        ],
      },
    };
  }

  if (reply.includes("[PURCHASE]")) {
    const plans = generateOutfitPlans(s, w, profile);
    const plan = plans[0];
    return {
      content,
      card: {
        type: "purchase",
        items: plan.items,
        totalPrice: plan.totalPrice,
        orderNumber: `DW${Date.now().toString(36).toUpperCase()}`,
        status: "pending",
      },
    };
  }

  if (reply.includes("[TRYON]")) {
    const hasPersonImage = profile && profile.avatarType !== "none";
    return {
      content,
      card: {
        type: "tryon",
        imageUrl: hasPersonImage ? "generating:true" : "",
        activeScene: s,
        activeWeather: w,
        annotations: getAnnotationsForScene(s, w, profile),
      },
    };
  }

  return { content };
}

// 场景适配标注（含用户形象个性化）
function getAnnotationsForScene(
  s: Scene,
  w: Weather,
  profile?: { avatarType: string; skinTone: string; bodyType: string; style: string; gender: string }
) {
  const weatherTip: Record<Weather, string> = {
    sunny: "晴天光线充足，红色鞋面更出挑，建议搭配浅色系",
    cloudy: "阴天色调偏灰，红色可作为全身亮点",
    rainy: "⚠ 雨天不建议穿 AJ1 出门，皮质鞋面不耐水。如必须出门，建议喷防水喷雾",
    snowy: "⚠ 雪天地滑，AJ1 鞋底在湿滑路面抓地力一般。注意保暖搭配",
    sunset: "傍晚光线柔和，红色在暖光下更有质感，适合拍照打卡",
  };

  const sceneTip: Record<Scene, string> = {
    street: "街头场景下 AJ1 是绝对主角，建议搭配简约单品突出鞋款",
    campus: "校园穿搭偏休闲，AJ1 搭配卫衣+牛仔裤就很能打",
    sports: "⚠ AJ1 不适合实战运动，搭配运动休闲风即可",
    cafe: "咖啡店场景适合 clean fit 路线，简约质感穿搭",
    festival: "音乐节场景可以大胆尝试撞色和层次感搭配",
  };

  const annotations = [
    {
      icon: "📍",
      text: sceneTip[s],
      source: "穿搭精选",
    },
    {
      icon: w === "rainy" || w === "snowy" ? "⚠" : "☀",
      text: weatherTip[w],
      source: "社区经验",
    },
    {
      icon: "📌",
      text: "最近批次鞋头溢胶反馈较多（23条评价提到），选购时留意",
      source: "好物评价",
    },
  ];

  // 个性化标注：基于用户形象的身形分析
  if (profile && profile.avatarType !== "none") {
    const bodyAdvice = getBodyTypeAdvice(profile.bodyType, profile.gender);
    if (bodyAdvice) {
      annotations.push({
        icon: "👤",
        text: bodyAdvice,
        source: "你的形象分析",
      });
    }
  }

  return annotations;
}

function getBodyTypeAdvice(bodyType: string, gender: string): string {
  if (bodyType.includes("偏瘦")) {
    return `你的身形偏瘦，AJ1 鞋型偏宽，建议搭配宽松裤型平衡整体比例`;
  }
  if (bodyType.includes("偏壮") || bodyType.includes("骨架大")) {
    return `你的身形偏壮，AJ1 鞋型适中，搭配直筒裤或微喇裤更能拉长腿部线条`;
  }
  if (bodyType.includes("标准")) {
    return `你的身形比例不错，AJ1 百搭属性拉满，任何裤型都能驾驭`;
  }
  return "";
}

function getSceneLabel(s: Scene): string {
  const map: Record<Scene, string> = {
    street: "街头", campus: "校园", sports: "运动", cafe: "咖啡店", festival: "音乐节",
  };
  return map[s];
}

// 从消息列表中提取最新的试穿场景、天气、图片
function getLatestTryOnInfo(messages: Message[]): { scene: Scene; weather: Weather; imageUrl: string } {
  const tryOnCards = messages.filter((m) => m.card?.type === "tryon");
  const latest = tryOnCards[tryOnCards.length - 1];
  if (latest?.card?.type === "tryon") {
    return {
      scene: latest.card.activeScene || "street",
      weather: latest.card.activeWeather || "sunny",
      imageUrl: (latest.card.imageUrl && !latest.card.imageUrl.startsWith("generating:")) ? latest.card.imageUrl : "",
    };
  }
  return { scene: "street", weather: "sunny", imageUrl: "" };
}

function getLatestTryOnScene(messages: Message[]): { scene: Scene; weather: Weather } {
  const info = getLatestTryOnInfo(messages);
  return { scene: info.scene, weather: info.weather };
}

// 从当前状态构建会话上下文，传递给主 Agent
function buildSession(
  profile: { avatarType: string; skinTone: string; bodyType: string; style: string; gender: string },
  messages: Message[],
  personImageUrl?: string | null
): Partial<SessionState> {
  const { scene, weather } = getLatestTryOnScene(messages);
  return {
    userProfile: {
      avatarType: profile.avatarType as "none" | "photo" | "digital",
      skinTone: profile.skinTone,
      bodyType: profile.bodyType,
      style: profile.style,
      gender: profile.gender,
      hasPersonImage: profile.avatarType !== "none",
      personImageUrl: personImageUrl || undefined,
    },
    scene,
    weather,
  };
}

function getQuickActions(messages: Message[]): { key: string; label: string }[] {
  const lastAgentMsg = [...messages].reverse().find((m) => m.role === "agent");
  if (!lastAgentMsg)
    return [
      { key: "tryon", label: "帮我上身试试" },
      { key: "review", label: "评价怎么说" },
    ];

  const content = lastAgentMsg.content || "";
  const hasTryOn = messages.some((m) => m.card?.type === "tryon");
  const hasOutfit = messages.some((m) => m.card?.type === "outfit");
  const hasPublish = messages.some((m) => m.card?.type === "publish");
  const hasCart = content.includes("已加入购物车");
  const hasPurchase = messages.some((m) => m.card?.type === "purchase");
  const hasPublishSuccess = messages.some((m) => m.card?.type === "publish_success");

  if (hasPublishSuccess) {
    return [
      { key: "outfit", label: "再看看搭配" },
      { key: "review", label: "评价怎么说" },
      { key: "tryon", label: "帮我上身试试" },
    ];
  }

  if (hasPurchase) {
    return [
      { key: "outfit", label: "继续逛搭配" },
      { key: "publish", label: "发到社区" },
    ];
  }

  if (hasPublish) {
    return [
      { key: "reshuffle", label: "换一批搭配" },
      { key: "publish", label: "发到社区" },
      { key: "review", label: "评价怎么说" },
    ];
  }

  if (hasCart) {
    return [
      { key: "purchase", label: "去结算" },
      { key: "outfit", label: "再看看搭配" },
      { key: "publish", label: "发社区" },
    ];
  }

  if (hasOutfit) {
    return [
      { key: "publish", label: "发社区" },
      { key: "addCart", label: "一键加购" },
      { key: "reshuffle", label: "换一批搭配" },
    ];
  }

  if (hasTryOn) {
    return [
      { key: "outfit", label: "怎么搭" },
      { key: "review", label: "评价怎么说" },
      { key: "publish", label: "发社区" },
    ];
  }

  return [
    { key: "tryon", label: "帮我上身试试" },
    { key: "review", label: "评价怎么说" },
    { key: "community", label: "社区怎么聊" },
  ];
}

// 旋转加载小知识（基于社区数据）
const TRIVIA_CARDS = [
  { icon: "💡", text: 'AJ1 "Chicago" 最初因为红黑配色被 NBA 禁穿，Nike 借机造势，每场罚款 $5000，成为经典营销案例' },
  { icon: "🔥", text: `社区热议：3.2k 人在讨论"芝加哥 vs 黑红脚趾谁才是 AJ1 颜值天花板"` },
  { icon: "👔", text: "穿搭 Tips：红色球鞋最适合搭配黑白灰基础色，让鞋子成为全身焦点 — @穿搭达人Lily" },
  { icon: "💬", text: `玩家说：@球鞋阿聪 硬核开箱获赞 5.2k，"二批皮质明显升级，但胶水控制还是老问题"` },
];

function TriviaRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % TRIVIA_CARDS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const card = TRIVIA_CARDS[index];

  return (
    <div className="mt-2 bg-gray-50 rounded-lg p-2 text-xs text-gray-400 transition-opacity duration-300">
      {card.icon} {card.text}
    </div>
  );
}
