import { NextRequest, NextResponse } from "next/server";

const REPLICATE_API = "https://api.replicate.com/v1";

// IDM-VTON: best-in-class virtual try-on (1.4M+ runs)
const TRYON_VERSION = "0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985";

async function createPrediction(
  apiKey: string,
  input: Record<string, unknown>
) {
  const res = await fetch(`${REPLICATE_API}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ version: TRYON_VERSION, input }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Replicate API error ${res.status}: ${err}`);
  }

  return res.json();
}

// Generate a mock try-on image (deterministic placeholder with scene/weather overlay)
function mockTryOnUrl(scene: string, weather: string): string {
  const seed = `${scene}-${weather}`;
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/400/500`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { personImage, productImage, scene = "street", weather = "sunny" } = body;

    const apiKey = request.headers.get("x-replicate-key") || process.env.REPLICATE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        imageUrl: mockTryOnUrl(scene, weather),
        status: "mock",
        message: "未配置 Replicate API Key，显示模拟效果。配置后可使用真实 AI 试穿。",
      });
    }

    if (!personImage || !productImage) {
      return NextResponse.json(
        { error: "缺少 personImage 或 productImage" },
        { status: 400 }
      );
    }

    const prediction = await createPrediction(apiKey, {
      human_img: personImage,
      garm_img: productImage,
      category: "lower_body",
    });

    // Poll until complete or failed
    let result = prediction;
    if (result.status !== "succeeded" && result.status !== "failed") {
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const pollRes = await fetch(
          `${REPLICATE_API}/predictions/${result.id}`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        if (!pollRes.ok) break;
        result = await pollRes.json();
        if (result.status === "succeeded" || result.status === "failed") break;
      }
    }

    if (result.status === "succeeded") {
      const imageUrl = Array.isArray(result.output)
        ? result.output[0]
        : result.output;
      return NextResponse.json({ imageUrl, status: "succeeded" });
    }

    if (result.status === "failed") {
      return NextResponse.json(
        { error: result.error || "生成失败", status: "failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { imageUrl: mockTryOnUrl(scene, weather), status: "timeout" },
    );
  } catch (error) {
    console.error("Try-on API error:", error);
    return NextResponse.json(
      { error: String(error), status: "error" },
      { status: 500 }
    );
  }
}
