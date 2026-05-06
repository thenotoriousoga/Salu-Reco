# Salu-Rec リプレース設計ドキュメント

GAS + スプレッドシート版の Salu-Rec を、
**Next.js (TypeScript) + Spring Boot (Kotlin) + PostgreSQL** に DDD で再構築するためのドキュメント群です。

## 目次

| # | ドキュメント | 内容 |
|---|---|---|
| 00 | [overview](00-overview.md) | リプレース全体像・技術スタック・ディレクトリ構成 |
| 01 | [ubiquitous-language](01-ubiquitous-language.md) | ユビキタス言語辞書 |
| 02 | [context-map](02-context-map.md) | 境界づけられたコンテキストとマップ |
| 03 | [aggregates](03-aggregates.md) | 集約設計 (エンティティ、値オブジェクト、不変条件) |
| 04 | [rdb-schema](04-rdb-schema.md) | PostgreSQL スキーマ設計 |
| 05 | [backend-architecture](05-backend-architecture.md) | Spring Boot + Kotlin レイヤー構成 |
| 06 | [frontend-architecture](06-frontend-architecture.md) | Next.js ディレクトリ構成とデータフェッチ戦略 |
| 07 | [migration-plan](07-migration-plan.md) | 段階的マイグレーション計画 |

## 読む順番

1. 全体像を掴むなら **00 → 02 → 07**
2. 実装に入る前に **01 → 03 → 04 → 05 → 06**
3. 迷ったら **03 (集約設計)** に立ち戻る

## 現状のステータス

- [x] Phase 0 準備: 設計ドキュメント作成
- [ ] Phase 0 実装: Monorepo基盤整備
- [ ] Phase 1: ウォーキングスケルトン (Event集約貫通)
- [ ] Phase 2 以降
