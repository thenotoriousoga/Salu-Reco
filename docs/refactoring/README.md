# Salu-Rec リプレース — 進捗管理

GAS 版から Next.js + Spring Boot + PostgreSQL への全面リプレースの **進捗管理と実行手順** を管理するディレクトリです。

> **このディレクトリの役割**: 進捗管理と実行手順のみ。設計情報は持たない（SSoT ルール）。

## 再開時の読み方

1. **[09-progress.md](09-progress.md)** を開いて現在地を確認
2. 次にやるタスクの詳細は **[08-execution-guide.md](08-execution-guide.md)** を参照
3. 設計の詳細は正のソースを参照:

| 情報 | 正のソース |
|---|---|
| バックエンド設計 | [docs/backend/design/](../backend/design/README.md) |
| フロントエンド設計 | [docs/frontend/](../frontend/README.md) |
| API 仕様 | [api/openapi.yaml](../../api/openapi.yaml) |
| DB スキーマ | [Flyway マイグレーション](../../backend/src/main/resources/db/migration/) + [ER 図](../er-diagram.md) |
| Docker 環境 | [docs/docker-strategy.md](../docker-strategy.md) |

## このディレクトリのファイル

| ファイル | 内容 |
|---|---|
| [07-migration-plan.md](07-migration-plan.md) | 段階的マイグレーション計画 (Phase 0〜9) |
| [08-execution-guide.md](08-execution-guide.md) | **実行手順書** (Phase ごとの具体的コマンドとファイル例) |
| [09-progress.md](09-progress.md) | **進捗チェックリスト** ← 再開時は最初にここ |

## 現状

- [x] Phase 0: プロジェクト基盤整備
- [x] Phase 1: ウォーキングスケルトン (Event)
- [x] Phase 1.5: デザインシステム移植
- [x] Phase 2: 認証基盤
- [x] Phase 3: Event コンテキスト完成
- [x] Phase 4: Member コンテキスト
- [ ] Phase 4.5: 既存実装の設計適合チェック ← **次はここ**
- [ ] Phase 5: Match Operation
- [ ] Phase 6: MVP Evaluation
- [ ] Phase 7: Survey
- [ ] Phase 8: 仕上げ・デプロイ
- [ ] Phase 9: 旧システム停止
