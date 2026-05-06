# リプレース概要

## ゴール

Salu-Rec を以下の技術スタックで再構築する。

| レイヤー | Before | After |
|---|---|---|
| フロントエンド | GAS HTMLService + Vanilla JS | **Next.js 15 (App Router) + TypeScript** |
| バックエンド | Google Apps Script (.gs) | **Spring Boot 3.x + Kotlin** |
| データストア | Google スプレッドシート | **PostgreSQL 16** |
| アンケート | Google フォーム | Google フォーム連携 or 自前実装(後続で決定) |
| 設計思想 | 手続き的 | **ドメイン駆動設計 (DDD) + モジュラモノリス** |

## 非ゴール

- 既存データ(スプレッドシート上のイベント)の移行は行わない
- マイクロサービス分割はしない(モジュラモノリスで境界づけられたコンテキストを表現)

## AS IS からの主要な TO BE 差分

| 項目 | AS IS | TO BE |
|---|---|---|
| ID | UUID 先頭8文字(独自) | **UUID v7** (PostgreSQL UUID型) |
| Match の位置づけ | Round 集約の子 | **独立集約** |
| Survey 実装 | Google フォーム連携 | **アプリ内 Web フォーム** |
| SurveyResponse | Survey 集約の子 | **独立集約** |
| Event 作成時のメール送信 | あり | **廃止**(QRコード/コピーUIに置換) |
| 永続化 | スプレッドシート | PostgreSQL + Spring Data JPA |
| 設計思想 | 手続き的 | ドメイン駆動設計 + モジュラモノリス + CQRS |

詳細は [07-migration-plan.md](07-migration-plan.md) を参照。

## 設計原則

### 1. 境界づけられたコンテキスト (Bounded Context) ごとにモジュール分割

各コンテキストは独立したパッケージとして実装し、以下を守る。

- **ドメイン層はフレームワークに依存しない** (Spring / JPA / HTTPに染まらない)
- **他コンテキストの内部モデルを直接参照しない** (集約ID参照のみ)
- **コンテキスト間連携はアプリケーション層またはドメインイベント経由で行う**

### 1.5 オニオンアーキテクチャ × CQRS

バックエンドは**オニオンアーキテクチャ**を採用し、
**Application 層を Command(書き込み) と Query(読み取り) に分離する CQRS** を適用する。

- 依存方向は外側 → 内側のみ (ArchUnit で CI 強制)
- Write 経路: 集約 + Repository 経由(整合性保証)
- Read 経路: QueryService が JPQL の constructor expression で直接 DTO 射影(集約を経由しない)
- シングルストア方式(Write/Read 同じ PostgreSQL。イベントソーシングはしない)
- 詳細は [05-backend-architecture.md](05-backend-architecture.md) を参照

### 2. 集約 (Aggregate) は小さく保つ

巨大な集約はパフォーマンスと整合性ルールの肥大化を招く。
スプレッドシート時代のように「イベント配下に全部ぶら下がる」構造を引きずらず、
トランザクション境界を基準に切り直す。

### 3. RDB スキーマは集約を素直にマッピング

Spring Data JPA (Hibernate) を採用し、**Persistence Model パターン**でドメインモデルと JPA Entity を完全分離する。
スキーマは Flyway で管理し、Hibernate の `ddl-auto=validate` 固定で自動生成に頼らない。
基本は `FetchType.LAZY` とし、必要なときに明示的にロードする。

### 4. API は集約単位でリソース設計

RESTful に近いスタイル。認証は JWT(Bearer) のステートレス方式。
OpenAPI スキーマを Single Source of Truth として、
TypeScript クライアントを自動生成する。

### 5. ロール判定はサーバー側で行う

GAS 時代はクライアント側の `currentRole` で制御していたが、
Next.js からサーバーへのリクエストごとに JWT を検証してロールを判定する。
UI出し分けは JWT のペイロード(roleクレーム)を元に行う。

## 技術スタック詳細

### バックエンド

| 項目 | 採用 | 理由 |
|---|---|---|
| 言語 | Kotlin 2.0+ | ユーザー指定 |
| フレームワーク | Spring Boot 3.3+ | 標準選択肢。Spring Modulith で境界強制も可能 |
| ビルド | Gradle (Kotlin DSL) | Kotlinプロジェクト標準 |
| 永続化 | **Spring Data JPA (Hibernate 6)** | Persistence Modelパターンでドメインと分離。国内事例豊富、DDDとも共存可能 |
| DB | PostgreSQL 16 | JSON / UUID / 配列サポートが豊富 |
| マイグレーション | Flyway | Spring Boot との統合が容易。`ddl-auto=validate` 固定 |
| JSONB型 | hypersistence-utils | Hibernate6系で JSONB カラムをマッピング |
| UUID生成 | **uuid-creator (UUID v7)** | 時系列順ID生成、B-Treeインデックスの断片化抑制 |
| 認証 | Spring Security + JWT (jjwt) | ステートレス、Next.jsと相性◎ |
| 入力検証 | jakarta.validation + Konform | DTO層とドメイン層で役割分離 |
| API 文書化 | springdoc-openapi | OpenAPI 3 自動生成 |
| ロギング | SLF4J + Logback | 標準 |
| テスト | JUnit 5 + Kotest + MockK + Testcontainers | RDBテストは Testcontainers が鉄板 |
| LLM | Google Gemini API (既存流用) | MVP評価とハイライト生成 |

### フロントエンド

| 項目 | 採用 | 理由 |
|---|---|---|
| フレームワーク | Next.js 15 (App Router) | Server Components でサーバー側レンダリング活用 |
| 言語 | TypeScript 5.5+ | ユーザー指定 |
| スタイル | Tailwind CSS v4 + shadcn/ui | 既存のVibrant & Block-basedデザインを移植しやすい |
| フォーム | React Hook Form + Zod | 型安全な入力検証 |
| サーバー状態 | TanStack Query v5 | キャッシュ/楽観的更新 |
| クライアント状態 | Zustand | 軽量、認証状態管理に利用 |
| API クライアント | openapi-typescript + openapi-fetch | OpenAPIから型生成 |
| テスト | Vitest + React Testing Library + Playwright | 現代的な標準構成 |
| パッケージ管理 | **pnpm** | Monorepo(workspaces)対応 |

### インフラ / CI/CD

| 項目 | 採用 | 理由 |
|---|---|---|
| ホスティング | 未定(Fly.io / Railway 候補) | 小規模スタートに適する |
| CI | GitHub Actions | 既存リポジトリで利用中 |
| コンテナ | Docker | バックエンドデプロイ用 |
| ローカル開発 | Docker Compose | PostgreSQL含め `docker compose up` で起動 |

## ディレクトリ構成 (Monorepo)

```
.
├── AGENTS.md                       プロジェクト全体ガイド
├── README.md
├── package.json                    pnpm workspace定義(ルート)
├── pnpm-workspace.yaml
├── docker-compose.yml              PostgreSQL / pgAdmin(ローカル開発用)
├── .github/workflows/
│   ├── deploy-gas.yml              既存GASデプロイ(移行完了まで維持)
│   ├── backend-ci.yml              バックエンドCI(新規)
│   └── frontend-ci.yml             フロントエンドCI(新規)
├── docs/
│   ├── er-diagram.md               [既存] GAS時代のER図(参考)
│   ├── mvp-logic.md                [既存] MVP選出ロジック
│   ├── design-system.md            [既存] デザインシステム
│   ├── planned-features.md         [既存] 実装予定機能
│   └── refactoring/                [新規] リプレース設計ドキュメント
│       ├── 00-overview.md          このファイル
│       ├── 01-ubiquitous-language.md
│       ├── 02-context-map.md
│       ├── 03-aggregates.md
│       ├── 04-rdb-schema.md
│       ├── 05-backend-architecture.md
│       ├── 06-frontend-architecture.md
│       └── 07-migration-plan.md
├── src/                            [既存] GAS版(clasp rootDir、当面維持)
├── backend/                        [新規] Spring Boot + Kotlin
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   └── src/
│       ├── main/kotlin/com/salurec/
│       │   ├── SaluRecApplication.kt
│       │   ├── shared/             共有カーネル(DomainEvent, Id基底など)
│       │   ├── identity/           認証・ロール管理コンテキスト
│       │   ├── event/              イベント管理コンテキスト
│       │   ├── member/             メンバー管理コンテキスト
│       │   ├── match/              試合運営コンテキスト
│       │   ├── mvp/                MVP評価コンテキスト
│       │   └── survey/             アンケートコンテキスト
│       └── main/resources/
│           ├── application.yml
│           └── db/migration/       Flyway SQLマイグレーション
└── frontend/                       [新規] Next.js + TypeScript
    ├── package.json
    ├── next.config.ts
    ├── app/
    │   ├── (public)/login/
    │   ├── (admin)/events/
    │   └── events/[eventId]/
    ├── features/                   コンテキストごとに分割
    │   ├── event/
    │   ├── member/
    │   ├── match/
    │   └── mvp/
    └── shared/
        ├── api/                    OpenAPI生成クライアント
        └── components/ui/          shadcn/ui
```

## 関連ドキュメント

| ドキュメント | 内容 |
|---|---|
| [01-ubiquitous-language.md](01-ubiquitous-language.md) | ユビキタス言語辞書 |
| [02-context-map.md](02-context-map.md) | 境界づけられたコンテキストとマップ |
| [03-aggregates.md](03-aggregates.md) | 集約の設計(エンティティ、値オブジェクト、不変条件) |
| [04-rdb-schema.md](04-rdb-schema.md) | PostgreSQL 向けスキーマ設計 |
| [05-backend-architecture.md](05-backend-architecture.md) | Spring Boot + Kotlin のレイヤー構成 |
| [06-frontend-architecture.md](06-frontend-architecture.md) | Next.js のディレクトリ構成とデータフェッチ戦略 |
| [07-migration-plan.md](07-migration-plan.md) | 段階的マイグレーション計画 |
