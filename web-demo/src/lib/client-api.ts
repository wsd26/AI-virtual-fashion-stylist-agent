/**
 * Client-side API replacements for static export (GitHub Pages).
 * These functions replicate the Next.js API routes that aren't available
 * when running as a static site.
 */

import { Scene, Weather } from "@/types";

function analyzePhotos(count: number, style: string, gender: string) {
  const skinTones = ["自然肤色", "白皙肤色", "小麦肤色"];
  const bodyTypes = ["标准身材，比例好", "偏瘦，骨架较小", "标准偏壮"];
  return {
    skinTone: skinTones[count % skinTones.length],
    bodyType: bodyTypes[count % bodyTypes.length],
    style,
    gender,
  };
}

export interface AvatarResponse {
  avatarUrl: string;
  status: "photo" | "error";
  message: string;
  analyzed: ReturnType<typeof analyzePhotos>;
}

/** Generate avatar client-side (same logic as /api/generate-avatar) */
export async function generateAvatar(
  photos: string[],
  gender = "未知",
  style = "休闲风"
): Promise<AvatarResponse> {
  if (!photos || photos.length === 0) {
    throw new Error("缺少照片数据");
  }
  return {
    avatarUrl: photos[0],
    status: "photo",
    message: "已基于你的真实照片创建数字分身。这是最真实的你。",
    analyzed: analyzePhotos(photos.length, style, gender),
  };
}

/** Generate mock try-on image (same logic as /api/tryon mock fallback) */
export function mockTryOnUrl(scene: Scene, weather: Weather): string {
  const seed = `${scene}-${weather}`;
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/400/500`;
}

export interface TryOnResponse {
  imageUrl: string;
  status: "succeeded" | "mock" | "failed";
  message?: string;
}

/** Try-on — always mock for static export (no server-side GPU inference) */
export async function generateTryOn(
  _personImage: string,
  _productImage: string,
  scene: Scene,
  weather: Weather
): Promise<TryOnResponse> {
  return {
    imageUrl: mockTryOnUrl(scene, weather),
    status: "mock",
    message: "模拟试穿效果（静态部署模式）",
  };
}
