# 実行ガイド

**このドキュメントは、チャット履歴が失われても続きから再開できるようにするための実行手順書です。**

## 再開時の最初の手順

1. **`09-progress.md` を開く** → 現在の進捗を確認
2. チェックが入っている最後のタスクの次から再開
3. 各 Phase の詳細はこのドキュメントの該当セクションを参照
4. 設計判断の理由は `10-decisions.md`、Docker 環境は `11-docker-environment.md` を参照

## 前提

- ホスト OS には **Docker 以外の開発ツールを入れない** (ADR-010)
- 全てのコマンドは `docker compose exec` 経由で実行
- 既存 `src/` (GAS 版) は Phase 9 まで触らない
- ドキュメント更新は適宜、同時に `09-progress.md` のチェックを付ける

---

## Phase 0: プロジェクト基盤整備

**ゴール**: Monorepo 化、Docker Compose、空の backend/frontend が `docker compose up` で起動する。

### 0-1. ルート設定ファイル作成

**作成するファイル**:

- `package.json` (workspace root)
- `pnpm-workspace.yaml`
- `.nvmrc` (参考情報のみ、使わない)
- `.gitignore` を更新
- `.dockerignore`
- `.env.example`

#### `package.json` (root)

```json
{
  "name": "salu-rec",
  "private": true,
  "packageManager": "pnpm@9.12.3",
  "engines": {
    "node": ">=24.0.0"
  },
  "scripts": {
    "up": "docker compose up -d",
    "down": "docker compose down",
    "logs": "docker compose logs -f",
    "backend": "docker compose exec backend bash",
    "frontend": "docker compose exec frontend bash",
    "dev": "docker compose exec dev bash",
    "gen:api": "docker compose exec dev bash -c 'cd frontend && pnpm gen:api'",
    "test:backend": "docker compose exec dev bash -c 'cd backend && ./gradlew test'",
    "test:frontend": "docker compose exec dev bash -c 'cd frontend && pnpm test'"
  }
}
```

#### `pnpm-workspace.yaml`

```yaml
packages:
  - "frontend"
```

### 0-2. Docker 関連ファイル作成

`11-docker-environment.md` 記載のファイルをすべて作成:

- `docker-compose.yml`
- `docker/dev.Dockerfile`
- `docker/backend.Dockerfile`
- `docker/frontend.Dockerfile`
- `docker/postgres/init.sql` (空でOK、必要になったら追加)
- `.devcontainer/devcontainer.json`
- `.env.example`

### 0-3. Spring Boot 空プロジェクト (backend/)

#### `backend/settings.gradle.kts`

```kotlin
rootProject.name = "salu-rec-backend"
```

#### `backend/build.gradle.kts`

```kotlin
plugins {
    kotlin("jvm") version "2.3.21"
    kotlin("plugin.spring") version "2.3.21"
    kotlin("plugin.jpa") version "2.3.21"
    id("org.springframework.boot") version "4.0.6"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.salurec"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("org.postgresql:postgresql")
    implementation("io.hypersistence:hypersistence-utils-hibernate-63:3.10.0")

    implementation("com.github.f4b6a3:uuid-creator:6.0.0")

    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.7.0")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("io.kotest:kotest-runner-junit5:5.9.1")
    testImplementation("io.kotest:kotest-assertions-core:5.9.1")
    testImplementation("io.mockk:mockk:1.13.13")
    testImplementation("org.testcontainers:postgresql:1.20.3")
    testImplementation("org.testcontainers:junit-jupiter:1.20.3")
    testImplementation("com.tngtech.archunit:archunit-junit5:1.3.0")
    testImplementation("p6spy:p6spy:3.9.1")
}

allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}

kotlin {
    compilerOptions {
        freeCompilerArgs.add("-Xjsr305=strict")
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

**注意**: バージョン番号(特に `hypersistence-utils`, `springdoc-openapi`)は、Spring Boot 4.0.6 リリース時点で互換のあるものを使用。起動時に不整合が出た場合はリリースノートを参照して調整。

#### `backend/gradle/wrapper/gradle-wrapper.properties`

```
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.14-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
```

Gradle ラッパーは次のコマンドで生成(dev コンテナ内):

```bash
docker compose run --rm dev bash -c "cd backend && gradle wrapper --gradle-version 8.14"
```

ただし素のイメージに Gradle CLI が入っていないため、**最初だけ一時コンテナで Gradle を動かしてラッパーを作る**:

```bash
# ホストで実行 (Dockerのみ使用)
docker run --rm -v "$(pwd)/backend:/workspace" -w /workspace gradle:8.14-jdk21 gradle wrapper
```

#### `backend/src/main/kotlin/com/salurec/SaluRecApplication.kt`

```kotlin
package com.salurec

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class SaluRecApplication

fun main(args: Array<String>) {
    runApplication<SaluRecApplication>(*args)
}
```

#### `backend/src/main/resources/application.yml`

```yaml
spring:
  application:
    name: salu-rec
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/salurec}
    username: ${SPRING_DATASOURCE_USERNAME:salurec}
    password: ${SPRING_DATASOURCE_PASSWORD:salurec}
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate.format_sql: true
      hibernate.jdbc.time_zone: UTC
  flyway:
    enabled: true
    locations: classpath:db/migration

server:
  port: 8080

salurec:
  admin-password: ${ADMIN_PASSWORD:changeme}
  jwt:
    secret: ${JWT_SECRET:local-dev-secret-change-me}
    expiration-minutes: 480
  gemini:
    api-key: ${GEMINI_API_KEY:}
    model: gemini-2.0-flash-exp

logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.orm.jdbc.bind: TRACE
```

### 0-4. Next.js 空プロジェクト (frontend/)

dev コンテナ内で Next.js を初期化:

```bash
docker compose run --rm dev bash -c "pnpm create next-app@latest frontend --typescript --tailwind --eslint --app --turbopack --import-alias '@/*' --no-src-dir --use-pnpm"
```

このコマンドを打つ前にまだ `dev` サービスが存在しないので、`docker-compose.yml` に dev サービスを書いた状態でなら動く。初回は `docker compose build dev` 後に上記を実行。

#### `frontend/package.json` (追加依存)

```bash
docker compose run --rm dev bash -c "cd frontend && pnpm add \
  @tanstack/react-query \
  zod \
  react-hook-form \
  @hookform/resolvers \
  zustand \
  openapi-fetch \
  jose"

docker compose run --rm dev bash -c "cd frontend && pnpm add -D \
  openapi-typescript \
  vitest \
  @vitejs/plugin-react \
  @testing-library/react \
  @testing-library/jest-dom \
  @playwright/test"
```

### 0-5. .gitignore 更新

`.gitignore` の末尾に追加:

```gitignore
# Backend (Kotlin + Gradle)
backend/.gradle/
backend/build/
backend/.kotlin/
backend/out/

# Frontend (Next.js + pnpm)
frontend/node_modules/
frontend/.next/
frontend/out/
frontend/.turbo/

# Monorepo
node_modules/

# Environment
.env
.env.local
.env.*.local
!.env.example

# Docker
docker-compose.override.yml

# IDE
.idea/
*.iml
.vscode/settings.json

# OS
.DS_Store
Thumbs.db
```

### 0-6. README を更新 (旧READMEは退避)

```bash
docker compose exec dev bash -c "mv README.md docs/legacy-readme.md"
```

(または手動移動 → `docs/legacy-readme.md` とする)

新しい `README.md` はシンプルに:

```markdown
# Salu-Rec

フットサルの試合管理・MVP選出を行う Web アプリ。

現在、GAS版 (`src/`) からモダンスタックへリプレース作業中。
詳細は [docs/refactoring/README.md](docs/refactoring/README.md) を参照。

## 開発環境 (Docker 完結)

ホスト OS に必要: **Docker Desktop** (または Docker Engine) のみ。

\`\`\`bash
# 起動
docker compose up -d

# ログ
docker compose logs -f

# 停止
docker compose down
\`\`\`

- Backend: http://localhost:8080
- Frontend: http://localhost:3000
- API Docs: http://localhost:8080/swagger-ui
\`\`\`
```

### 0-7. 動作確認

```bash
# 全コンテナ起動
docker compose up -d

# 起動ログ確認
docker compose logs -f backend
docker compose logs -f frontend

# ヘルスチェック
curl http://localhost:8080/actuator/health   # { "status": "UP" }
curl http://localhost:3000                    # Next.js デフォルトページ
```

### 0-8. GitHub Actions CI の追加 (任意だが推奨)

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - name: Build & Test backend
        run: |
          docker compose build dev
          docker compose run --rm dev bash -c "cd backend && ./gradlew test"

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - name: Install & Test frontend
        run: |
          docker compose build dev
          docker compose run --rm dev bash -c "cd frontend && pnpm install --frozen-lockfile && pnpm test"
```

既存の `deploy-gas.yml` はそのまま残す (Phase 9 まで)。

### Phase 0 完了条件

- [ ] `docker compose up -d` で3サービスが起動する
- [ ] `curl http://localhost:8080/actuator/health` が `UP` を返す
- [ ] `http://localhost:3000` で Next.js のデフォルトページが表示される
- [ ] `docker compose down -v && docker compose up` で再起動しても動く

---

## Phase 1: ウォーキングスケルトン (Event 集約)

**ゴール**: 認証なしで Event 作成 → 一覧が動く。Domain / Application / Infrastructure / Presentation の全層を貫通実装。

### 1-1. Flyway マイグレーション

`backend/src/main/resources/db/migration/V1__init_events.sql`:

```sql
CREATE TABLE events (
    id          UUID        PRIMARY KEY,
    name        TEXT        NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
    event_date  DATE        NOT NULL,
    status      TEXT        NOT NULL CHECK (status IN ('Preparing','InProgress','Finished')),
    join_code   VARCHAR(5)  NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_join_code ON events(join_code);
CREATE INDEX idx_events_status    ON events(status);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 1-2. Shared Kernel

```
com.salurec.shared
├── domain/
│   ├── EntityId.kt
│   ├── DomainEvent.kt
│   ├── DomainEventPublisher.kt
│   ├── DomainException.kt
│   ├── IdGenerator.kt
│   └── Clock.kt
└── infrastructure/
    ├── UuidV7IdGenerator.kt
    ├── SystemClock.kt
    └── SpringDomainEventPublisher.kt
```

**各ファイルの具体的な中身は `05-backend-architecture.md` 参照**。

### 1-3. Event コンテキスト (Phase 1 のコア)

1. `domain/model/Event.kt`, `EventId.kt`, `EventName.kt`, `EventStatus.kt`, `JoinCode.kt`
2. `domain/repository/EventRepository.kt` (I/F)
3. `domain/service/JoinCodeGenerator.kt` (I/F)
4. `domain/event/EventCreated.kt`
5. `application/command/command/CreateEventCommand.kt`
6. `application/command/result/CreateEventResult.kt`
7. `application/command/usecase/CreateEventUseCase.kt`
8. `application/query/dto/EventListItemDto.kt`
9. `application/query/service/EventQueryService.kt` (I/F)
10. `infrastructure/persistence/entity/EventJpaEntity.kt`
11. `infrastructure/persistence/repository/EventJpaRepository.kt`
12. `infrastructure/persistence/repository/EventRepositoryImpl.kt`
13. `infrastructure/persistence/query/EventQueryServiceImpl.kt`
14. `infrastructure/persistence/mapper/EventEntityMapper.kt`
15. `infrastructure/service/JoinCodeGeneratorImpl.kt`
16. `presentation/controller/EventCommandController.kt`
17. `presentation/controller/EventQueryController.kt`
18. `presentation/dto/request/CreateEventRequest.kt`
19. `presentation/dto/response/CreateEventResponse.kt`
20. `presentation/dto/response/EventListResponse.kt`

**Phase 1 時点では `MemberRegistrationPort` の呼び出しは省略**(Phase 4 で追加)。幹事メンバー自動登録は Phase 4 まで保留し、Phase 1 はシンプルに Event だけ作る。

### 1-4. 共通エラーハンドラ

`shared/web/GlobalExceptionHandler.kt`:

```kotlin
package com.salurec.shared.web

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GlobalExceptionHandler {
    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(e: IllegalArgumentException) =
        ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiErrorResponse(code = "BAD_REQUEST", message = e.message ?: ""))

    @ExceptionHandler(IllegalStateException::class)
    fun handleIllegalState(e: IllegalStateException) =
        ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiErrorResponse(code = "ILLEGAL_STATE", message = e.message ?: ""))
}

data class ApiErrorResponse(val code: String, val message: String)
```

### 1-5. ArchUnit テスト

`backend/src/test/kotlin/com/salurec/architecture/LayerDependencyTest.kt`:

(`05-backend-architecture.md` のテスト例をそのまま配置)

### 1-6. Testcontainers セットアップ

`backend/src/test/kotlin/com/salurec/shared/AbstractIntegrationTest.kt`:

```kotlin
package com.salurec.shared

import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers

@SpringBootTest
@Testcontainers
abstract class AbstractIntegrationTest {
    companion object {
        @Container
        @JvmStatic
        val postgres: PostgreSQLContainer<*> = PostgreSQLContainer("postgres:16-alpine")
            .withReuse(true)

        @DynamicPropertySource
        @JvmStatic
        fun props(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl)
            registry.add("spring.datasource.username", postgres::getUsername)
            registry.add("spring.datasource.password", postgres::getPassword)
        }
    }
}
```

### 1-7. OpenAPI スキーマ生成 + フロント型生成

1. 起動中の backend で OpenAPI を取得:
   ```bash
   curl http://localhost:8080/v3/api-docs -o frontend/shared/api/openapi.json
   ```
2. frontend で型生成:
   ```bash
   docker compose exec dev bash -c "cd frontend && pnpm gen:api"
   ```

`frontend/package.json` の scripts に追加:

```json
"scripts": {
  "gen:api": "openapi-typescript http://backend:8080/v3/api-docs -o shared/api/schema.ts"
}
```

**注意**: `backend:8080` は Docker ネットワーク内のホスト名。

### 1-8. フロントエンド: イベント一覧 + 作成

ディレクトリ構成 (Phase 1 の最小):

```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                      → /events へリダイレクト
│   ├── events/
│   │   ├── page.tsx                  Server Component: 一覧
│   │   └── new/
│   │       └── page.tsx              Client Component: 作成フォーム
├── features/
│   └── event/
│       ├── api/
│       │   └── event-api.ts
│       └── components/
│           └── event-list.tsx
└── shared/
    ├── api/
    │   ├── client.ts
    │   └── schema.ts                 (自動生成)
    └── components/ui/
        ├── button.tsx
        └── card.tsx
```

**各ファイル詳細は `06-frontend-architecture.md` 参照**。Phase 1 時点では認証なしの前提で書く(Phase 2 で追加)。

### 1-9. 動作確認

```bash
# イベント作成
curl -X POST http://localhost:8080/api/events \
  -H "Content-Type: application/json" \
  -d '{"name":"テスト大会","date":"2026-06-01","organizerName":"山田太郎"}'

# イベント一覧取得
curl http://localhost:8080/api/events
```

ブラウザで http://localhost:3000/events を開き、作成したイベントが一覧表示されれば完了。

### Phase 1 完了条件

- [ ] Flyway マイグレーション (V1) が起動時に自動適用される
- [ ] Event の作成・一覧・詳細APIが動作する
- [ ] ArchUnit テストがグリーン
- [ ] Testcontainers 結合テストがグリーン
- [ ] OpenAPI スキーマが `/v3/api-docs` で生成される
- [ ] frontend から API 呼び出しで一覧が表示される

---

## Phase 2 以降

Phase 2 (認証) 以降の詳細手順は、**Phase 0/1 完了時に次のフェーズのガイドを追記する**形で進める。
理由:
- Phase 1 の実装で確立したテンプレート(Mapper の書き方、テスト構成など)を前提にする方が具体的に書ける
- 早すぎる詳細化は陳腐化する

**次のフェーズを追加する際は、このドキュメントに Phase N のセクションを追加し、`09-progress.md` にチェックボックスを追加すること。**

Phase 2 〜 9 の概要は `07-migration-plan.md` を参照。

---

## 開発フロー (全Phase 共通)

### 新しいコンテキスト/機能を追加する時

1. `01-ubiquitous-language.md` を確認。未定義の用語は追加
2. `03-aggregates.md` で集約設計を確認・追記
3. `04-rdb-schema.md` にテーブル定義を追加
4. Flyway マイグレーション追加 (`V2__xxx.sql`, `V3__xxx.sql`...)
5. Domain → Application → Infrastructure → Presentation の順に実装
6. ArchUnit テストを更新
7. OpenAPI から型生成し直す: `pnpm gen:api`
8. frontend 側を実装
9. `09-progress.md` のチェックボックスを更新

### PR 前のチェック

```bash
docker compose exec dev bash -c "cd backend && ./gradlew test"
docker compose exec dev bash -c "cd frontend && pnpm test && pnpm lint && pnpm build"
```

### マイグレーションの検証

```bash
# 新規マイグレーション追加後、クリーン環境でテスト
docker compose down -v
docker compose up -d db
docker compose exec backend ./gradlew flywayInfo
```

---

## よくある作業

### 新しいパッケージを追加する (backend)

1. `backend/build.gradle.kts` の `dependencies` に追記
2. `docker compose exec dev bash -c "cd backend && ./gradlew --refresh-dependencies"`

### 新しいパッケージを追加する (frontend)

```bash
docker compose exec dev bash -c "cd frontend && pnpm add <package>"
```

### DB を完全リセット

```bash
docker compose down -v
docker compose up -d
```

### 開発中に Spring Boot を再起動

`bootRun --continuous` で自動再起動される。手動でやりたい場合:

```bash
docker compose restart backend
```

### API ドキュメントを見る

http://localhost:8080/swagger-ui

### ログを絞って見る

```bash
docker compose logs --tail=100 backend | grep ERROR
```

---

## Phase 進行時の一般的なルール

1. **各 Phase 開始前に `09-progress.md` で現在地を確認**
2. **Phase の完了条件を全て満たしてから次 Phase へ**
3. **設計判断が発生したら `10-decisions.md` に ADR を追加**
4. **実装で学んだテンプレートは `08-execution-guide.md` に追記**
5. **新語が出たら必ず `01-ubiquitous-language.md` に記録**
