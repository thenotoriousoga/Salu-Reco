# パフォーマンス最適化

## 設計方針

フットサルコートの現場（モバイル回線）で快適に動作することを前提に、初期表示速度とインタラクション応答性を最適化する。

## Server Components による最適化

### バンドルサイズの最小化

Server Components をデフォルトにすることで、クライアントに送信される JavaScript を最小限に抑える。

| コンポーネント種別 | クライアントバンドルへの影響 |
|---|---|
| Server Component | HTML のみ送信。JS バンドルに含まれない |
| Client Component | JS バンドルに含まれる |

**原則**: `"use client"` はインタラクティブな操作が必要な場合のみ付与する。

### データフェッチの最適化

```tsx
// ○ Server Component で直接フェッチ (ウォーターフォール回避)
export default async function EventDetailPage({ params }) {
  const event = await getEventDetail(params.id);
  return <EventDetail event={event} />;
}

// × Client Component でフェッチ (追加のラウンドトリップ)
// HTML 表示 → JS ロード → フェッチ開始 → データ表示
```

## バンドル最適化

### 直接インポート (barrel file 回避)

```typescript
// ○ 直接インポート
import { Button } from "@/shared/components/ui/Button";

// × barrel file 経由 (ツリーシェイキングが効きにくい)
import { Button } from "@/shared/components/ui";
```

### 動的インポート

重いコンポーネントは `next/dynamic` で遅延読み込みする。

```tsx
import dynamic from "next/dynamic";

// QR コードライブラリは参加コード表示時のみ必要
const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((mod) => mod.QRCodeSVG),
  { ssr: false }
);
```

### サードパーティライブラリの遅延読み込み

| ライブラリ | 読み込みタイミング |
|---|---|
| qrcode.react | 参加コードブロック表示時 |
| zod | フォーム表示時 (React Hook Form と共に) |

## フォント最適化

### next/font による最適化

```tsx
const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fira-sans",
  display: "swap",  // FOIT 回避
});
```

- `display: "swap"`: フォント読み込み中はフォールバックフォントで表示
- `subsets: ["latin"]`: 必要なサブセットのみ読み込み
- CSS 変数経由で参照: フォントファイルの重複読み込みを防止

## レンダリング最適化

### 不要な再レンダリングの防止

```tsx
// ○ Zustand のセレクタで必要な値のみ購読
const role = useRoleStore((s) => s.role);

// × ストア全体を購読 (どの値が変わっても再レンダリング)
const store = useRoleStore();
```

### コンポーネント分割による再レンダリング境界

```tsx
// ○ インタラクティブ部分を分離
function EventDetailPage({ event }) {
  return (
    <>
      <EventInfo event={event} />           {/* 静的表示 */}
      <EventStatusControls eventId={event.id} /> {/* インタラクティブ */}
    </>
  );
}
```

### 条件付きレンダリング

```tsx
// ○ 三項演算子 (React が正しく差分検出)
{active === "members" ? <MembersPanel /> : null}

// × && 演算子 (falsy 値が DOM に漏れるリスク)
{count && <Badge>{count}</Badge>}
```

## ネットワーク最適化

### API 呼び出しの最小化

| パターン | 実装 |
|---|---|
| 一括登録 | メンバーをキューに溜めて一括 POST |
| デバウンス | スコア操作を 300ms デバウンスしてから保存 |
| 楽観的更新 | UI を即座に更新し、バックグラウンドで保存 |

### キャッシュ戦略

| データ | キャッシュ | 理由 |
|---|---|---|
| イベント一覧 | `force-dynamic` | 常に最新データが必要 |
| イベント詳細 | `force-dynamic` | ステータスがリアルタイムで変わる |
| メンバー一覧 | `cache: "no-store"` | 登録・削除が頻繁 |

現時点ではリアルタイム性を優先し、積極的なキャッシュは行わない。
将来的に SWR や React Query を導入してキャッシュ + 再検証パターンを適用する余地がある。

## 画像・アセット最適化

### SVG アイコン

- インライン SVG を使用（外部ファイルリクエストなし）
- `stroke-based` で `currentColor` を継承（CSS で色制御可能）
- `viewBox="0 0 24 24"` で統一

### QR コード

- SVG 形式で生成（ラスタ画像より軽量）
- クライアントサイドで動的生成（サーバーリソース不要）

## パフォーマンス計測

### Core Web Vitals 目標

| 指標 | 目標 | 説明 |
|---|---|---|
| LCP | < 2.5s | 最大コンテンツの表示 |
| FID | < 100ms | 初回入力の応答 |
| CLS | < 0.1 | レイアウトシフト |

### 計測方法

- Next.js の組み込み Web Vitals レポート
- Lighthouse (Chrome DevTools)
- モバイル実機テスト（4G 回線シミュレーション）
