"use client";

import { useState, useRef } from "react";
import { useUserProfile } from "@/lib/userProfile";

type GuideStep = "main" | "upload" | "avatar-upload";

interface WelcomeGuideProps {
  onStart: () => void;
  onGenerateAvatar: () => void;
  onSkip: () => void;
}

export default function WelcomeGuide({
  onStart,
  onGenerateAvatar,
  onSkip,
}: WelcomeGuideProps) {
  const [step, setStep] = useState<GuideStep>("main");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploadMode, setUploadMode] = useState<"photo" | "digital">("photo");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setPhotoProfile, setDigitalAvatarProfile } = useUserProfile();

  const handleFiles = (files: FileList) => {
    const fileArray = Array.from(files).slice(0, 3);
    const readers = fileArray.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        })
    );
    Promise.all(readers).then((dataUrls) => {
      setUploadedPhotos((prev) => [...prev, ...dataUrls].slice(0, 3));
    });
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // ====== 主页 ======
  if (step === "main") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center text-white text-4xl mb-4 shadow-lg">
          🤖
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Hi，我是你的穿搭搭子
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          你的专属潮圈伙伴，陪你逛、帮你搭
        </p>

        {/* 能力卡片 */}
        <div className="w-full grid grid-cols-2 gap-3 mb-6">
          {[
            { icon: "👟", title: "AI 上身试穿", desc: "上传照片，真实 AI 试穿效果" },
            { icon: "👔", title: "搭配推荐", desc: "多场景整套搭配，一键加购" },
            { icon: "💬", title: "评价解读", desc: "总结社区口碑和争议点" },
            { icon: "📸", title: "一键发布", desc: "自动生成穿搭帖到社区" },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white border border-gray-100 rounded-xl p-3 text-left"
            >
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-xs font-bold text-gray-800">{item.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA 按钮 */}
        <button
          onClick={() => {
            setUploadMode("photo");
            setStep("upload");
          }}
          className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium text-sm mb-2 hover:bg-gray-800 active:bg-gray-950"
        >
          上传照片，直接 AI 试穿
        </button>
        <button
          onClick={() => {
            setUploadMode("digital");
            setStep("upload");
          }}
          className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm mb-2 hover:bg-gray-50"
        >
          上传照片，生成数字分身
        </button>
        <button onClick={onSkip} className="text-sm text-gray-400">
          跳过，仅文字咨询
        </button>

        <p className="text-xs text-gray-300 mt-4">
          上传即同意《AI 服务协议》，照片仅用于生成试穿效果
        </p>
      </div>
    );
  }

  // ====== 上传照片页 ======
  if (step === "upload") {
    const isDigital = uploadMode === "digital";
    return (
      <div className="flex flex-col h-full px-6">
        {/* 顶部返回栏 */}
        <div className="flex items-center py-3 border-b border-gray-100">
          <button
            onClick={() => {
              setStep("main");
              setUploadedPhotos([]);
            }}
            className="text-gray-600 hover:text-gray-900 mr-3"
          >
            ← 返回
          </button>
          <span className="text-sm font-bold text-gray-900">
            {isDigital ? "上传照片 · 生成数字分身" : "上传形象照"}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          {/* 上传区域 */}
          {uploadedPhotos.length === 0 ? (
            <div className="w-full">
              <div className="text-sm text-gray-500 mb-4 text-left">
                {isDigital
                  ? "上传 1-3 张照片，AI 将基于你的真实照片生成专属数字分身，用于后续所有试穿效果。"
                  : "上传 1-3 张照片，AI 将用于生成真实试穿效果。"}
                <br />
                <span className="text-xs text-gray-400">
                  建议：正面照、侧面照、全身照各一张，效果最佳
                </span>
              </div>

              {/* 上传框 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                }}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[4/3] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <div className="text-3xl">📷</div>
                <div className="text-sm text-gray-500">点击选择照片</div>
                <div className="text-xs text-gray-400">支持 JPG/PNG，单张 ≤ 10MB</div>
              </button>

              <div className="mt-4 flex gap-2">
                <div className="flex-1 bg-gray-100 rounded-lg p-3 text-xs text-gray-500">
                  <div className="font-medium text-gray-700 mb-1">📸 正面照</div>
                  面部清晰可见，光线充足
                </div>
                <div className="flex-1 bg-gray-100 rounded-lg p-3 text-xs text-gray-500">
                  <div className="font-medium text-gray-700 mb-1">👤 侧面照</div>
                  展示身形轮廓
                </div>
                <div className="flex-1 bg-gray-100 rounded-lg p-3 text-xs text-gray-500">
                  <div className="font-medium text-gray-700 mb-1">🦵 全身照</div>
                  站立姿势，比例自然
                </div>
              </div>
            </div>
          ) : (
            /* 已选择照片 */
            <div className="w-full">
              <div className="text-sm text-gray-700 mb-3">
                已选择 {uploadedPhotos.length} 张照片
              </div>

              <div className="flex gap-3 mb-4">
                {uploadedPhotos.map((dataUrl, i) => (
                  <div
                    key={i}
                    className="flex-1 aspect-[3/4] rounded-xl overflow-hidden relative border border-gray-200"
                  >
                    <img
                      src={dataUrl}
                      alt={`照片 ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-2 right-2 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-black/80"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs text-center py-1">
                      {["正面照", "侧面照", "全身照"][i]}
                    </div>
                  </div>
                ))}
                {uploadedPhotos.length < 3 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 aspect-[3/4] border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 hover:border-gray-400"
                  >
                    <div className="text-center">
                      <div className="text-2xl">+</div>
                      <div className="text-xs">添加</div>
                    </div>
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  if (isDigital) {
                    setDigitalAvatarProfile(uploadedPhotos);
                    onGenerateAvatar();
                  } else {
                    setPhotoProfile(uploadedPhotos);
                    onStart();
                  }
                }}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800"
              >
                {isDigital
                  ? "确认上传，生成数字分身"
                  : "确认上传，开始体验"}
              </button>
              {isDigital && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  AI 将基于你的照片生成专属数字分身，生成过程约需 10-20 秒
                </p>
              )}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="py-3 flex items-center justify-center gap-1 text-xs text-gray-400">
          <span>🔒</span> 照片仅用于 AI 试穿生成，不会公开
        </div>
      </div>
    );
  }

  // ====== 数字分身上传页（保留兼容） ======
  return null;
}
