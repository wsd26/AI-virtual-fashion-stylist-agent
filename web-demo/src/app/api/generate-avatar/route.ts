import { NextRequest, NextResponse } from "next/server";

function analyzePhotos(count: number, style: string, gender: string) {
  // 模拟 AI 分析结果（生产环境接真实 CV 模型）
  const skinTones = ["自然肤色", "白皙肤色", "小麦肤色"];
  const bodyTypes = ["标准身材，比例好", "偏瘦，骨架较小", "标准偏壮"];

  return {
    skinTone: skinTones[count % skinTones.length],
    bodyType: bodyTypes[count % bodyTypes.length],
    style,
    gender,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photos, gender = "未知", style = "休闲风" } = body;

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { error: "缺少照片数据" },
        { status: 400 }
      );
    }

    // 直接用真人照片作为数字分身 — 最真实、Personally identifiable
    // 生产环境中可接入 InstantID / PhotoMaker 等模型生成风格化版本
    const analyzed = analyzePhotos(photos.length, style, gender);

    return NextResponse.json({
      avatarUrl: photos[0],
      status: "photo",
      message: "已基于你的真实照片创建数字分身。这是最真实的你。",
      analyzed,
    });
  } catch (error) {
    console.error("Avatar API error:", error);
    return NextResponse.json(
      { error: String(error), status: "error" },
      { status: 500 }
    );
  }
}
