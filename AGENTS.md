# AGENTS.md — Salu-Rec

フットサルの試合管理・MVP選出を行うWebアプリ。GAS版から Next.js + Spring Boot (Kotlin) + PostgreSQL へ全面リプレース中。

## 現在のステータス

- **リプレース進捗**: [docs/refactoring/09-progress.md](docs/refactoring/09-progress.md) を確認
- 新実装は `backend/` と `frontend/` にあり、Docker Compose で動作する
- 既存 GAS 版 (`src/`) は Phase 9（最終フェーズ）で廃止予定

## ドキュメントルーティング

変更対象に応じて、以下のドキュメントを参照する。

| 変更対象 | 参照先 |
|---|---|
| バックエンド (`backend/`) | [docs/backend/AGENTS.md](docs/backend/AGENTS.md) |
| フロントエンド (`frontend/`) | [docs/frontend/AGENTS.md](docs/frontend/AGENTS.md) |
| API 仕様 (`api/openapi.yaml`) | [api/openapi.yaml](api/openapi.yaml) |
| Docker 環境 | [docs/docker-strategy.md](docs/docker-strategy.md) |
| GAS 版 (`src/`) | [docs/legacy/gas-spec.md](docs/legacy/gas-spec.md) |

### 設計ドキュメント

| 対象 | 場所 |
|---|---|
| バックエンド設計（アーキテクチャ・DDD・パッケージ構成） | [docs/backend/design/](docs/backend/design/README.md) |
| フロントエンド設計（コンポーネント・ルーティング・状態管理） | [docs/frontend/](docs/frontend/README.md) |
| ER図（テーブル概要） | [docs/er-diagram.md](docs/er-diagram.md) |
| Git ルール | [docs/git-rules.md](docs/git-rules.md) |

## プロジェクト全体に適用されるルール

### 1. 実行環境

ビルド・テスト・依存管理は全て Docker コンテナ内で実行する。ホスト OS で直接実行してよいのは `git` と `docker compose` のみ。

```bash
# バックエンド
docker compose exec backend ./gradlew test

# フロントエンド
docker compose exec frontend pnpm test
```

### 2. Single Source of Truth (SSoT)

- 同じ情報を2箇所以上に書かない。他のドキュメントから参照する場合はリンクを貼る
- API 仕様の正は `api/openapi.yaml`
- DB スキーマの正は Flyway マイグレーション (`backend/src/main/resources/db/migration/`)
- 技術スタックのバージョンの正は `build.gradle.kts` と `package.json`

### 3. Git 運用

- Conventional Commits 形式を使用
- master への直接 push 禁止。必ず PR 経由
- 詳細は [docs/git-rules.md](docs/git-rules.md)

### 4. AI エージェントの作業フロー

1. `docs/refactoring/09-progress.md` で次のタスクを確認
2. 変更対象に応じた AGENTS.md（上記ルーティング）を読む
3. 設計ドキュメントで仕様を確認してから実装に入る

## 技術スタック（新実装）

| レイヤー | 技術 |
|---|---|
| バックエンド | Spring Boot 4 + Kotlin, JDK 21 |
| フロントエンド | Next.js 16 (App Router) + TypeScript |
| データベース | PostgreSQL 16 |
| API 仕様 | OpenAPI 3.1 (コード自動生成) |
| インフラ | Docker Compose (開発), Fly.io (本番候補) |
| CI/CD | GitHub Actions |

## ディレクトリ構成（概要）

```
.
├── AGENTS.md                  ← このファイル（エントリーポイント）
├── api/
│   └── openapi.yaml           API 仕様（SSoT）
├── backend/                   Spring Boot + Kotlin
├── frontend/                  Next.js + TypeScript
├── docker/                    Dockerfile 群
├── docker-compose.yml         開発環境
├── docs/
│   ├── backend/               バックエンド設計・AGENTS
│   ├── frontend/              フロントエンド設計・AGENTS
│   ├── legacy/                GAS版仕様（リプレース完了後に削除）
│   ├── refactoring/           リプレース進捗・実行手順
│   ├── er-diagram.md          ER図
│   ├── docker-strategy.md     Docker戦略
│   └── git-rules.md           Gitルール
├── src/                       GAS版（Phase 9 で廃止）
└── .kiro/
    ├── steering/              AI向けステアリングルール
    ├── agents/                カスタムサブエージェント定義
    └── skills/                AIスキル定義
```
