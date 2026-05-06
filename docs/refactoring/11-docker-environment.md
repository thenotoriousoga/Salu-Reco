# Docker 完結開発環境

ホスト OS には **Docker 以外の開発ツールを一切インストールしない**。
Java / Kotlin / Node / pnpm / PostgreSQL クライアント等はすべてコンテナ内で動作する。

ADR-010 参照。

---

## 前提ホスト環境

| OS | 必要ソフトウェア |
|---|---|
| Windows 10/11 | Docker Desktop |
| macOS (Intel/Apple Silicon) | Docker Desktop |
| Linux | Docker Engine + Docker Compose plugin |

加えて **Git** はホスト側に入れて OK(多くの IDE が統合している)。

### 動作確認

ホストのターミナル(PowerShell / cmd / zsh / bash など、どれでも可)で:

```
docker --version
docker compose version
```

どちらもバージョン表示されれば OK。

---

## コマンド実行ポリシー (OS 非依存)

**ユーザーがホスト OS から直接叩くコマンドは `docker` と `docker compose` のみ**。
それ以外(`./gradlew`, `pnpm`, `mv`, `cat` など)は全部 `docker compose run` または `docker compose exec` 経由で叩く。

これにより、Windows の PowerShell / cmd、macOS の zsh、Linux の bash、Git Bash のどこでも同じコマンドが動く。

### NG 例 (OS 依存)

```bash
# NG: $(pwd) は Windows cmd/PowerShell で動かない
docker run --rm -v "$(pwd)/backend:/workspace" gradle:8.14 gradle wrapper

# NG: mv は Windows cmd に存在しない
mv README.md docs/legacy-readme.md
```

### OK 例 (OS 非依存)

```
docker compose run --rm init
docker compose exec tools bash -c "mv README.md docs/legacy-readme.md"
```

---

## コンテナ構成

### 4 つのサービス

```
┌─ backend  …  Spring Boot 4.0.6 開発サーバ (8080)
├─ frontend …  Next.js 15 開発サーバ (3000)
├─ db       …  PostgreSQL 16 (5432)
└─ tools    …  各種ツールを叩く用の汎用ワークスペース
               JDK21 + Node24 + pnpm + gradle + psql
               常駐せず、必要な時だけ起動する
```

`tools` サービスを用意する理由:

- Gradle ラッパー生成・依存追加・ファイル操作などをホスト OS に依存せず行える
- `backend` / `frontend` の開発サーバを止めなくてもツール操作ができる
- 最初のプロジェクト初期化(`pnpm create next-app` 等)にも使える

---

## ファイル構成

```
.
├── docker/
│   ├── tools.Dockerfile            tools サービス用イメージ (JDK + Node + Gradle + psql)
│   ├── backend.Dockerfile          Spring Boot 用 (dev / runtime マルチステージ)
│   ├── frontend.Dockerfile         Next.js 用 (dev / runtime マルチステージ)
│   └── postgres/
│       └── init.sql                初期 SQL(空でも OK)
├── docker-compose.yml              開発用 compose
├── docker-compose.prod.yml         本番用 compose (Phase 8 で作成)
├── .env.example                    環境変数テンプレ
└── .dockerignore
```

---

## `docker-compose.yml` 完全版

```yaml
name: salu-rec

services:
  # ---- Spring Boot ----
  backend:
    build:
      context: .
      dockerfile: docker/backend.Dockerfile
      target: dev
    volumes:
      - ./backend:/workspace/backend
      - gradle-cache:/root/.gradle
    working_dir: /workspace/backend
    command: ./gradlew bootRun --continuous --no-daemon
    ports:
      - "8080:8080"
    environment:
      SPRING_PROFILES_ACTIVE: dev
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/salurec
      SPRING_DATASOURCE_USERNAME: salurec
      SPRING_DATASOURCE_PASSWORD: salurec
      ADMIN_PASSWORD: ${ADMIN_PASSWORD:-changeme}
      GEMINI_API_KEY: ${GEMINI_API_KEY:-}
      JWT_SECRET: ${JWT_SECRET:-local-dev-secret-change-me}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - salurec-net

  # ---- Next.js ----
  frontend:
    build:
      context: .
      dockerfile: docker/frontend.Dockerfile
      target: dev
    volumes:
      - ./frontend:/workspace/frontend
      - frontend-node-modules:/workspace/frontend/node_modules
    working_dir: /workspace/frontend
    command: sh -c "pnpm install --frozen-lockfile && pnpm dev"
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_BASE_URL: http://localhost:8080
      API_INTERNAL_URL: http://backend:8080
      # Windows / Mac のファイル監視対策
      WATCHPACK_POLLING: "true"
      CHOKIDAR_USEPOLLING: "true"
    depends_on:
      - backend
    networks:
      - salurec-net

  # ---- PostgreSQL ----
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: salurec
      POSTGRES_PASSWORD: salurec
      POSTGRES_DB: salurec
    ports:
      - "5432:5432"
    volumes:
      - db-data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U salurec"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - salurec-net

  # ---- 汎用ツール (必要な時だけ起動) ----
  tools:
    build:
      context: .
      dockerfile: docker/tools.Dockerfile
    volumes:
      - .:/workspace
      - gradle-cache:/root/.gradle
      - frontend-node-modules:/workspace/frontend/node_modules
    working_dir: /workspace
    environment:
      PGHOST: db
      PGUSER: salurec
      PGPASSWORD: salurec
      PGDATABASE: salurec
    networks:
      - salurec-net
    # デフォルトは常駐しない
    profiles: ["tools"]
    command: ["bash"]

volumes:
  db-data:
  gradle-cache:
  frontend-node-modules:

networks:
  salurec-net:
```

### ポイント

- **`tools` サービスは `profiles: ["tools"]`** にしているので `docker compose up` では起動しない。必要なときだけ `docker compose run --rm tools <command>` で呼ぶ
- **名前付きボリューム** `gradle-cache`, `frontend-node-modules` で依存ダウンロードを再利用
- **`node_modules` は名前付きボリューム**(ホストにバインドすると Windows/Mac で極端に遅い)
- **`WATCHPACK_POLLING`** で Windows/Mac のファイル監視を有効化(Next.js のホットリロードが反応しない問題の回避)
- **root ユーザーで動作**: uid/gid の OS 依存を避けるため、コンテナ内は root で統一。ホスト側のファイル所有者問題は Docker Desktop が吸収する

---

## `docker/tools.Dockerfile`

Gradle ラッパー生成・pnpm セットアップ・psql など、あらゆるツールを叩くための汎用イメージ。

```dockerfile
# syntax=docker/dockerfile:1.7
FROM eclipse-temurin:21-jdk

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl ca-certificates gnupg git unzip zip procps \
        postgresql-client locales \
    && locale-gen C.UTF-8 \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && corepack enable \
    && corepack prepare pnpm@latest --activate \
    && curl -L https://services.gradle.org/distributions/gradle-8.14-bin.zip -o /tmp/gradle.zip \
    && unzip -q /tmp/gradle.zip -d /opt \
    && rm /tmp/gradle.zip \
    && ln -s /opt/gradle-8.14/bin/gradle /usr/local/bin/gradle \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

CMD ["bash"]
```

---

## `docker/backend.Dockerfile`

開発と本番でマルチステージ。

```dockerfile
# syntax=docker/dockerfile:1.7

# ---- Stage: 開発用 ----
FROM eclipse-temurin:21-jdk AS dev

RUN apt-get update && apt-get install -y --no-install-recommends \
        git curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace/backend

EXPOSE 8080


# ---- Stage: 本番ビルド ----
FROM eclipse-temurin:21-jdk AS builder

WORKDIR /build
COPY backend/gradle ./gradle
COPY backend/gradlew backend/settings.gradle.kts backend/build.gradle.kts ./
RUN ./gradlew --no-daemon dependencies || true

COPY backend/src ./src
RUN ./gradlew --no-daemon clean bootJar


# ---- Stage: 本番実行 ----
FROM eclipse-temurin:21-jre AS runtime

WORKDIR /app
COPY --from=builder /build/build/libs/*.jar app.jar

ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

---

## `docker/frontend.Dockerfile`

```dockerfile
# syntax=docker/dockerfile:1.7

# ---- Stage: 開発用 ----
FROM node:24-bookworm-slim AS dev

RUN corepack enable \
    && corepack prepare pnpm@latest --activate

WORKDIR /workspace/frontend
EXPOSE 3000


# ---- Stage: 本番ビルド ----
FROM node:24-bookworm-slim AS builder

RUN corepack enable \
    && corepack prepare pnpm@latest --activate

WORKDIR /build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile

COPY frontend ./frontend
RUN pnpm --filter frontend build


# ---- Stage: 本番実行 (Next.js standalone) ----
FROM node:24-bookworm-slim AS runtime

WORKDIR /app
COPY --from=builder /build/frontend/.next/standalone ./
COPY --from=builder /build/frontend/.next/static ./.next/static
COPY --from=builder /build/frontend/public ./public

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000
CMD ["node", "server.js"]
```

---

## `.env.example`

```
# このファイルを .env としてコピーして値を埋めてください
# .env は .gitignore 対象
ADMIN_PASSWORD=changeme
GEMINI_API_KEY=
JWT_SECRET=local-dev-secret-change-me
```

---

## `.dockerignore`

```
.git
.gitignore
**/.gradle
**/build
**/node_modules
**/.next
**/dist
**/.env
**/.env.local
.vscode
.idea
```

---

## 日常運用コマンド (OS 非依存)

以下、ホスト OS の種類を問わず同じコマンドで動く。

### 起動・停止

```
docker compose up -d
docker compose logs -f
docker compose down
docker compose down -v
```

`down -v` はボリュームごと削除(DB もリセット)。

### コンテナ内に入る

```
docker compose exec backend bash
docker compose exec frontend sh
docker compose exec db psql -U salurec -d salurec
```

### ツールで操作 (tools サービス)

常時起動していないので `run --rm` を使う。

```
docker compose run --rm tools bash
```

一発で単一コマンドを実行する場合:

```
docker compose run --rm tools bash -c "cd backend && ./gradlew test"
docker compose run --rm tools bash -c "cd frontend && pnpm test"
docker compose run --rm tools bash -c "cd frontend && pnpm gen:api"
```

### Gradle / pnpm の直接実行 (別の選択肢)

`backend` / `frontend` コンテナが起動中なら、そのまま exec してもよい:

```
docker compose exec backend ./gradlew test
docker compose exec frontend pnpm test
```

開発サーバを止めずに片手間でコマンドを叩けるので便利。

### ファイル操作

ホスト側で直接やると OS 依存が発生するので、`tools` コンテナ経由で行う。

```
docker compose run --rm tools bash -c "mv README.md docs/legacy-readme.md"
docker compose run --rm tools bash -c "cp .env.example .env"
```

### DB に接続

```
docker compose exec db psql -U salurec -d salurec
```

---

## 初回セットアップ手順 (OS 非依存)

Phase 0 で実行するコマンドの全体像。詳細は `08-execution-guide.md`。

1. ホストに Docker Desktop (または Docker Engine) をインストール
2. リポジトリをクローン
3. `.env.example` をコピーして `.env` 作成(IDE のファイル操作 or `docker compose run --rm tools bash -c "cp .env.example .env"`)
4. `docker compose build`
5. Phase 0 の初期化(Gradle wrapper 作成、frontend/ 初期化)を `tools` 経由で実行
6. `docker compose up -d`
7. ブラウザで http://localhost:3000 と http://localhost:8080/actuator/health を確認

---

## 本番デプロイ方針

- ホスティング先が決まり次第詳細化(Phase 8)
- 共通方針:
  - 本番は `docker-compose.prod.yml` または Kubernetes / Fly.io / Railway 等のコンテナプラットフォーム
  - `docker/backend.Dockerfile` の `runtime` ステージ、`docker/frontend.Dockerfile` の `runtime` ステージをそのまま使う
  - Flyway は Spring Boot 起動時に自動適用
  - DB は managed service 推奨(Supabase / Neon / RDS など)
  - 秘密情報はホスティング先のシークレット機能で注入

---

## トラブルシューティング

### ポート衝突 (5432 / 8080 / 3000)

すでにホストで別のサービスを動かしていると起動失敗する。
対応:

- 衝突している側を止める
- または `docker-compose.override.yml` を作成して別ポートにマップ (Phase 8 の本番向け設定と区別するため開発中は `override` を使う)

```yaml
services:
  db:
    ports:
      - "15432:5432"
```

### Next.js のホットリロードが反応しない (Windows / Mac)

`docker-compose.yml` で `WATCHPACK_POLLING: "true"` を設定済み。
それでも反応しない場合、ホスト側のエディタで保存が遅延していないか確認。

### Gradle のビルドが毎回遅い

`gradle-cache` ボリュームが効いていない可能性。

```
docker volume ls
docker compose down -v
docker compose up -d
```

### 「ファイルがロックされている」(Windows)

Docker Desktop + Windows 特有の現象。
コンテナを止めて再起動すると解消することが多い。

```
docker compose restart
```

### コンテナ内のファイルがホストから見て root 所有 (Linux)

Linux ネイティブ Docker (Docker Desktop ではない) で発生する可能性がある。
Windows / Mac の Docker Desktop では発生しない。

発生した場合は以下のいずれかで対応:

- ホスト側でファイル所有者を自分に戻す(コンテナ外で一度だけ実行)
- Docker Desktop for Linux を使う(所有者を自動調整)

これは Linux ネイティブ Docker に限った話で、Docker Desktop 利用者には影響しない。
