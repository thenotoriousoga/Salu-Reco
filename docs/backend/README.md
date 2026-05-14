# バックエンドドキュメント

Spring Boot (Kotlin) + PostgreSQL によるバックエンド実装のドキュメント群。

## ディレクトリ構成

```
docs/backend/
├── README.md          ← このファイル
├── AGENTS.md          ← AIエージェント向けガイド
└── design/            ← 設計ドキュメント
    ├── README.md      ← 設計ドキュメントのナビゲーション（読み順ガイド）
    ├── *.md           ← 横断的な設計方針
    ├── event/         ← Event コンテキスト
    ├── identity/      ← Identity & Access コンテキスト
    ├── match/         ← Match Operation コンテキスト
    ├── member/        ← Member コンテキスト
    ├── mvp/           ← MVP Evaluation コンテキスト
    └── survey/        ← Survey コンテキスト
```

## クイックリンク

| 目的 | ドキュメント |
|---|---|
| 設計を初めて読む | [design/README.md](design/README.md) |
| アーキテクチャ全体像 | [design/backend-architecture.md](design/backend-architecture.md) |
| コンテキスト境界の確認 | [design/context-map.md](design/context-map.md) |
| 用語の確認 | [design/ubiquitous-language.md](design/ubiquitous-language.md) |
| パッケージ構成 | [design/package-structure.md](design/package-structure.md) |
| リプレース全体の進捗 | [../refactoring/09-progress.md](../refactoring/09-progress.md) |

## 技術スタック

| 項目 | 技術 |
|---|---|
| 言語 | Kotlin 2.3.x |
| フレームワーク | Spring Boot 4.0.x |
| ORM | Hibernate (JPA) 7.x |
| DB | PostgreSQL 16 |
| マイグレーション | Flyway |
| API 定義 | OpenAPI 3.1 + openapi-generator |
| 認証 | JWT (jjwt) |
| テスト | JUnit 5 + Kotest + MockK + Testcontainers + ArchUnit |

## 関連ドキュメント

- [API 仕様 (OpenAPI)](../../api/openapi.yaml)
- [ER 図](../er-diagram.md)
- [Docker 戦略](../docker-strategy.md)
- [リプレース計画](../refactoring/README.md)
