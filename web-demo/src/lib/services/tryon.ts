/**
 * 能力服务层 (C) — 视觉试穿服务
 *
 * 负责：生成虚拟试穿效果图（静态部署模式使用 mock）
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

/** 生成模拟试穿预览 */
export function mockTryOnPreview(scene: Scene, weather: Weather): string {
  return `https://picsum.photos/seed/${scene}-${weather}/400/500`;
}

/** 发起试穿请求（静态部署始终使用 mock） */
export async function requestTryOn(req: TryOnRequest): Promise<TryOnResponse> {
  const imageUrl = mockTryOnPreview(req.scene, req.weather);
  return {
    imageUrl,
    status: "mock",
    message: "模拟试穿效果",
  };
}
