import type { Metadata } from "next";
import { Fira_Sans, Fira_Code, Luckiest_Guy } from "next/font/google";
import { AppHeader } from "@/shared/components/ui/AppHeader";
import { LoadingOverlay } from "@/shared/components/ui/LoadingOverlay";
import { ModalRoot } from "@/shared/components/ui/ModalRoot";
import { RoleBody } from "@/shared/components/ui/RoleBody";
import { ToastRoot } from "@/shared/components/ui/ToastRoot";
import "./globals.css";

/**
 * 本文用 (Fira Sans) と等幅データ表示用 (Fira Code)、
 * ロゴ用 (Luckiest Guy) を CSS 変数に割り当てて globals.css から参照する。
 * ref: docs/design-system.md
 */
const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fira-sans",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fira-code",
  display: "swap",
});

const luckiestGuy = Luckiest_Guy({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-luckiest-guy",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Salu-Rec",
  description: "フットサルの試合管理・MVP選出アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${firaSans.variable} ${firaCode.variable} ${luckiestGuy.variable}`}
    >
      <RoleBody>
        <AppHeader />
        <main className="content">{children}</main>
        <ToastRoot />
        <ModalRoot />
        <LoadingOverlay />
      </RoleBody>
    </html>
  );
}
