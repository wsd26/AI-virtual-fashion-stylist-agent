import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "得物搭子 - AI 穿搭伙伴",
  description: "AI 虚拟穿搭伙伴 Agent Demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
