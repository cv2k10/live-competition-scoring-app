import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope, Space_Grotesk, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { ToastHost } from "@/components/Toast";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "现场评分 LiveScore",
  description: "比赛现场打分 · 实时成绩大屏 · 评委免登录",
};

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-noto-sans-sc",
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${manrope.variable} ${spaceGrotesk.variable} ${notoSansSC.variable}`}
    >
      <body className="antialiased" suppressHydrationWarning>
        <I18nProvider>
          {children}
          <ToastHost />
        </I18nProvider>
      </body>
    </html>
  );
}
