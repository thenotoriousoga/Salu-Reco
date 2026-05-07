import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 開発モードで左下に出る Next.js の開発インジケーターを非表示にする。
  // レイアウト確認時に既存デザインと見た目を合わせるため。
  devIndicators: false,
};

export default nextConfig;
