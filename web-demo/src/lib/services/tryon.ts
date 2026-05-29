/**
 * 能力服务层 (C) — 视觉试穿服务
 *
 * 负责：调用 IDM-VTON 生成虚拟试穿效果图
 */

import { Scene, Weather } from "@/types";

export interface TryOnRequest {
  personImage: string;
  productImage: string;
  scene: Scene;
  weather: Weather;
  replicateKey?: string;
}

export interface TryOnResponse {
  imageUrl: string;
  status: "generating" | "succeeded" | "failed" | "mock";
  message?: string;
}

/** 发起试穿请求 */
export async function requestTryOn(req: TryOnRequest): Promise<TryOnResponse> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (req.replicateKey) {
      headers["x-replicate-key"] = req.replicateKey;
    }

    const res = await fetch("/api/tryon", {
      method: "POST",
      headers,
      body: JSON.stringify({
        personImage: req.personImage,
        productImage: req.productImage,
        scene: req.scene,
        weather: req.weather,
      }),
    });

    const data = await res.json();
    return {
      imageUrl: data.imageUrl || "",
      status: data.status || "mock",
      message: data.message,
    };
  } catch (err) {
    console.error("Try-on service error:", err);
    return {
      imageUrl: "",
      status: "failed",
      message: "试穿服务异常，请稍后重试",
    };
  }
}

/** 生成模拟试穿预览（无 Replicate Key 时使用） */
export function mockTryOnPreview(scene: Scene, weather: Weather): string {
  return `https://picsum.photos/seed/${scene}-${weather}/400/500`;
}
