# コンポーネント設計

## 設計原則

| 原則 | 説明 |
|---|---|
| Feature ベースの分割 | バックエンドのバウンデッドコンテキストに対応した Feature フォルダにコンポーネントを配置 |
| Server Components をデフォルトに | `"use client"` は必要な場合のみ付与 |
| 共通 UI は shared に集約 | デザインシステムに基づく純 UI コンポーネントは `shared/components/ui/` に配置 |
| Props で制御 | コンポーネントの振る舞いは Props で外部から制御する |

## コンポーネント階層

```
Page (Server Component) — データフェッチ、認証
  └── Feature Component (Client Component) — ビジネスロジック、インタラクション
       └── Shared UI Component — 純粋な表示、スタイル
```

## Feature コンポーネント

### auth (認証)

| コンポーネント | 種別 | 責務 |
|---|---|---|
| `LoginForm` | Client | ログインフォーム（参加コード / 管理者パスワード） |

### event (イベント管理)

| コンポーネント | 種別 | 責務 |
|---|---|---|
| `CreateEventForm` | Client | イベント作成フォーム (React Hook Form + Zod) |
| `EventDetailTabs` | Client | イベント詳細のタブ切り替え (メンバー / 試合 / 結果) |
| `EventStatusControls` | Client | ステータス遷移ボタン (準備中→進行中→終了) |
| `JoinCodeBlock` | Client | 参加コード表示 + コピー + QR コード |

### member (メンバー管理)

| コンポーネント | 種別 | 責務 |
|---|---|---|
| `MembersPanel` | Client | メンバー登録フォーム + キュー + 一覧表示 |
| `MemberEditModal` | Client | メンバー編集モーダル |

### match (試合管理) ※設計中

| コンポーネント | 種別 | 責務 |
|---|---|---|
| `MatchesPanel` | Client | ラウンド一覧 + 試合操作 |
| `RoundCreator` | Client | ラウンド作成ステップ UI |
| `TeamSplitPreview` | Client | チーム分け結果プレビュー |
| `Scoreboard` | Client | 試合中スコアボード |
| `GoalRecorder` | Client | 得点記録パネル |

### mvp (MVP 選出) ※設計中

| コンポーネント | 種別 | 責務 |
|---|---|---|
| `ResultsPanel` | Client | 成績ランキング + MVP 結果表示 |
| `MvpCard` | Client | MVP / 準 MVP の結果カード |
| `MvpExecutor` | Client | MVP 選出実行 UI |

### survey (アンケート) ※設計中

| コンポーネント | 種別 | 責務 |
|---|---|---|
| `SurveyManager` | Client | アンケートフォーム作成・管理 |
| `SurveyResults` | Client | アンケート回答一覧 |

## 共通 UI コンポーネント (shared/components/ui/)

### Button

4 バリエーション × 3 サイズのボタン。

```tsx
<Button variant="primary" size="lg" leftIcon={<Icon name="check" />}>
  保存する
</Button>
```

| Props | 型 | 説明 |
|---|---|---|
| `variant` | `"primary" \| "secondary" \| "accent" \| "danger"` | スタイルバリエーション |
| `size` | `"sm" \| "md" \| "lg"` | サイズ (lg は幅 100%) |
| `leftIcon` | `ReactNode` | 左側アイコン |
| `fullWidth` | `boolean` | 幅 100% (lg 以外で使用) |

### Card

情報のグルーピングに使用する基本コンテナ。

```tsx
<Card>
  <h2>タイトル</h2>
  <p>コンテンツ</p>
</Card>
```

### Badge

メンバー属性やイベントステータスを表示するラベル。

```tsx
<Badge variant="ongoing">進行中</Badge>
<Badge variant="exp">経験あり</Badge>
```

| variant | 用途 |
|---|---|
| `preparing` | イベント: 準備中 |
| `ongoing` | イベント: 進行中 |
| `ended` | イベント: 終了 |
| `organizer` | メンバー: 幹事 |
| `years` | メンバー: 年次 |
| `exp` | メンバー: 経験あり |
| `noexp` | メンバー: 未経験 |

### Input / InputGroup

フォーム入力フィールド。`InputGroup` はラベルとエラーメッセージを含むラッパー。

```tsx
<InputGroup label="イベント名" htmlFor="name" error={errors.name?.message}>
  <Input id="name" type="text" {...register("name")} />
</InputGroup>
```

### EmptyState

データがない状態を表示するガイド。

```tsx
<EmptyState
  icon="calendar"
  title="まだイベントがありません"
  sub="右上のボタンから作成しましょう"
/>
```

### AppHeader

アプリ共通ヘッダー。ロゴ + ログアウトボタン。

### LoadingOverlay

全画面ローディングオーバーレイ。`useLoadingStore` と連動。

### ToastRoot

トースト通知の表示領域。`useToastStore` と連動。

### ModalRoot

確認ダイアログの表示領域。`useModalStore` と連動。

### RoleBody / RoleSync

ロール情報をサーバーからクライアントに同期し、`<body>` にロールクラスを付与する。

## アイコンシステム

### Icon コンポーネント

SVG インラインアイコン。`stroke: currentColor` で親の色を継承する。

```tsx
<Icon name="calendar" size={18} className="section-icon" />
```

| Props | 型 | 説明 |
|---|---|---|
| `name` | `IconName` | アイコン名 (IC オブジェクトのキー) |
| `size` | `number` | ピクセルサイズ (デフォルト: 14) |
| `className` | `string` | 追加 CSS クラス |
| `ariaLabel` | `string` | アクセシブルラベル (指定時は aria-hidden を外す) |

### アイコン一覧

| 名前 | 用途 |
|---|---|
| `goal` | 得点 |
| `trophy` | MVP |
| `check` | 完了、確認 |
| `x` | 閉じる、キャンセル |
| `plus` | 追加 |
| `minus` | 減算 |
| `trash` | 削除 |
| `flag` | イベント終了 |
| `whistle` | 試合 |
| `info` | 情報 |
| `more` | メニュー |
| `arrowLeft` | 戻る |
| `arrowRight` | 進む |
| `calendar` | 日付、イベント |
| `logout` | ログアウト |
| `play` | 開始、参加 |
| `userPlus` | メンバー登録 |
| `users` | メンバー一覧 |
| `edit` | 編集 |
| `file` | コピー |

## コンポーネント実装ガイドライン

### Server Component の書き方

```tsx
// データフェッチは async で直接行う
export default async function EventsPage() {
  const { events } = await listEvents();
  return <EventList events={events} />;
}
```

### Client Component の書き方

```tsx
"use client";

// 必要最小限のインタラクティブ部分のみ Client Component にする
export function EventDetailTabs({ eventId }: { eventId: string }) {
  const [active, setActive] = useState<Tab>("members");
  // ...
}
```

### コンポーネントの命名規則

| 種別 | 命名 | 例 |
|---|---|---|
| ページコンポーネント | `{Name}Page` (export default) | `EventsPage` |
| Feature コンポーネント | `{Name}{Role}` | `MembersPanel`, `EventStatusControls` |
| 共通 UI | `{Name}` | `Button`, `Card`, `Badge` |
| モーダル | `{Name}Modal` | `MemberEditModal` |
| フォーム | `{Name}Form` | `CreateEventForm`, `LoginForm` |
