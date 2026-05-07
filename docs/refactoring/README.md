# Salu-Rec リプレース設計ドキュメント

GAS + スプレッドシート版の Salu-Rec を、
**Next.js (TypeScript) + Spring Boot (Kotlin) + PostgreSQL** に DDD で再構築するためのドキュメント群です。

## 再開時の読み方

**チャットコンテキストが消えても続きから再開できるよう設計しています。**

1. まず **[09-progress.md](09-progress.md)** を開いて現在地を確認
2. 次にやるタスクの詳細は **[08-execution-guide.md](08-execution-guide.md)** を参照
3. 設計判断の背景は **[10-decisions.md](10-decisions.md)** を参照

## 目次

| # | ドキュメント | 内容 |
|---|---|---|
| 00 | [overview](00-overview.md) | リプレース全体像・技術スタック・ディレクトリ構成 |
| 01 | [ubiquitous-language](01-ubiquitous-language.md) | ユビキタス言語辞書 |
| 02 | [context-map](02-context-map.md) | 境界づけられたコンテキストとマップ |
| 03 | [aggregates](03-aggregates.md) | 集約設計 (エンティティ、値オブジェクト、不変条件) |
| 04 | [rdb-schema](04-rdb-schema.md) | PostgreSQL スキーマ設計 |
| 05 | [backend-architecture](05-backend-architecture.md) | Spring Boot + Kotlin + JPA、オニオン × CQRS |
| 06 | [frontend-architecture](06-frontend-architecture.md) | Next.js ディレクトリ構成とデータフェッチ戦略 |
| 07 | [migration-plan](07-migration-plan.md) | 段階的マイグレーション計画 (Phase 0〜9) |
| 08 | [execution-guide](08-execution-guide.md) | **実行手順書 (コマンドとファイル例)** |
| 09 | [progress](09-progress.md) | **進捗チェックリスト** ← 再開時は最初にここ |
| 10 | [decisions](10-decisions.md) | 設計決定記録 (ADR) |
| 11 | [docker-environment](11-docker-environment.md) | Docker 環境構成 (開発・本番) |

## 重要な方針 (ハイライト)

- **ホスト OS に開発ツールを入れない**: Docker 以外は不要 (ADR-010)
- **OS 非依存**: ユーザーがホストで叩くのは `docker` と `docker compose` のみ
- **オニオン × CQRS**: Command/Query を物理的にパッケージ分離 (ADR-001)
- **Persistence Model パターン**: Domain と JPA Entity を完全分離 (ADR-002)
- **UUID v7**: 時系列順ID、B-Tree 断片化抑制 (ADR-003)
- **Match / SurveyResponse は独立集約** (ADR-004, ADR-006)
- **Survey は Web フォーム自前化** (ADR-005)
- **最新LTS**: Kotlin 2.3.21 / JDK 21 / Spring Boot 4.0.6 / Node.js 24 LTS (ADR-009)

## 現状

- [x] ドキュメント整備完了
- [ ] Phase 0 (プロジェクト基盤整備) ← 次はここ
- [ ] Phase 1 〜 9
