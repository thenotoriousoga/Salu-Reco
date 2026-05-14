# デザインシステム (フロントエンド実装)

## デザインコンセプト

**Vibrant & Block-based** — スポーツの躍動感を表現する鮮やかな配色と、情報を明確に区切るブロックレイアウト。

体育館やフットサルコートの照明下でも視認性が高く、片手操作でストレスなく使えることを最優先に設計する。

## デザイン原則

| 原則 | 説明 |
|---|---|
| スマホファースト | 最大幅 600px のコンテナ。片手の親指で届く範囲にアクションを配置 |
| 即座のフィードバック | すべての操作にローディング・トースト・アニメーションで応答 |
| ロール別の情報設計 | 管理者と一般ユーザーで見える情報を明確に分離 |
| 現場で迷わない | 初見でも操作手順がわかるステップ表示と空状態ガイド |

## カラーパレット

### CSS 変数 (デザイントークン)

```css
:root {
  /* ブランドカラー */
  --primary: #DC2626;        /* メインアクション、ヘッダー */
  --primary-dark: #B91C1C;   /* ホバー状態 */
  --secondary: #EF4444;      /* グラデーション中間色 */
  --accent: #FBBF24;         /* 特別なアクション、MVP */
  --accent-dark: #D97706;    /* アクセントホバー */

  /* 背景 */
  --bg: #FEF2F2;             /* ページ背景 */
  --bg-card: #FFFFFF;        /* カード背景 */
  --bg-surface: #FFF5F5;     /* セクション背景 */

  /* テキスト */
  --text: #7F1D1D;           /* 本文 */
  --text-secondary: #991B1B; /* ラベル、小見出し */
  --text-muted: #92400E;     /* 補足テキスト (WCAG AA 4.5:1 以上) */

  /* ボーダー */
  --border: #FECACA;         /* 入力フィールド */
  --border-light: #FEE2E2;   /* 軽い区切り線 */

  /* チームカラー (5チーム対応) */
  --team-a: #2563EB;  --team-a-bg: #DBEAFE;  --team-a-border: #93C5FD;
  --team-b: #DB2777;  --team-b-bg: #FCE7F3;  --team-b-border: #F9A8D4;
  --team-c: #059669;  --team-c-bg: #D1FAE5;  --team-c-border: #6EE7B7;
  --team-d: #D97706;  --team-d-bg: #FEF3C7;  --team-d-border: #FCD34D;
  --team-e: #7C3AED;  --team-e-bg: #EDE9FE;  --team-e-border: #C4B5FD;

  /* セマンティック */
  --success: #059669;        /* 成功、進行中 */
  --success-bg: #D1FAE5;
  --danger: #DC2626;         /* 削除、エラー */

  /* シャドウ */
  --shadow-sm: 0 1px 3px rgba(127, 29, 29, 0.08);
  --shadow-md: 0 4px 12px rgba(127, 29, 29, 0.1);
  --shadow-lg: 0 8px 24px rgba(127, 29, 29, 0.12);

  /* 角丸 */
  --radius: 16px;            /* カード、大きなボタン */
  --radius-sm: 10px;         /* 入力フィールド、通常ボタン */
  --radius-xs: 6px;          /* 小さなボタン、バッジ */

  /* トランジション */
  --transition: 200ms ease;
}
```

## タイポグラフィ

### フォントファミリー

| 用途 | フォント | CSS 変数 |
|---|---|---|
| 本文・UI | Fira Sans | `--font-fira-sans` |
| データ・コード | Fira Code | `--font-fira-code` |
| ロゴ | Luckiest Guy | `--font-luckiest-guy` |

Next.js の `next/font/google` で読み込み、CSS 変数として `<html>` に付与する。

```tsx
const firaSans = Fira_Sans({ variable: "--font-fira-sans", display: "swap" });
const firaCode = Fira_Code({ variable: "--font-fira-code", display: "swap" });
const luckiestGuy = Luckiest_Guy({ variable: "--font-luckiest-guy", display: "swap" });
```

### フォントサイズ体系

| 要素 | サイズ | ウェイト | フォント |
|---|---|---|---|
| ヘッダータイトル | 1.4rem | 400 | Luckiest Guy |
| カード見出し (h2) | 1.15rem | 700 | Fira Code |
| セクション見出し (h3) | 0.95rem | 600 | Fira Sans |
| 本文 | 0.95rem | 400 | Fira Sans |
| ボタン | 0.9rem | 600 | Fira Sans |
| バッジ | 0.65rem | 700 | Fira Code |
| スコア表示 | 3.5rem | 700 | Fira Code |

### 使い分けの方針

- **Fira Code（等幅）**: スコア、イベントコード、ランキング番号、ステータスバッジなど「データ」として読む要素
- **Fira Sans（プロポーショナル）**: ボタンラベル、説明文、入力フィールドなど「文章」として読む要素

## スペーシング・レイアウト

### コンテナ

| プロパティ | 値 |
|---|---|
| 最大幅 | 600px |
| パディング | 16px 12px |
| ページ下余白 | 24px |

### レスポンシブ

| 幅 | 対応 |
|---|---|
| 〜374px | 超小型スマホ: グリッド 1 列化、スコア文字縮小 |
| 375px〜600px | 標準スマホ: メインターゲット |
| 601px〜 | タブレット以上: コンテナ中央寄せ |

## スタイル実装方針

### Tailwind CSS + CSS 変数のハイブリッド

- **CSS 変数**: デザイントークン（カラー、角丸、シャドウ）を `:root` で定義
- **Tailwind CSS**: ユーティリティクラスでレイアウト・スペーシングを制御
- **globals.css**: コンポーネント固有のスタイル（`.card`, `.btn`, `.tab-bar` 等）

### 色の変更ルール

色を変更する場合は `:root` の CSS 変数のみを変更する。ハードコードされた色値は使用しない。

### クラス命名

- BEM ではなくシンプルなクラス名（`.card`, `.btn-primary`, `.team-a`）
- ロール制御: `.admin-only`, `.user-only`
- 状態: `.active`, `.show`

## アニメーション・トランジション

### トランジション

| 対象 | 時間 | イージング |
|---|---|---|
| 汎用 (ボタン、入力) | 200ms | ease |
| トースト | 300ms | ease |
| スピナー | 700ms | linear |

### アニメーション

| 名前 | 効果 | トリガー |
|---|---|---|
| `fadeUp` | 8px 上方向からフェードイン (300ms) | カード表示時 |
| `scoreBounce` | scale(1.2) → scale(1) (300ms) | スコア変更時 |
| `spin` | 360 度回転 (700ms, 無限) | ローディングスピナー |

### モーション配慮

```css
@media (prefers-reduced-motion: no-preference) {
  .card { animation: fadeUp 300ms ease both; }
}
```

OS レベルで「視差効果を減らす」が有効な場合、アニメーションは無効化される。

## アクセシビリティ

| 項目 | 実装 |
|---|---|
| 言語宣言 | `<html lang="ja">` |
| フォーカス表示 | `focus-visible` で 3px アウトライン |
| モーション配慮 | `prefers-reduced-motion` でアニメーション制御 |
| タッチターゲット | 最小 44×44px |
| コントラスト比 | WCAG AA 基準 (4.5:1) 以上 |
| SVG アイコン | `aria-hidden="true"` (装飾的アイコン) |
| ローディング | `role="status"` + `aria-label="読み込み中"` |
| トースト | `role="alert"` + `aria-live="polite"` |
| モーダル | `role="dialog"` + `aria-modal="true"` + `aria-labelledby` |
| フォームラベル | 全入力フィールドに `<label>` または `aria-label` |

## ロール別 UI 設計

### 仕組み

```css
body.role-user .admin-only  { display: none !important; }
body.role-admin .user-only  { display: none !important; }
```

### 管理者 (admin) に表示される要素

- イベント作成ボタン
- メンバー登録フォーム
- メンバー編集・削除ボタン
- ステータス遷移ボタン
- イベントコード表示
- 一覧に戻るボタン
- アンケートフォーム作成
- MVP 選出実行

### 一般ユーザー (user) に表示される要素

- イベント詳細（タブ: メンバー / 試合 / 結果）
- メンバー一覧（閲覧のみ）
- 試合スコア操作
- 成績閲覧
- MVP 結果閲覧
