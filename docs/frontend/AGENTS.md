# AGENTS.md — フロントエンド

AI エージェントがフロントエンド (`frontend/`) のコードを変更する際のルール。

## 最初に読むもの

1. [README.md](README.md) — ドキュメント一覧と技術スタック
2. [architecture.md](architecture.md) — ディレクトリ構成とレイヤー設計
3. 変更対象の Feature に関連するドキュメント（routing, components, api-integration 等）

## 絶対に守るルール

1. **Server Components をデフォルトにする**: `"use client"` はインタラクティブな操作が必要な場合のみ付与
2. **Feature 間の直接依存は禁止**: Feature は `shared/` に依存してよいが、Feature 同士は依存しない
3. **API の型を手書きしない**: `pnpm gen:api` で `api/openapi.yaml` から自動生成する
4. **色のハードコードは禁止**: `:root` の CSS 変数のみを使用する
5. **barrel file (index.ts) を使わない**: 直接インポートでツリーシェイキングを効かせる
6. **Client Components からバックエンドに直接通信しない**: Route Handlers (BFF) を経由する
7. **`"server-only"` インポートを付ける**: サーバーサイド専用の API 関数には必ず付与し、クライアントバンドルへの混入を防止

## ディレクトリ構成と配置ルール

```
frontend/
├── app/              ルーティング・レイアウト（ビジネスロジックを持たない）
├── features/         Feature モジュール（バックエンドのコンテキストに対応）
├── shared/           Feature 横断の共通モジュール
└── public/           静的アセット
```

| 追加するもの | 配置先 |
|---|---|
| ページ | `app/{path}/page.tsx` |
| レイアウト・認証ガード | `app/{path}/layout.tsx` |
| Route Handler (BFF) | `app/api/{path}/route.ts` |
| Feature コンポーネント | `features/{context}/components/` |
| Feature API 関数 (サーバー専用) | `features/{context}/api/` |
| Feature カスタムフック | `features/{context}/hooks/` |
| Zod スキーマ | `features/{context}/schema.ts` |
| 共通 UI コンポーネント | `shared/components/ui/` |
| Zustand ストア | `shared/store/` |
| ユーティリティ | `shared/lib/` |
| SVG アイコン | `shared/icons/` |
| API クライアント・型定義 | `shared/api/` |

## コーディング規約

- TypeScript strict mode
- コンポーネント命名: `{Name}Page`, `{Name}Form`, `{Name}Modal`, `{Name}Panel`
- Tailwind CSS + CSS 変数のハイブリッド（レイアウトは Tailwind、色・角丸・シャドウは CSS 変数）
- フォーム: React Hook Form + Zod
- 状態管理: サーバー状態は Server Components、UI 状態は Zustand、フォームは RHF、ローカルは useState
- テストファイルはテスト対象と同じディレクトリに配置（コロケーション）

## ビルド・テスト

```bash
pnpm dev             # 開発サーバー (http://localhost:3000)
pnpm build           # プロダクションビルド
pnpm test            # 単体テスト + コンポーネントテスト (Vitest)
pnpm test:e2e        # E2E テスト (Playwright)
pnpm gen:api         # OpenAPI → TypeScript 型生成
```

## コード変更後に更新すべきドキュメント

| 変更内容 | 更新対象 |
|---|---|
| 新しいページ追加 | `docs/frontend/routing.md` |
| 共通 UI コンポーネント追加 | `docs/frontend/components.md` |
| Zustand ストア追加 | `docs/frontend/state-management.md` |
| API エンドポイント追加 | `api/openapi.yaml` + `docs/frontend/api-integration.md` |
| デザイントークン変更 | `docs/frontend/design-system.md` |
