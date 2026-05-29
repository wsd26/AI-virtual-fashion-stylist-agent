"use client";

import { useState, useEffect } from "react";
import ProductDetail from "@/components/ProductDetail";
import ChatPanel from "@/components/ChatPanel";
import { PanelState } from "@/types";

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-5 py-2.5 rounded-full shadow-lg animate-bounce">
      {message}
    </div>
  );
}

export default function Home() {
  const [panelState, setPanelState] = useState<PanelState>("hidden");
  const [entryReady, setEntryReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // PRD 5.1: 入口 8 秒后出现，避免干扰首屏浏览
  useEffect(() => {
    const timer = setTimeout(() => setEntryReady(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleAddCart = () => setToast("已加入购物车");
  const handleBuyNow = () => setToast("正在跳转支付页面...");

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center items-start">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {/* 手机框模拟 */}
      <div className="w-full max-w-md bg-white min-h-screen relative shadow-2xl overflow-hidden">
        {/* 顶部状态栏 */}
        <div className="h-11 bg-white flex items-center justify-between px-6 text-xs text-gray-900 font-medium border-b border-gray-50 sticky top-0 z-20">
          <span>9:41</span>
          <span className="text-base font-black tracking-wider">得物</span>
          <span className="text-gray-400">🔋 📶</span>
        </div>

        {/* 可滚动商品详情 */}
        <div
          className="overflow-y-auto"
          style={{ height: "calc(100vh - 44px)" }}
        >
          <ProductDetail />
        </div>

        {/* 底部悬浮入口 */}
        {panelState === "hidden" && (
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur border-t border-gray-100 z-30 pb-safe">
            {entryReady ? (
              <>
                <div className="px-4 pt-3 pb-2">
                  <button
                    onClick={() => setPanelState("half")}
                    className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-[0.99] transition-all"
                  >
                    <span>🤝</span>
                    <span>问问你的穿搭搭子</span>
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-1.5">
                    这双最近讨论挺激烈的，帮你参谋参谋？
                  </p>
                </div>
                <div className="flex gap-3 px-4 pb-6 pt-1">
                  <button onClick={handleAddCart} className="flex-1 py-3 border border-gray-200 text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-50 active:scale-[0.98] transition-all">
                    加入购物车
                  </button>
                  <button onClick={handleBuyNow} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 active:scale-[0.98] transition-all">
                    立即购买
                  </button>
                </div>
              </>
            ) : (
              <div className="px-4 pt-3 pb-6">
                <div className="w-full py-3 bg-gray-100 rounded-xl text-sm text-gray-400 text-center animate-pulse">
                  🤝 AI 穿搭伙伴加载中...
                </div>
                <div className="flex gap-3 px-0 pt-3">
                  <button onClick={handleAddCart} className="flex-1 py-3 border border-gray-200 text-gray-900 rounded-xl text-sm font-medium">
                    加入购物车
                  </button>
                  <button onClick={handleBuyNow} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-medium">
                    立即购买
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 对话面板 */}
        <ChatPanel
          panelState={panelState}
          onClose={() => setPanelState("hidden")}
          onChangeState={setPanelState}
        />
      </div>
    </div>
  );
}
