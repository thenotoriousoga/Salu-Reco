# フロントエンド アーキテクチャ

## 設計原則

| 原則 | 説明 |
|---|---|
| Server Components をデフォルトに | クライアントバンドルを最小化し、初期表示を高速化する |
| Feature ベースのモジュール分割 | バックエンドのバウンデッドコンテキストに対応した Feature フォルダで凝集度を高める |
| 型安全な API 通信 | OpenAPI スキーマから自動生成した型で、フロント・バック間の契約を保証する |
| スマホファースト | フットサルコートの現場で片手操作できる UI を最優先に設計する |
| 最小限のクライアント状態 | サーバー状態は Server Components で取得し、クライアント状態は UI フィードバックに限定する |

## 技術スタック

| カテゴリ | 技術 | バージョン | 選定理由 |
|---|---|---|---|
| フレームワーク | Next.js (App Router) | 16.x | RSC によるサーバーレンダリング、ファイルベースルーティング |
| 言語 | TypeScript | 5.x | 型安全性、IDE 支援、リファクタリング容易性 |
| UI | React | 19.x | Server Components、Suspense、Streaming |
| スタイル | Tailwind CSS | 4.x | ユーティリティファースト、CSS 変数との統合 |
| 状態管理 | Zustand | 5.x | 軽量、ボイラープレート最小、React 外からもアクセス可能 |
| フォーム | React Hook Form + Zod | 7.x / 4.x | 非制御コンポーネント、スキーマバリデーション |
| API クライアント | openapi-fetch | 0.17.x | OpenAPI スキーマから型推論、fetch ベース |
| 型生成 | openapi-typescript | 7.x | OpenAPI → TypeScript 型定義の自動生成 |
| QR コード | qrcode.react | 4.x | 参加コード共有用 SVG QR 生成 |

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Client Components (最小限)                               │  │
│  │  - インタラクティブ UI (フォーム、モーダル、スコアボード)  │  │
│  │  - Zustand Store (toast, loading, modal, role)            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Next.js Server (Node.js)                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Server Components (デフォルト)                            │  │
│  │  - データフェッチ、認証ガード、レイアウト                  │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  Route Handlers (BFF)                                     │  │
│  │  - 認証 Cookie 管理、バックエンドへのプロキシ             │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend (Spring Boot / Kotlin)                                  │
│  - REST API (OpenAPI 3.1)                                       │
│  - JWT 認証                                                     │
└─────────────────────────────────────────────────────────────────┘
```

## ディレクトリ構成

```
frontend/
├── app/                          Next.js App Router (ルーティング・レイアウト)
│   ├── layout.tsx                ルートレイアウト (フォント、グローバル UI)
│   ├── page.tsx                  / → 認証状態に応じたリダイレクト
│   ├── login/                    ログイン画面
│   ├── events/                   イベント関連ページ
│   │   ├── layout.tsx            認証ガード
│   │   ├── page.tsx              イベント一覧
│   │   ├── new/page.tsx          イベント作成
│   │   └── [id]/page.tsx         イベント詳細
│   └── api/                      Route Handlers (BFF)
│       ├── auth/                 認証エンドポイント
│       └── events/               イベント操作プロキシ
│
├── features/                     Feature モジュール (コンテキスト別)
│   ├── auth/                     認証
│   ├── event/                    イベント管理
│   ├── member/                   メンバー管理
│   ├── match/                    試合・ラウンド管理
│   ├── survey/                   アンケート
│   └── mvp/                      MVP 選出
│
├── shared/                       共有モジュール
│   ├── api/                      API クライアント・型定義
│   ├── components/ui/            共通 UI コンポーネント
│   ├── icons/                    SVG アイコン
│   ├── lib/                      ユーティリティ
│   └── store/                    Zustand ストア
│
└── public/                       静的アセット
```

## レイヤー構成

### 1. App 層 (app/)

Next.js のルーティングとレイアウトを担当する。ビジネスロジックは持たない。

- **Server Components**: データフェッチ、認証ガード、SEO メタデータ
- **Route Handlers**: Cookie 管理、バックエンドへのプロキシ（BFF パターン）
- **Layouts**: 共通 UI（ヘッダー、認証状態の同期）

### 2. Feature 層 (features/)

バックエンドのバウンデッドコンテキストに対応した機能モジュール。

```
features/{context}/
├── api/              サーバーサイド API 呼び出し関数
├── components/       Feature 固有のコンポーネント
├── hooks/            カスタムフック
└── schema.ts         Zod バリデーションスキーマ
```

**Feature 間の依存ルール**:
- Feature は `shared/` に依存してよい
- Feature 間の直接依存は禁止（必要なら `shared/` に抽出するか、App 層で組み合わせる）

### 3. Shared 層 (shared/)

Feature 横断で使われる共通モジュール。

- **api/**: 型付き API クライアント、自動生成型
- **components/ui/**: デザインシステムに基づく純 UI コンポーネント
- **icons/**: SVG アイコンコンポーネント
- **lib/**: 認証ユーティリティ、エラー変換
- **store/**: グローバル UI 状態（toast、loading、modal、role）

## Server Components と Client Components の使い分け

| 判断基準 | Server Component | Client Component |
|---|---|---|
| データフェッチ | ○ | × |
| 認証ガード | ○ | × |
| イベントハンドラ (onClick 等) | × | ○ |
| ブラウザ API (clipboard, localStorage) | × | ○ |
| フォーム入力 | × | ○ |
| リアルタイム更新 (スコアボード) | × | ○ |
| 静的表示 (一覧、詳細) | ○ | × |

### コンポーネント階層の例

```tsx
// Server Component (データフェッチ)
EventDetailPage (app/events/[id]/page.tsx)
  └── EventDetailTabs (Client Component - タブ切り替え)
       ├── MembersPanel (Client Component - CRUD 操作)
       │    └── MemberEditModal (Client Component - フォーム)
       ├── MatchesPanel (Client Component - スコア操作)
       └── ResultsPanel (Client Component - MVP 表示)
```

## 認証アーキテクチャ

### 方式: httpOnly Cookie + BFF パターン

```
Browser → Route Handler (Cookie 管理) → Backend (JWT 検証)
```

1. ログイン時: Route Handler がバックエンドから JWT を取得し、httpOnly Cookie に保存
2. 以降のリクエスト: Server Components が Cookie から JWT を読み取り、バックエンドに転送
3. ログアウト時: Cookie を削除

### 選定理由

- Server Components から Cookie にアクセス可能（localStorage は不可）
- httpOnly Cookie により XSS 攻撃で JWT が窃取されない
- JWT をクライアント JavaScript に露出させない

## 環境変数

| 変数名 | 用途 | デフォルト |
|---|---|---|
| `BACKEND_INTERNAL_URL` | サーバーサイドからバックエンドへの内部通信 URL | `http://backend:8080` |
| `NEXT_PUBLIC_API_BASE_URL` | クライアントサイドからの API ベース URL | `http://localhost:8080` |

## 開発サーバー

```bash
cd frontend
pnpm dev          # http://localhost:3000
```

バックエンドは Docker Compose で起動するか、ローカルで `./gradlew bootRun` を実行する。
