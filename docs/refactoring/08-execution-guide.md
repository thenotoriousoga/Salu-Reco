# 実行ガイド

**このドキュメントは、チャット履歴が失われても続きから再開できるようにするための実行手順書です。**

## 再開時の最初の手順

1. **`09-progress.md` を開く** → 現在の進捗を確認
2. チェックが入っている最後のタスクの次から再開
3. 各 Phase の詳細はこのドキュメントの該当セクションを参照
4. 設計判断の理由は `docs/backend/design/` および `docs/frontend/` を参照。Docker 環境は `docs/docker-strategy.md` を参照

## 前提・原則

- ホスト OS には **Docker 以外の開発ツールを入れない**
- **ユーザーがホストから直接叩くコマンドは `docker` と `docker compose` のみ**
- `./gradlew`, `pnpm`, `mv`, `cp`, `cat` などは **必ず** `docker compose run --rm tools ...` または `docker compose exec <service> ...` 経由
- `$(pwd)` などシェル変数展開は使わない(Windows cmd / PowerShell で動かない)
- ファイル作成・編集は IDE で行う
- 既存 `src/` (GAS 版) は Phase 9 まで触らない
- 実装のたびに `09-progress.md` のチェックを更新する

---

## Phase 0: プロジェクト基盤整備

**ゴール**: `docker compose up -d` で backend / frontend / db が起動する状態を作る。

### 0-1. ルート設定ファイル作成 (IDE で作成)

以下のファイルを作成する。

#### `package.json` (リポジトリルート)

```json
{
  "name": "salu-rec",
  "private": true,
  "packageManager": "pnpm@9.12.3",
  "engines": {
    "node": ">=24.0.0"
  }
}
```

#### `pnpm-workspace.yaml` (リポジトリルート)

```yaml
packages:
  - "frontend"
```

#### `.env.example` (リポジトリルート)

```
ADMIN_PASSWORD=changeme
GEMINI_API_KEY=
JWT_SECRET=local-dev-secret-change-me
```

#### `.dockerignore` (リポジトリルート)

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

#### `.gitignore` 更新

既存の `.gitignore` に以下を追記:

```gitignore
# ---- Refactoring (new stack) ----

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
pnpm-lock.yaml.backup

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

### 0-2. Docker 関連ファイル作成 (IDE で作成)

`docs/docker-strategy.md` のテンプレをそのまま配置:

- `docker/tools.Dockerfile`
- `docker/backend.Dockerfile`
- `docker/frontend.Dockerfile`
- `docker/postgres/init.sql` (空ファイル)
- `docker-compose.yml`

### 0-3. `.env` ファイルを作成

IDE で `.env.example` を `.env` としてコピー、または:

```
docker compose run --rm tools bash -c "cp .env.example .env"
```

### 0-4. tools イメージをビルドする

```
docker compose build tools
```

tools サービスには JDK 21, Node 24, pnpm, Gradle 8.14, psql が入っている。
以降のコマンド実行はこのコンテナを使う。

### 0-5. backend プロジェクトの骨組み (tools コンテナで生成)

#### Gradle Wrapper 生成

```
docker compose run --rm tools bash -c "mkdir -p backend && cd backend && gradle wrapper --gradle-version 8.14"
```

#### `backend/settings.gradle.kts` (IDE で作成)

```kotlin
rootProject.name = "salu-rec-backend"
```

#### `backend/build.gradle.kts` (IDE で作成)

```kotlin
plugins {
    kotlin("jvm") version "2.3.21"
    kotlin("plugin.spring") version "2.3.21"
    kotlin("plugin.jpa") version "2.3.21"
    id("org.springframework.boot") version "4.0.6"
    id("io.spring.dependency-management") version "1.1.7"
    id("org.openapi.generator") version "7.12.0"
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
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.postgresql:postgresql")
    // Note: hypersistence-utils (JSONB マッピング用) は Phase 5 で Hibernate 7 対応版を追加する

    implementation("com.github.f4b6a3:uuid-creator:6.0.0")

    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

    implementation("jakarta.validation:jakarta.validation-api")
    implementation("io.swagger.core.v3:swagger-annotations:2.2.28")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.boot:spring-boot-starter-security-test")
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

**注意**: Spring Boot 4.0 + Kotlin 2.3 リリース直後のため、`hypersistence-utils`, `kotest` など一部のライブラリのバージョン互換に調整が必要な可能性がある。ビルド失敗したらそのライブラリの最新互換版を調べて更新する。`springdoc-openapi` は不要（`api/openapi.yaml` を SSoT とし、`openapi-generator` で Controller インターフェースを生成する）。

#### `backend/src/main/kotlin/com/salurec/SaluRecApplication.kt` (IDE で作成)

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

#### `backend/src/main/resources/application.yml` (IDE で作成)

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

management:
  endpoints:
    web:
      exposure:
        include: health,info

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
```

#### 依存をダウンロードして確認

```
docker compose run --rm tools bash -c "cd backend && ./gradlew --no-daemon build -x test"
```

初回はダウンロードに時間がかかる。`gradle-cache` ボリュームにキャッシュされる。

### 0-6. frontend プロジェクトの骨組み (tools コンテナで生成)

Next.js プロジェクトを新規作成:

```
docker compose run --rm tools bash -c "pnpm create next-app@latest frontend --typescript --tailwind --eslint --app --turbopack --import-alias '@/*' --no-src-dir --use-pnpm --yes"
```

**確認**: `frontend/package.json` と `frontend/app/page.tsx` が生成される。

#### 追加依存をインストール

```
docker compose run --rm tools bash -c "cd frontend && pnpm add @tanstack/react-query zod react-hook-form @hookform/resolvers zustand openapi-fetch jose"
```

```
docker compose run --rm tools bash -c "cd frontend && pnpm add -D openapi-typescript vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @playwright/test"
```

#### `frontend/package.json` の scripts に API 生成コマンドを追記 (IDE で編集)

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest --run",
    "gen:api": "openapi-typescript ../api/openapi.yaml -o shared/api/schema.ts"
  }
}
```

### 0-7. 旧 README を退避し、新 README を作成

```
docker compose run --rm tools bash -c "mv README.md docs/legacy-readme.md"
```

新 `README.md` を IDE で作成:

````markdown
# Salu-Rec

フットサルの試合管理・MVP選出を行う Web アプリ。

現在、GAS版 (`src/`) からモダンスタックへリプレース作業中。
詳細は [docs/refactoring/README.md](docs/refactoring/README.md) を参照。

## 開発環境 (Docker 完結)

ホストに必要: **Docker Desktop** (または Docker Engine) のみ。

```
docker compose up -d      # 起動
docker compose logs -f    # ログ
docker compose down       # 停止
docker compose down -v    # ボリュームごと削除
```

- Backend: http://localhost:8080
- Frontend: http://localhost:3000
- Health: http://localhost:8080/actuator/health

開発コマンド詳細は [docs/refactoring/08-execution-guide.md](docs/refactoring/08-execution-guide.md) を参照。
````

### 0-8. AGENTS.md を更新

既存の AGENTS.md は GAS 版前提。モノレポ化後の構成を反映するため、先頭に「リプレース中」のセクションを追加。
IDE で編集する(変更量が多いので手動編集が妥当)。

### 0-9. 初回起動

```
docker compose up -d
```

起動ログを追う:

```
docker compose logs -f backend
```

別ターミナルで frontend ログ:

```
docker compose logs -f frontend
```

### 0-10. 動作確認

ブラウザまたはホスト側から(Docker の機能だけを使うので OS 依存なし):

```
docker compose run --rm tools bash -c "curl -sSf http://backend:8080/actuator/health"
docker compose run --rm tools bash -c "curl -sSf http://frontend:3000"
```

- backend のヘルスチェックが `{"status":"UP"}` を返す
- frontend が Next.js のデフォルトページの HTML を返す

### Phase 0 完了条件

- [ ] `docker compose up -d` で 3 サービスが起動する
- [ ] http://localhost:8080/actuator/health が UP
- [ ] http://localhost:3000 で Next.js デフォルトページ表示
- [ ] `docker compose down -v && docker compose up -d` で再起動できる

Phase 0 が完了したら `09-progress.md` のチェックボックスを全部埋める。

---

## Phase 1: ウォーキングスケルトン (Event 集約)

**ゴール**: 認証なしで Event の作成・一覧が API と UI で動く。Domain / Application / Infrastructure / Presentation の全層を貫通実装。

### 1-1. Flyway マイグレーション

IDE で `backend/src/main/resources/db/migration/V1__init_events.sql` を作成:

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

以下のファイルを IDE で作成 (詳細なコードは [backend-architecture.md](../backend/design/backend-architecture.md) 参照):

- `backend/src/main/kotlin/com/salurec/shared/domain/EntityId.kt`
- `shared/domain/DomainEvent.kt`
- `shared/domain/DomainEventPublisher.kt`
- `shared/domain/DomainException.kt`
- `shared/domain/IdGenerator.kt`
- `shared/domain/Clock.kt`
- `shared/infrastructure/UuidV7IdGenerator.kt`
- `shared/infrastructure/SystemClock.kt`
- `shared/infrastructure/SpringDomainEventPublisher.kt`
- `shared/web/GlobalExceptionHandler.kt`
- `shared/web/ApiErrorResponse.kt`

### 1-3. Event コンテキスト (Phase 1 最小構成)

**ファイル一覧** (詳細は [backend-architecture.md](../backend/design/backend-architecture.md) + [aggregates-overview.md](../backend/design/aggregates-overview.md) を参照):

Domain:
- `event/domain/model/EventId.kt`
- `event/domain/model/EventName.kt`
- `event/domain/model/EventStatus.kt`
- `event/domain/model/JoinCode.kt`
- `event/domain/model/Event.kt`
- `event/domain/repository/EventRepository.kt`
- `event/domain/service/JoinCodeGenerator.kt`
- `event/domain/event/EventCreated.kt`

Application (Command):
- `event/application/command/command/CreateEventCommand.kt`
- `event/application/command/result/CreateEventResult.kt`
- `event/application/command/usecase/CreateEventUseCase.kt`

Application (Query):
- `event/application/query/dto/EventListItemDto.kt`
- `event/application/query/service/EventQueryService.kt`

Infrastructure:
- `event/infrastructure/persistence/entity/EventJpaEntity.kt`
- `event/infrastructure/persistence/repository/EventJpaRepository.kt`
- `event/infrastructure/persistence/repository/EventRepositoryImpl.kt`
- `event/infrastructure/persistence/query/EventQueryServiceImpl.kt`
- `event/infrastructure/persistence/mapper/EventEntityMapper.kt`
- `event/infrastructure/service/JoinCodeGeneratorImpl.kt`

Presentation:
- `event/presentation/controller/EventCommandController.kt`
- `event/presentation/controller/EventQueryController.kt`
- `event/presentation/dto/request/CreateEventRequest.kt`
- `event/presentation/dto/response/CreateEventResponse.kt`
- `event/presentation/dto/response/EventListResponse.kt`

**Phase 1 の範囲**:
- 幹事メンバー自動登録は Phase 4 で実装(Phase 1 時点では Event 単体)
- ステータス遷移 (`start`, `finish`, `reopen`) は Phase 3 で実装

### 1-4. ArchUnit テスト

`backend/src/test/kotlin/com/salurec/architecture/LayerDependencyTest.kt` を作成(テンプレは [backend-architecture.md](../backend/design/backend-architecture.md) 参照)。

### 1-5. Testcontainers 基盤

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

### 1-6. テスト実行

```
docker compose exec backend ./gradlew test
```

または backend が起動していない状態で:

```
docker compose run --rm tools bash -c "cd backend && ./gradlew test"
```

### 1-7. OpenAPI 型生成

backend を起動した状態で:

```
docker compose run --rm tools bash -c "cd frontend && pnpm gen:api"
```

生成された `frontend/shared/api/schema.ts` を git 管理対象にする。

### 1-8. Frontend (Phase 1 最小)

IDE でファイル作成 (詳細は `docs/frontend/architecture.md` 参照):

- `frontend/shared/api/client.ts`
- `frontend/features/event/api/event-api.ts`
- `frontend/features/event/components/event-list.tsx`
- `frontend/app/page.tsx` (→ `/events` リダイレクト)
- `frontend/app/events/page.tsx`
- `frontend/app/events/new/page.tsx`

### 1-9. 動作確認

```
docker compose run --rm tools bash -c 'curl -sSf -X POST http://backend:8080/api/events -H "Content-Type: application/json" -d "{\"name\":\"テスト大会\",\"date\":\"2026-06-01\",\"organizerName\":\"山田太郎\"}"'
```

```
docker compose run --rm tools bash -c "curl -sSf http://backend:8080/api/events"
```

ブラウザで `http://localhost:3000/events` を開き、作成したイベントが一覧表示される。

### Phase 1 完了条件

- [ ] V1 マイグレーションが起動時に自動適用される
- [ ] Event の作成・一覧 API が動作する
- [ ] ArchUnit テストがグリーン
- [ ] Testcontainers 結合テストがグリーン
- [ ] OpenAPI スキーマから `openapi-generator` でコード生成される
- [ ] frontend から API 呼び出しで一覧表示される

Phase 1 完了後、`09-progress.md` を更新する。

---

## Phase 2 以降

Phase 2 (認証) 以降の詳細手順は、**Phase 1 完了時に次のフェーズのガイドを追記する** 形で進める。

理由:
- Phase 1 で確立したテンプレート(Mapper の書き方、テスト構成など)を前提にする方が具体的に書ける
- 早すぎる詳細化は陳腐化する

**次のフェーズを追加する際は、このドキュメントに Phase N のセクションを追加し、`09-progress.md` にチェックボックスを追加すること。**

Phase 2 〜 9 の概要は `07-migration-plan.md` を参照。

---

## Phase 5: Match Operation (Round + Match 独立集約)

**ゴール**: チーム分け → ラウンド作成 → マッチ作成 → 得点記録 → マッチ終了 → ラウンド終了 の一連フローが API と UI で動く。

### 前提知識

- Round と Match は **独立集約**
- 集約をまたぐ整合性はアプリケーション層 UseCase が保証
- `team_assignment` は JSONB カラム（hypersistence-utils で Hibernate 7 対応）
- 設計詳細: `docs/backend/design/match/` 配下の4ファイル

### 5-1. OpenAPI 定義の確認

`api/openapi.yaml` に Round / Match エンドポイントが定義済みであることを確認。
バックエンドビルド時に `openApiGenerate` タスクで Controller インターフェースと Request/Response モデルが自動生成される。

### 5-2. Flyway V3 マイグレーション

IDE で `backend/src/main/resources/db/migration/V3__add_match_operation.sql` を作成:

```sql
-- rounds
CREATE TABLE rounds (
    id              UUID        PRIMARY KEY,
    event_id        UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    round_number    INT         NOT NULL,
    status          TEXT        NOT NULL CHECK (status IN ('InProgress','Finished')),
    team_assignment JSONB       NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, round_number)
);

CREATE INDEX idx_rounds_event_id ON rounds(event_id);

CREATE TRIGGER trg_rounds_updated_at BEFORE UPDATE ON rounds
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- matches
CREATE TABLE matches (
    id              UUID        PRIMARY KEY,
    round_id        UUID        NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    match_number    INT         NOT NULL,
    team_a_name     TEXT        NOT NULL CHECK (length(team_a_name) BETWEEN 1 AND 10),
    team_b_name     TEXT        NOT NULL CHECK (length(team_b_name) BETWEEN 1 AND 10),
    status          TEXT        NOT NULL CHECK (status IN ('InProgress','Finished')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (round_id, match_number)
);

CREATE INDEX idx_matches_round_id ON matches(round_id);
CREATE INDEX idx_matches_status   ON matches(status);

CREATE TRIGGER trg_matches_updated_at BEFORE UPDATE ON matches
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- match_participants
CREATE TABLE match_participants (
    match_id        UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    member_id       UUID        NOT NULL REFERENCES members(id),
    team            TEXT        NOT NULL CHECK (team IN ('A','B')),
    is_substitute   BOOLEAN     NOT NULL DEFAULT FALSE,
    PRIMARY KEY (match_id, member_id)
);

CREATE INDEX idx_match_participants_member_id ON match_participants(member_id);

-- goals
CREATE TABLE goals (
    id                  UUID        PRIMARY KEY,
    match_id            UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team                TEXT        NOT NULL CHECK (team IN ('A','B')),
    scorer_member_id    UUID        REFERENCES members(id),
    type                TEXT        NOT NULL CHECK (type IN ('Normal','OwnGoal','Unknown')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
        (type = 'Normal' AND scorer_member_id IS NOT NULL) OR
        (type IN ('OwnGoal', 'Unknown') AND scorer_member_id IS NULL)
    )
);

CREATE INDEX idx_goals_match_id ON goals(match_id);
```

### 5-3. hypersistence-utils 追加

`backend/build.gradle.kts` の dependencies に追加:

```kotlin
implementation("io.hypersistence:hypersistence-utils-hibernate-63:3.10.0")
```

**注意**: Hibernate 7 対応版がリリースされていない場合は、JSONB マッピングを手動で実装する（`@Convert` + Jackson ObjectMapper）。

### 5-4. Round 集約の実装

実装順序: Domain → Application → Infrastructure → Presentation

**Domain 層** (`match/domain/model/`):
- `RoundId.kt` — value class
- `RoundStatus.kt` — enum (InProgress, Finished)
- `TeamName.kt` — value class (1〜10文字)
- `Team.kt` — data class (name: TeamName, memberIds: List<MemberId>)
- `TeamAssignment.kt` — data class (teams: List<Team>)
- `Round.kt` — 集約ルート (finish, reopen)

**Domain 層** (`match/domain/port/`):
- `RoundRepository.kt` — 永続化インターフェース

**Domain 層** (`match/domain/service/`):
- `TeamSplitService.kt` — チーム分けドメインサービス（インターフェース）

**Domain 層** (`match/domain/event/`):
- `RoundCreated.kt`, `RoundFinished.kt`, `RoundReopened.kt`

**Application 層** (`match/application/command/`):
- `CreateRoundUseCase.kt` — TeamSplitService + MemberQueryPort を使用
- `FinishRoundUseCase.kt` — MatchQueryPort.hasOngoingMatchIn() を使用
- `ReopenRoundUseCase.kt`

**Application 層** (`match/application/query/`):
- `RoundQueryService.kt` — インターフェース
- `dto/RoundListItemDto.kt`, `dto/RoundDetailDto.kt`

**Application 層** (`match/application/port/`):
- `MemberForSplitPort.kt` — Member コンテキストからメンバー情報取得

### 5-5. Match 集約の実装

**Domain 層** (`match/domain/model/`):
- `MatchId.kt`, `GoalId.kt` — value class
- `MatchStatus.kt` — enum (InProgress, Finished)
- `MatchTeam.kt` — enum (A, B)
- `GoalType.kt` — enum (Normal, OwnGoal, Unknown)
- `MatchParticipant.kt` — data class (値オブジェクト)
- `Goal.kt` — data class (ID付き値オブジェクト)
- `Match.kt` — 集約ルート (recordGoal, removeGoal, addSubstitute, finish, reopen)

**Domain 層** (`match/domain/port/`):
- `MatchRepository.kt`

**Domain 層** (`match/domain/event/`):
- `MatchCreated.kt`, `MatchFinished.kt`, `MatchReopened.kt`, `GoalRecorded.kt`

**Application 層** (`match/application/command/`):
- `CreateMatchUseCase.kt` — Round が InProgress か検証
- `RecordGoalUseCase.kt`
- `RemoveGoalUseCase.kt`
- `AddSubstituteUseCase.kt`
- `FinishMatchUseCase.kt`
- `ReopenMatchUseCase.kt` — Round が Finished なら同時に reopen

**Application 層** (`match/application/query/`):
- `MatchQueryService.kt` — インターフェース
- `dto/MatchListItemDto.kt`, `dto/MatchDetailDto.kt`

### 5-6. Infrastructure 層

**Persistence** (`match/infrastructure/persistence/`):
- `entity/RoundJpaEntity.kt` — `team_assignment` は JSONB
- `entity/MatchJpaEntity.kt`
- `entity/MatchParticipantJpaEntity.kt`
- `entity/GoalJpaEntity.kt`
- `repository/RoundJpaRepository.kt`, `RoundRepositoryImpl.kt`
- `repository/MatchJpaRepository.kt`, `MatchRepositoryImpl.kt`
- `query/RoundQueryServiceImpl.kt`, `MatchQueryServiceImpl.kt`
- `mapper/RoundEntityMapper.kt`, `MatchEntityMapper.kt`

**Service** (`match/infrastructure/service/`):
- `TeamSplitServiceImpl.kt` — Fisher-Yates + ラウンドロビン

**Adapter** (`match/infrastructure/adapter/`):
- `MemberForSplitAdapter.kt` — Member コンテキストの JPA を直接参照（同一 DB なので Port 経由で OK）

### 5-7. Presentation 層

- `controller/RoundCommandController.kt` — 生成インターフェースを implements
- `controller/RoundQueryController.kt`
- `controller/MatchCommandController.kt`
- `controller/MatchQueryController.kt`

### 5-8. Event コンテキストの StubRoundStatusAdapter を差し替え

- `StubRoundStatusAdapter` を削除
- `match/infrastructure/adapter/RoundStatusAdapter.kt` を作成（`hasOngoingRoundIn(eventId)` の実実装）

### 5-9. SecurityConfig 更新

Round / Match エンドポイントの認可ルールを追加:
- ラウンド作成・終了・再開: ADMIN のみ
- マッチ作成・終了・再開・得点記録・助っ人追加: ADMIN のみ
- ラウンド一覧・詳細・マッチ一覧・詳細: ADMIN + USER

### 5-10. テスト

- Round ドメインモデル単体テスト (Kotest)
- Match ドメインモデル単体テスト (Kotest)
- TeamSplitService 単体テスト
- CreateRoundUseCase / FinishRoundUseCase 単体テスト (MockK)
- CreateMatchUseCase / ReopenMatchUseCase 単体テスト (MockK)
- RoundRepositoryImpl 結合テスト (Testcontainers)
- MatchRepositoryImpl 結合テスト (Testcontainers)
- RoundCommandController API テスト
- MatchCommandController API テスト
- ArchUnit テスト更新（match コンテキストの依存ルール追加）

### 5-11. Frontend

- `features/match/` ディレクトリ作成
- Route Handlers: `/api/events/{id}/rounds/`, `/api/events/{id}/rounds/{roundId}/matches/` 等
- チーム分け UI（チーム数選択 → メンバー選択 → 実行）
- 対戦カード選択 UI（3チーム以上の場合）
- マッチ操作 UI（スコアボード、得点ボタン、終了/再開）
- タイマー UI（クライアント完結、localStorage で永続化）
- 型生成: `pnpm gen:api`

### 5-12. 動作確認

```bash
# テスト実行
docker compose exec backend ./gradlew test

# マイグレーション確認
docker compose down -v && docker compose up -d

# API 動作確認
docker compose run --rm tools bash -c 'curl -sSf -X POST http://backend:8080/api/events/{eventId}/rounds -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d "{\"teamCount\":2,\"memberIds\":[...]}"'
```

### Phase 5 完了条件

- [ ] V3 マイグレーションが起動時に自動適用される
- [ ] 2〜N チームのチーム分けが動く
- [ ] マッチ作成・得点記録・終了・再開が動く
- [ ] Round 終了時に進行中マッチがあればエラーになる
- [ ] Match 再開時に Round が終了なら自動で進行中に戻る
- [ ] Event 終了時に進行中 Round があればエラーになる（StubRoundStatusAdapter 差し替え済み）
- [ ] ArchUnit テスト + 全テストがグリーン
- [ ] フロントエンドからチーム分け → 試合 → 得点記録の一連フローが動く

---

## 開発フロー (全Phase 共通)

### 新しいコンテキスト/機能を追加する時

1. [ubiquitous-language.md](../backend/design/ubiquitous-language.md) を確認。未定義の用語は追加
2. [aggregates-overview.md](../backend/design/aggregates-overview.md) で集約設計を確認・追記
3. `docs/er-diagram.md` にテーブル概要を追加（DDL の正は Flyway SQL）
4. Flyway マイグレーション追加 (`V2__xxx.sql`, `V3__xxx.sql`...)
5. Domain → Application → Infrastructure → Presentation の順に実装
6. ArchUnit テストを更新
7. OpenAPI から型生成し直す: `docker compose run --rm tools bash -c "cd frontend && pnpm gen:api"`
8. frontend 側を実装
9. `09-progress.md` のチェックボックスを更新

### PR 前のチェック

```
docker compose run --rm tools bash -c "cd backend && ./gradlew test"
docker compose run --rm tools bash -c "cd frontend && pnpm test && pnpm lint && pnpm build"
```

### マイグレーションの検証

```
docker compose down -v
docker compose up -d db
docker compose run --rm tools bash -c "cd backend && ./gradlew flywayInfo"
docker compose up -d backend
```

---

## よくある作業

### 新しいパッケージを追加する (backend)

1. IDE で `backend/build.gradle.kts` の `dependencies` に追記
2. `docker compose restart backend` で反映
3. または `docker compose run --rm tools bash -c "cd backend && ./gradlew --refresh-dependencies"`

### 新しいパッケージを追加する (frontend)

```
docker compose run --rm tools bash -c "cd frontend && pnpm add <package>"
```

### DB を完全リセット

```
docker compose down -v
docker compose up -d
```

### 開発中に Spring Boot を再起動

`bootRun --continuous` で自動再起動される。手動でやりたい場合:

```
docker compose restart backend
```

### API 仕様を確認する

`api/openapi.yaml` を直接参照する。Swagger UI は提供しない（springdoc 削除済み）。

### ログを絞って見る

```
docker compose logs --tail=200 backend
```

### DB に接続

```
docker compose exec db psql -U salurec -d salurec
```

### コンテナに入って調査

```
docker compose exec backend bash
docker compose exec frontend sh
docker compose run --rm tools bash
```

---

## Phase 進行時の一般的なルール

1. **各 Phase 開始前に `09-progress.md` で現在地を確認**
2. **Phase の完了条件を全て満たしてから次 Phase へ**
3. **設計判断は `docs/backend/design/` および `docs/frontend/` に記録する**
4. **実装で学んだテンプレートは `08-execution-guide.md` に追記**
5. **新語が出たら必ず [ubiquitous-language.md](../backend/design/ubiquitous-language.md) に記録**
6. **ホストで直接 `./gradlew` や `pnpm` を叩かない**
