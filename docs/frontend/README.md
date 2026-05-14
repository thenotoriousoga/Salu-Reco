# フロントエンド設計ドキュメント

## 概要

Salu-Rec フロントエンドの設計・実装に関するドキュメント群です。

- AI エージェント向けのルールは [AGENTS.md](AGENTS.md) を参照

## ドキュメント一覧

| ファイル | 内容 |
|---|---|
| [architecture.md](architecture.md) | アーキテクチャ全体像、技術スタック、設計原則 |
| [routing.md](routing.md) | ルーティング設計、認証ガード、画面遷移 |
| [state-management.md](state-management.md) | 状態管理戦略、サーバー状態とクライアント状態の分離 |
| [api-integration.md](api-integration.md) | API クライアント設計、型生成、BFF パターン |
| [components.md](components.md) | コンポーネント設計、Feature 分割、共通 UI |
| [design-system.md](design-system.md) | デザイントークン、カラー、タイポグラフィ、スタイル方針 |
| [performance.md](performance.md) | パフォーマンス最適化、バンドル戦略、レンダリング |
| [testing.md](testing.md) | テスト戦略、テスト種別、実行方法 |

## 技術スタック概要

| 項目 | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript 5 |
| UI ライブラリ | React 19 |
| スタイル | Tailwind CSS 4 + CSS 変数 |
| 状態管理 | Zustand (クライアント) |
| フォーム | React Hook Form + Zod |
| API クライアント | openapi-fetch (型安全) |
| 型生成 | openapi-typescript |
| パッケージマネージャ | pnpm |

## 関連ドキュメント

- [デザインシステム](design-system.md) — カラーパレット、コンポーネント仕様
- [バックエンド設計](../backend/design/backend-architecture.md) — API 仕様、ドメインモデル
- [ER 図](../er-diagram.md) — データモデル
- [OpenAPI 定義](../../api/openapi.yaml) — API スキーマ
