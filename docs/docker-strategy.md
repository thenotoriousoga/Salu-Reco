# Docker 戦略

---

## 設計原則

### 1. ホスト OS に開発ツールを入れない

ホストに必要なのは **Docker (Docker Desktop or Docker Engine)** と **Git** のみ。
Java / Kotlin / Node.js / pnpm / PostgreSQL クライアント等はすべてコンテナ内で動作する。

- Windows / macOS / Linux 間の環境差異を排除
- オンボーディングを `docker compose up -d` の一発で完了させる
- 「自分の環境では動く」問題を根絶

### 2. マルチステージビルド

各サービスの Dockerfile は `dev` / `builder` / `runtime` の 3 ステージ構成とする。

| ステージ | 用途 |
|---|---|
| `dev` | 開発サーバ用 (ホットリロード、デバッグツール同梱) |
| `builder` | 本番アーティファクト生成 (CI で使用) |
| `runtime` | 最小限の本番実行イメージ (非 root、ヘルスチェック付き) |

`docker-compose.yml` では `target: dev` で開発用ステージを選択する。

### 3. 常駐コンテナ + exec パターン (バックエンド)

バックエンドコンテナは `tail -f /dev/null` で常駐させ、`docker compose exec` でコマンドを実行する。

- Gradle デーモンが生き続け、2回目以降のビルドが高速化
- Incremental compilation が効く
- 開発サーバ (`bootRun`) とテスト (`test`) を同じコンテナで切り替えられる

### 4. ボリューム戦略

| ボリューム | 種別 | 目的 |
|---|---|---|
| `db-data` | Named volume | PostgreSQL データ永続化 |
| `gradle-cache` | Named volume | Gradle 依存キャッシュ再利用 |
| `frontend-node-modules` | Named volume | node_modules 高速化 (ホストバインドは Windows/Mac で遅い) |
| `pnpm-store` | Named volume | pnpm コンテンツアドレスストア永続化 |
| `./backend:/app` | Bind mount | ソースコードのホットリロード |
| `./frontend:/app` | Bind mount | ソースコードのホットリロード |
| `./api:/api` | Bind mount | OpenAPI スキーマ共有 |

### 5. セキュリティ

| 環境 | ユーザー | 理由 |
|---|---|---|
| 開発 (`dev`) | root | uid/gid の OS 依存を回避 |
| 本番 (`runtime`) | 非 root (`appuser`) | 攻撃面の最小化 |

シークレットは `.env` ファイルで管理し、`.gitignore` 対象とする。

---

## コンテナ構成

```
┌─────────────────────────────────────────────────────────┐
│  docker compose up -d                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ backend ─────────────────────────────────────────┐  │
│  │  Eclipse Temurin 21 (JDK)                         │  │
│  │  Spring Boot 4 + Kotlin                           │  │
│  │  常駐 (tail -f /dev/null)                         │  │
│  │  Port: 8080                                       │  │
│  └───────────────────────────────────────────────────┘  │
│           │ depends_on (healthy)                         │
│  ┌─ frontend ────────────────────────────────────────┐  │
│  │  Node.js 24 + pnpm                                │  │
│  │  Next.js 16 (App Router)                          │  │
│  │  pnpm install && pnpm dev                         │  │
│  │  Port: 3000                                       │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ db ──────────────────────────────────────────────┐  │
│  │  PostgreSQL 16 Alpine                             │  │
│  │  Port: 5432                                       │  │
│  │  Healthcheck: pg_isready                          │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

3 サービス構成。各コンテナに exec すれば必要なツール操作はすべて行える。

| サービス | ベースイメージ | 役割 | ポート |
|---|---|---|---|
| `backend` | `eclipse-temurin:21-jdk` | Spring Boot 開発 / テスト | 8080 |
| `frontend` | `node:24-bookworm-slim` | Next.js 開発サーバ | 3000 |
| `db` | `postgres:16-alpine` | データベース | 5432 |

### 依存関係

```
backend  → db (service_healthy)
frontend → (独立)
```

frontend は backend に依存しない。API が未起動でも UI 開発は進められる。

### ネットワーク

- 開発: デフォルト bridge ネットワーク。サービス名で相互通信可能。
- 本番: `frontend-net` (frontend ↔ backend) と `backend-net` (internal, backend ↔ db) に分離。

---

## Dockerfile 設計

### backend.Dockerfile

```dockerfile
# syntax=docker/dockerfile:1.7

# ---- dev ----
FROM eclipse-temurin:21-jdk AS dev

# Testcontainers 用 Docker CLI (Docker-out-of-Docker)
RUN apt-get update \
 && apt-get install -y --no-install-recommends docker.io \
 && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /root \
 && echo "testcontainers.reuse.enable=true" > /root/.testcontainers.properties

WORKDIR /app
EXPOSE 8080


# ---- builder ----
FROM eclipse-temurin:21-jdk AS builder

WORKDIR /build
COPY gradle ./gradle
COPY gradlew settings.gradle.kts build.gradle.kts ./
RUN ./gradlew --no-daemon dependencies || true

COPY src ./src
RUN ./gradlew --no-daemon clean bootJar


# ---- runtime ----
FROM eclipse-temurin:21-jre AS runtime

RUN groupadd -r appuser && useradd -r -g appuser appuser
WORKDIR /app
COPY --from=builder --chown=appuser:appuser /build/build/libs/*.jar app.jar

USER appuser
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

**ポイント:**
- `dev`: Docker CLI 同梱で Testcontainers をサポート
- `builder`: 依存解決レイヤーを先にコピーしてキャッシュ効率を最大化
- `runtime`: JRE のみ、非 root、ヘルスチェック付き

### frontend.Dockerfile

```dockerfile
# syntax=docker/dockerfile:1.7

# ---- dev ----
FROM node:24-bookworm-slim AS dev

RUN corepack enable \
 && corepack prepare pnpm@latest --activate

ENV PNPM_STORE_DIR=/pnpm-store
RUN mkdir -p /pnpm-store

WORKDIR /app
EXPOSE 3000


# ---- builder ----
FROM node:24-bookworm-slim AS builder

RUN corepack enable \
 && corepack prepare pnpm@latest --activate

WORKDIR /build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build


# ---- runtime ----
FROM node:24-bookworm-slim AS runtime

RUN groupadd -r appuser && useradd -r -g appuser appuser
WORKDIR /app
COPY --from=builder --chown=appuser:appuser /build/.next/standalone ./
COPY --from=builder --chown=appuser:appuser /build/.next/static ./.next/static
COPY --from=builder --chown=appuser:appuser /build/public ./public

USER appuser
ENV NODE_ENV=production \
    PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
```

**ポイント:**
- `dev`: pnpm ストアを固定パスに配置し Named volume で永続化
- `builder`: `--frozen-lockfile` で再現性保証
- `runtime`: Next.js standalone 出力で最小化

---

## 環境変数

### `.env.example`

```
ADMIN_PASSWORD=changeme
JWT_SECRET=local-dev-secret-change-me
GEMINI_API_KEY=
```

### docker-compose.yml で使用する変数

| 変数 | 対象 | 説明 |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | backend | Spring プロファイル (`dev`) |
| `SPRING_DATASOURCE_URL` | backend | DB 接続先 |
| `ADMIN_PASSWORD` | backend | 管理者パスワード |
| `JWT_SECRET` | backend | JWT 署名キー |
| `GEMINI_API_KEY` | backend | Gemini API キー |
| `NEXT_PUBLIC_API_BASE_URL` | frontend | ブラウザからの API URL |
| `BACKEND_INTERNAL_URL` | frontend | SSR 時のコンテナ間 API URL |
| `WATCHPACK_POLLING` | frontend | ファイル監視ポーリング有効化 |
| `PNPM_STORE_DIR` | frontend | pnpm ストアパス |

---

## 日常運用コマンド

### 起動・停止

```bash
docker compose up -d          # 全サービス起動
docker compose logs -f        # ログ追跡
docker compose down           # 停止
docker compose down -v        # 停止 + ボリューム削除 (DB リセット)
```

### バックエンド

```bash
docker compose exec backend ./gradlew bootRun          # 開発サーバ起動
docker compose exec backend ./gradlew test             # テスト実行
docker compose exec backend ./gradlew test --tests "com.salurec.event.*"  # 特定テスト
docker compose exec backend ./gradlew bootJar          # JAR 生成
docker compose exec backend ./gradlew flywayMigrate    # マイグレーション
```

### フロントエンド

```bash
docker compose exec frontend pnpm install    # パッケージインストール
docker compose exec frontend pnpm test       # テスト
docker compose exec frontend pnpm lint       # リント
docker compose exec frontend pnpm gen:api    # OpenAPI 型生成
docker compose exec frontend pnpm build      # ビルド確認
```

### データベース

```bash
docker compose exec db psql -U salurec -d salurec
```

---

## 本番デプロイ

### イメージビルド

```bash
docker build -f docker/backend.Dockerfile --target runtime -t salurec-backend:latest ./backend
docker build -f docker/frontend.Dockerfile --target runtime -t salurec-frontend:latest ./frontend
```

### イメージサイズ目標

| イメージ | 目標 | 内訳 |
|---|---|---|
| `backend:runtime` | < 300MB | JRE 21 (~200MB) + JAR (~50MB) |
| `frontend:runtime` | < 200MB | Node.js slim (~180MB) + standalone (~20MB) |

### ホスティング候補

| 候補 | 特徴 |
|---|---|
| **Fly.io** (第一候補) | コンテナネイティブ、東京リージョン、無料枠あり |
| Railway | Git push デプロイ、Dockerfile 自動検出 |
| Render | 無料枠あり、自動スリープ |

### 本番 DB

Managed PostgreSQL を使用する (Supabase / Neon / Fly Postgres)。
コンテナ内 PostgreSQL は開発環境専用。

### 本番 compose (docker-compose.prod.yml)

方針:
- `runtime` ステージを使用
- リソース制限 (`deploy.resources.limits`) を設定
- ヘルスチェック + 自動再起動ポリシー
- ネットワーク分離 (internal backend network)
- シークレットはホスティング先の機能で注入

---

## CI/CD 統合

### GitHub Actions

```yaml
jobs:
  backend:
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v5
        with:
          context: ./backend
          file: docker/backend.Dockerfile
          target: builder
          cache-from: type=gha
          cache-to: type=gha,mode=max
      # テスト実行は builder ステージ内で完結

  frontend:
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v5
        with:
          context: ./frontend
          file: docker/frontend.Dockerfile
          target: builder
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

GitHub Actions のレイヤーキャッシュ (`type=gha`) でビルド時間を短縮する。

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| ポート衝突 (5432/8080/3000) | ホストで別サービスが使用中 | `docker-compose.override.yml` でポート変更 |
| Next.js ホットリロードが効かない | Windows/Mac のファイル監視 | `WATCHPACK_POLLING: "true"` 確認、コンテナ再起動 |
| Gradle ビルドが毎回遅い | キャッシュボリューム破損 | `docker volume rm salu-rec_gradle-cache` |
| Testcontainers が動かない | Docker ソケット未共有 | volumes に `/var/run/docker.sock` を追加 |
| Windows でファイルロック | Docker Desktop 特有 | `docker compose restart` |
| Linux でファイルが root 所有 | コンテナ内 root で作成 | `sudo chown -R $(id -u):$(id -g) .` |

### ポート衝突の解消例

```yaml
# docker-compose.override.yml (gitignore 対象)
services:
  db:
    ports:
      - "15432:5432"
  backend:
    ports:
      - "18080:8080"
```

---

## ファイル構成

```
.
├── docker/
│   ├── backend.Dockerfile        Spring Boot (dev / builder / runtime)
│   ├── frontend.Dockerfile       Next.js (dev / builder / runtime)
│   └── postgres/
│       └── init.sql              初期 SQL (拡張機能有効化等)
├── docker-compose.yml            開発用
├── docker-compose.prod.yml       本番用
├── .dockerignore                 ビルドコンテキスト除外
├── .env                          環境変数 (gitignore 対象)
└── .env.example                  環境変数テンプレート
```
