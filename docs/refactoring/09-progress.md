# 進捗チェックリスト

**再開時はこのファイルを最初に開いてください**。

チェックが入っていないタスクの最初のものが、次にやるべき作業です。
各タスクの詳細手順は `08-execution-guide.md` 参照。

---

## 全体ステータス

| Phase | 状態 | 備考 |
|---|---|---|
| Phase 0: プロジェクト基盤整備 | ✅ **完了** | Docker Compose で3サービス起動・ヘルスチェック通過 |
| Phase 1: ウォーキングスケルトン (Event) | ✅ **完了** | Event 作成/一覧が API と UI で動作。全テスト緑 |
| Phase 1.5: デザインシステム移植 | ✅ **完了** | 既存 `src/css.html` を `globals.css` に移植、SVGアイコン・共通UIを React 化 |
| Phase 2: 認証基盤 | ✅ **完了** | JWT ログイン(管理者パスワード/参加コード)と Cookie セッションが動作 |
| Phase 3: Event コンテキスト完成 | ✅ **完了** | 詳細取得・ステータス遷移 API、QR+コピー UI、動的認可が動作 |
| Phase 4: Member コンテキスト | ✅ **完了** | メンバーCRUD、キュー方式一括登録、意気込み編集、幹事自動登録が動作 |
| Phase 5: Match Operation (Round + Match 独立集約) | **次はここから** | |
| Phase 6: MVP Evaluation | 未着手 | |
| Phase 7: Survey (Web フォーム自前化) | 未着手 | |
| Phase 8: 仕上げ・デプロイ | 未着手 | |
| Phase 9: 旧システム停止 | 未着手 | |

### ドキュメント整備状況

- [x] 00-overview.md
- [x] 01-ubiquitous-language.md
- [x] 02-context-map.md
- [x] 03-aggregates.md
- [x] 04-rdb-schema.md
- [x] 05-backend-architecture.md
- [x] 06-frontend-architecture.md
- [x] 07-migration-plan.md
- [x] 08-execution-guide.md
- [x] 09-progress.md (このファイル)
- [x] 10-decisions.md
- [x] 11-docker-environment.md

---

## Phase 0: プロジェクト基盤整備 ✅ 完了

### 0-1. ルート設定ファイル
- [x] `.env.example` 作成
- [x] `.env` 作成
- [x] `.dockerignore` 作成
- [x] `.gitignore` 更新 (新規ディレクトリ対応)
- [x] pnpm workspace は採用せず (シンプル化)、frontend を単独プロジェクトとして扱う

### 0-2. Docker 環境
- [x] `docker-compose.yml` 作成 (db / backend / frontend の3サービス)
- [x] `docker/backend.Dockerfile` 作成 (dev/builder/runtime マルチステージ)
- [x] `docker/frontend.Dockerfile` 作成 (dev/builder/runtime マルチステージ)
- [x] Docker Desktop で `docker compose up -d` が成功する

### 0-3. Backend 骨組み
- [x] `backend/settings.gradle.kts` 作成
- [x] `backend/build.gradle.kts` 作成 (Spring Boot 4.0.6 + Kotlin 2.3.21)
- [x] Gradle ラッパー生成
- [x] `backend/src/main/kotlin/com/salurec/SaluRecApplication.kt` 作成
- [x] `backend/src/main/resources/application.yml` 作成
- [x] Flyway マイグレーションディレクトリ (`backend/src/main/resources/db/migration/`) 作成

### 0-4. Frontend 骨組み
- [x] `pnpm create next-app` で frontend/ 初期化
  (追加依存 (TanStack Query / Zod / openapi-typescript など) は Phase 1 で必要になった時点で追加する)

### 0-5. 初回起動確認
- [x] `docker compose up -d` で 3 サービス起動
- [x] `curl http://localhost:8080/actuator/health` が `{"status":"UP"}` を返す
- [x] http://localhost:3000 で Next.js ページが HTTP 200 を返す
- [x] PostgreSQL が healthy

### 0-6. README / AGENTS.md 整備
- [x] 旧 README を `docs/legacy-readme.md` に退避
- [x] 新 README 作成 (Docker 起動手順 + リプレース概要)
- [x] AGENTS.md の先頭にリプレース中セクションを追記

### Phase 0 完了条件

- [x] `docker compose up -d` で 3 サービスが起動する
- [x] backend / frontend / db それぞれ疎通確認済み
- [x] ホスト OS に追加インストール不要を確認(Docker のみで完結)

### Phase 0 の成果物と注意点

- **採用スタック確定**: Spring Boot 4.0.6 + Kotlin 2.3.21 + Hibernate 7 / Next.js 16 + Node 24 + pnpm / PostgreSQL 16
- **hypersistence-utils は一旦外した**: Hibernate 7 対応版のリリースを待って Phase 5 (JSONB カラムが必要になるとき) で再導入する
- **spring-boot-starter-security も一旦外した**: Phase 2 で再追加する
- **Flyway マイグレーションは空** (ディレクトリのみ)。Phase 1 で `V1__init_events.sql` を追加する

---

## Phase 1: ウォーキングスケルトン (Event 集約貫通) ✅ 完了

### 1-1. Shared Kernel
- [x] `shared/domain/EntityId.kt`
- [x] `shared/domain/DomainEvent.kt`
- [x] `shared/domain/DomainEventPublisher.kt`
- [x] `shared/domain/DomainException.kt`
- [x] `shared/domain/IdGenerator.kt`
- [x] `shared/domain/Clock.kt`
- [x] `shared/infrastructure/UuidV7IdGenerator.kt`
- [x] `shared/infrastructure/SystemClock.kt`
- [x] `shared/infrastructure/SpringDomainEventPublisher.kt`
- [x] `shared/web/GlobalExceptionHandler.kt`
- [x] `shared/web/ApiErrorResponse.kt`

### 1-2. Flyway マイグレーション
- [x] `V1__init_events.sql` 作成
- [x] 起動時に自動適用されることを確認

### 1-3. Event Domain 層
- [x] `event/domain/model/EventId.kt`
- [x] `event/domain/model/EventName.kt`
- [x] `event/domain/model/EventStatus.kt`
- [x] `event/domain/model/JoinCode.kt`
- [x] `event/domain/model/Event.kt`
- [x] `event/domain/repository/EventRepository.kt`
- [x] `event/domain/service/JoinCodeGenerator.kt`
- [x] `event/domain/event/EventCreated.kt`

### 1-4. Event Application 層 (Command + Query)
- [x] `event/application/command/command/CreateEventCommand.kt`
- [x] `event/application/command/result/CreateEventResult.kt`
- [x] `event/application/command/usecase/CreateEventUseCase.kt`
- [x] `event/application/query/dto/EventListItemDto.kt`
- [x] `event/application/query/service/EventQueryService.kt`

### 1-5. Event Infrastructure 層
- [x] `event/infrastructure/persistence/entity/EventJpaEntity.kt`
- [x] `event/infrastructure/persistence/repository/EventJpaRepository.kt`
- [x] `event/infrastructure/persistence/repository/EventRepositoryImpl.kt`
- [x] `event/infrastructure/persistence/query/EventQueryServiceImpl.kt`
- [x] `event/infrastructure/persistence/mapper/EventEntityMapper.kt`
- [x] `event/infrastructure/service/JoinCodeGeneratorImpl.kt`

### 1-6. Event Presentation 層
- [x] `event/presentation/controller/EventCommandController.kt`
- [x] `event/presentation/controller/EventQueryController.kt`
- [x] `event/presentation/dto/request/CreateEventRequest.kt`
- [x] `event/presentation/dto/response/CreateEventResponse.kt`
- [x] `event/presentation/dto/response/EventListResponse.kt`

### 1-7. テスト
- [x] ArchUnit テスト (レイヤー依存、JPA Entity 配置、Command/Query 分離)
- [x] `Event` ドメインモデルの単体テスト (Kotest)
- [x] `CreateEventUseCase` の単体テスト (MockK)
- [x] `EventRepositoryImpl` の結合テスト (Testcontainers)
- [x] `EventQueryServiceImpl` の結合テスト
- [x] `EventCommandController` の API テスト

### 1-8. OpenAPI 連携
- [x] `/v3/api-docs` が返ることを確認
- [x] frontend で openapi-typescript を導入
- [x] `pnpm gen:api` で `schema.ts` が生成される

### 1-9. Frontend (Phase 1 最小)
- [x] 必要な依存を追加 (TanStack Query / Zod / openapi-fetch / openapi-typescript / react-hook-form 等)
- [x] `app/page.tsx` で `/events` にリダイレクト
- [x] `app/events/page.tsx` でイベント一覧を表示
- [x] `app/events/new/page.tsx` でイベント作成フォーム
- [x] `shared/api/client.ts` の openapi-fetch クライアント

### Phase 1 完了条件
- [x] フロントからイベント作成できる
- [x] 作成したイベントが一覧に表示される
- [x] backend の全テストが通る (30件)
- [x] ArchUnit のレイヤー境界テストが通る

### Phase 1 の成果物・Tips

- **Spring Boot 4.0 の破壊変更への対応**:
  - `AutoConfigureMockMvc` は `org.springframework.boot.webmvc.test.autoconfigure` に移動
  - テスト依存に `spring-boot-starter-webmvc-test` を追加する必要あり
  - Flyway は `flyway-core` 単体では自動設定されないので `spring-boot-starter-flyway` を追加する
  - `@SpringBootTest` で `ObjectMapper` の Bean が自動注入されないケースあり(テスト内で自前生成する)
- **Docker で Testcontainers を動かす方針**:
  - backend コンテナに Docker ソケット (`/var/run/docker.sock`) を共有してDocker-out-of-Docker
  - `TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal` と `extra_hosts: host.docker.internal:host-gateway` で兄弟コンテナに到達
  - `TESTCONTAINERS_RYUK_DISABLED=true` で Ryuk のネットワーク分離問題を回避
- **開発サイクル高速化**:
  - docker-compose.yml の backend を `tail -f /dev/null` で常駐させ、`docker compose exec backend ./gradlew ...` で実行
  - こうすると Gradle デーモンと incremental ビルドが効いて2回目以降が劇的に速い
  - `backend/gradle.properties` に `org.gradle.daemon=true` / `kotlin.incremental=true` を設定
  - bootRun は別プロセスで `docker compose exec backend ./gradlew bootRun` を叩く

---

## Phase 1.5: デザインシステム移植 ✅ 完了

**目的**: GAS 版 (`src/css.html` + `src/index.html`) の見た目を完全に再現できる基盤を、各機能実装に入る前に用意する。
**方針**: Tailwind で作り直すのではなく、既存の CSS 変数と独自クラスをそのまま Next.js に移植する(ADR-014)。
Phase 2 以降はこの基盤に乗せて画面を作る。

### 1.5-1. 設計方針

- `frontend/app/globals.css` に既存の CSS 変数(`--primary`, `--radius` 等)と全コンポーネントクラス(`.card`, `.btn-primary`, `.tab-bar` 等) を移植する
- Tailwind v4 は残すが、主な UI は独自クラスを優先
- フォントは `next/font/google` で Fira Sans / Fira Code / Luckiest Guy をロードし CSS 変数に割り当てる
- SVG アイコンは `src/js.html` の `IC` オブジェクトを TypeScript モジュールに移植
- Toast / Modal / LoadingOverlay は React コンポーネント化して Zustand ストアで状態管理
- `<body>` に `role-admin` / `role-user` クラスを付ける仕組みを用意(適用は Phase 2)

### 1.5-2. フォント・CSS 変数・ベーススタイル

- [x] `app/layout.tsx` で `Fira_Sans` / `Fira_Code` / `Luckiest_Guy` を読み込み、`--font-fira-sans` / `--font-fira-code` / `--font-luckiest-guy` に割り当て
- [x] `app/globals.css` を書き直し: Tailwind のベース + 既存 CSS 変数 `:root {...}` + ベースタイポ + 汎用アニメーション
- [x] `app/layout.tsx` の `<body>` に `header-content-wrapper` を反映(既存のコンテンツ幅 600px を踏襲)
- [x] ページ背景を `--bg`(#FEF2F2)、テキストを `--text`(#7F1D1D) に切り替え

### 1.5-3. 共通コンポーネント (`shared/components/ui/`)

- [x] `AppHeader.tsx` — SALU-REC ロゴ + マイクアイコン + ログアウトボタン (既存 `header` / `header-inner` をそのまま移植)
- [x] `Card.tsx` — `.card` クラスのラッパー
- [x] `Button.tsx` — `variant="primary|secondary|accent|danger"` / `size="sm|md|lg"`
- [x] `Input.tsx` — `.input` のラッパー
- [x] `InputGroup.tsx` — `.input-group` のラッパー
- [x] `Badge.tsx` — `.badge` + バリアント (organizer, years, preparing, ongoing, ended, exp, noexp)
- [x] `EmptyState.tsx` — `.empty-state` の移植
- [x] `ToastRoot.tsx` + ストア — 既存 `showToast` 相当 (Zustand ストアで管理)
- [x] `ModalRoot.tsx` + ストア — 既存 `modal-overlay` + `modal-box` の移植 (aria-modal 含む)
- [x] `LoadingOverlay.tsx` + ストア — 既存 `loading` + `spinner` の移植
- [ ] `TabBar.tsx` — 使用は Phase 3(イベント詳細タブ)のタイミングで追加

### 1.5-4. SVG アイコン

- [x] `shared/icons/ic.tsx` に `IC` 相当の定数を移植
- [x] `<Icon name="trophy" size={14} />` で呼び出せるコンポーネント化
- [x] ヘッダーロゴ・ログインロゴ用の `BrandLogo.tsx` を切り出し

### 1.5-5. ロール別表示制御

- [x] `shared/components/ui/RoleBody.tsx` — `<body>` に `role-admin` / `role-user` クラスを付与する Client Component
- [x] `globals.css` に `body.role-user .admin-only { display: none !important; }` 等のルールを移植
- [x] 初期値はダミーで `role-admin` を付けて動作確認(実ロール決定は Phase 2)

### 1.5-6. Phase 1 のページを既存デザインで書き直し

- [x] `app/events/page.tsx` を新しい `Card` / `Button` / `Badge` で再実装
- [x] `app/events/new/page.tsx` を既存 `page-create-event` の見た目に寄せる
- [x] `app/layout.tsx` に `AppHeader` + `<main class="content">` + `ToastRoot` + `ModalRoot` + `LoadingOverlay` を配置

### 1.5-7. 検証

- [x] http://localhost:3000/events がイベント一覧として既存と同等の見た目で表示される
- [x] http://localhost:3000/events/new が既存の作成フォームと同等の見た目で表示される
- [x] ロゴ・カード・ボタン・バッジ・イベントアイテムが既存 CSS で描画される
- [x] `body.role-admin` が付与され admin-only 要素が表示される
- [x] フォントが Fira Sans / Fira Code / Luckiest Guy で読み込まれている

### Phase 1.5 完了条件

- [x] 既存の CSS 変数・主要コンポーネントクラス (`.card`, `.btn-*`, `.tab-bar`, `.input`, `.badge`, `.empty-state`, `.modal-*`, `.toast`, `.loading`, `.header`) が `globals.css` に揃っている
- [x] `Card` / `Button` / `Input` / `InputGroup` / `Badge` / `EmptyState` / `ToastRoot` / `ModalRoot` / `LoadingOverlay` / `AppHeader` / `Icon` / `BrandLogo` / `BrandMic` / `RoleBody` のコンポーネントが存在する
- [x] Phase 1 で作ったイベント一覧・作成ページが既存デザインで動く
- [x] Phase 2 以降の画面実装でこれらのコンポーネントを使うだけで既存デザインに寄せられる状態

### Phase 1.5 の Tips・メモ

- `next/font/google` で読み込んだフォントは自動で CSS 変数に割り当てられるので、既存の `font-family: 'Fira Sans'` は `font-family: var(--font-fira-sans)` に置き換えるだけで動く
- `<body>` をクライアントコンポーネント (`RoleBody`) にするには RSC から直接 `<body>` を書かずに Server の `<html>` 直下に置く
- **`<body>` に Tailwind の `flex flex-col` を付けてはいけない**。既存デザインは `.content { max-width: 600px; margin: 0 auto }` で中央寄せしているが、flex コンテキストでは `margin: auto` が水平中央寄せとして効かず、カードが左寄せになって「右側に広い余白」が出る。GAS 版の body は block 要素として設計されているので、そのまま踏襲する
- ログイン画面固有のクラス (`.login-hero`, `.login-hero-icon`, `.login-logo`, `.login-hero-title`, `.login-mic`, `.login-code-input`, `.login-admin-area`, `.admin-toggle-link` 等) は globals.css への初回移植で抜け漏れやすい。追加分は末尾のログインセクションに追記した
- 開発モードの Next.js 開発インジケーター(左下の N 丸バッジ)は `next.config.ts` の `devIndicators: false` で消せる
- Tailwind v4 は `@import "tailwindcss"` だけで自動的にユーティリティが有効。今回は大半を独自クラスで賄うが、Phase 2 以降の細かい調整には使う
- `TabBar` はイベント詳細画面 (Phase 3) で必要になるタイミングで追加

---

## Phase 2: 認証基盤 ✅ 完了

### 概要タスク
- [x] `backend/build.gradle.kts` に `spring-boot-starter-security` / `spring-security-test` / `spring-boot-starter-security-test`(Spring Boot 4 で MockMvc 統合に必要) を追加
- [x] `SecurityConfig.kt` — URL パターン + HTTP メソッドで認可を一括定義(@PreAuthorize は使わない)
- [x] `JwtAuthTokenIssuer.kt` — jjwt による HS256 署名・検証
- [x] `JwtAuthenticationFilter.kt` — `Authorization: Bearer <JWT>` を検証して SecurityContext に載せる
- [x] Identity コンテキスト: Domain(AuthPrincipal / Role / AuthTokenIssuer I/F)+ Application(LoginAsAdmin / LoginWithJoinCode UseCase) + Presentation(AuthController: login-admin / login-with-code / me)
- [x] Event API の認可は `SecurityConfig` で URL ベースに集約(POST/GET /api/events は ADMIN)
- [x] Frontend: `/login` ページ(既存 `src/index.html` #page-login のデザインを踏襲)
- [x] Frontend: `/api/auth/login` と `/api/auth/logout` Route Handler(httpOnly Cookie 発行)
- [x] Frontend: `shared/lib/auth.ts`(Server Component から Cookie → `/api/auth/me` で検証)
- [x] Frontend: `/events` 配下に認証ガード `layout.tsx` を配置
- [x] Frontend: `RoleSync` でサーバー取得ロールを Zustand ストアに同期
- [x] Frontend: `AppHeader` のログアウトボタンを `/api/auth/logout` 呼び出しに接続
- [x] Frontend: `server-only` パッケージでサーバー専用モジュールをクライアントから import した時点でビルドエラー化
- [x] Frontend: クライアントコンポーネントは `/api/events` Route Handler 経由で呼び出し(Cookie の JWT を Next.js 側で Authorization に転送)

### Phase 2 完了条件
- [x] 管理者パスワードでログインできる
- [x] 参加コードでログインできる
- [x] 未認証で API を叩くと 401 (INVALID_CREDENTIALS / UNAUTHENTICATED) が返る
- [x] USER トークンで管理者エンドポイントを叩くと 403 が返る
- [x] `/events` に直接アクセスすると `/login` にリダイレクトされる
- [x] ログイン後に `/events` で一覧が取得できる
- [x] 全テストが通る(Identity の結合テスト5件 + UseCase 単体テスト7件を新規追加)

### Phase 2 の Tips・メモ

- **Spring Boot 4 の破壊変更**:
  - MockMvc の Security 自動統合には `spring-boot-starter-security-test` が必須。`spring-security-test` 単体だと `@WithMockUser` が効かない
- **認可の集約**: Controller に `@PreAuthorize` を撒くと Presentation がフレームワーク依存してノイズになる。URL ベースで `SecurityConfig` に集約。動的認可(特定イベントへのアクセス可否など)が必要になる Phase 3 以降では、Controller 内で `AuthPrincipal.canAccessEvent(eventId)` を呼び出すパターンに統一
- **JWT シークレット**: 短い開発用シークレットでも HS256 の最低 256bit 要件を満たすため、SHA-256 で派生鍵化してから `hmacShaKeyFor` に渡している
- **Next.js 15: Cookie は async**: `cookies()` は Promise を返すので `await cookies()` する必要あり(Next 14 以前とは違う)
- **クライアント→API の経路**: RSC がサーバーで `/api/events` を叩くルートと、Client Component が Next の Route Handler を叩くルートの2経路。Client から直接バックエンドを叩く経路は用意せず、Cookie の JWT を Next.js 側で転送する構造
- **`server-only` パッケージ**: `shared/lib/auth.ts` のような `next/headers` 使用ファイルをクライアントから誤 import するとビルドエラーになり、事故を防げる
- **テスト用参加コード**: `JoinCode.ALLOWED_CHARS` から `I`, `L`, `O`, `0`, `1` が除外されているのでテストコードは要注意

---

## Phase 3: Event コンテキスト完成 ✅ 完了

### 概要タスク
- [x] Event 詳細取得 Query (`GET /api/events/{id}`)
- [x] ステータス遷移 UseCase: `StartEventUseCase` / `FinishEventUseCase` / `ReopenEventUseCase`
- [x] ステータス遷移 API: `POST /api/events/{id}/start` / `/finish` / `/reopen`
- [x] Port: `MemberCountPort`(Phase 4 で差し替え) / `RoundStatusPort`(Phase 5 で差し替え)
- [x] 仮実装 Adapter: `StubMemberCountAdapter` / `StubRoundStatusAdapter`
- [x] `EventNotFoundException` + `GlobalExceptionHandler` で 404 ハンドリング
- [x] 動的認可: Controller で `AuthPrincipal.canAccessEvent(eventId)` を使う
- [x] テスト: Event 詳細・ステータス遷移の結合テスト + `@WithMockAuthPrincipal` カスタムアノテーション
- [x] Frontend: イベント詳細画面の雛形
- [x] Frontend: 参加コードコピーボタン + QR コード表示
- [x] Frontend: ステータス遷移 UI (進行中にする / イベントを終了 / 進行中に戻す)
- [x] Frontend: Route Handler `/api/events/{id}/{action}` で Cookie の JWT を転送
- [x] Frontend: QR コード経由で `/login?code=XXXXX` に来たとき参加コード入力欄に自動セット

### Phase 3 完了条件
- [x] 3 状態 (Preparing / InProgress / Finished) の遷移が API 経由で動く
- [x] QR コードが Event 詳細画面に表示される

### Phase 3 の Tips・メモ

- **テストで `@AuthenticationPrincipal AuthPrincipal` を注入する方法**:
  - `@WithMockUser` はデフォルトで `org.springframework.security.core.userdetails.User` を principal にするため、Controller で `AuthPrincipal` を受けるとキャストできず null になる
  - カスタムアノテーション `@WithMockAuthPrincipal(role = ADMIN)` + `WithSecurityContextFactory` を用意して解決
- **他コンテキスト依存の UseCase は Port で分離**:
  - Event の `start` は Member のメンバー数、`finish` は Round の進行中判定が必要
  - Port を切って `@Component` のダミー Adapter で先行実装。Phase 4/5 で実実装に差し替え
- **動的認可は Controller で**:
  - URL パターンで表現できない「特定イベントへのアクセス可否」のような条件は Controller 内で `AuthPrincipal.canAccessEvent()` を使う
  - これなら Presentation 層は `@PreAuthorize` に依存せず、Security 設定も URL ベースで完結
- **openapi-fetch の path パラメータ**:
  - 3 つの遷移エンドポイントを1関数で書こうとするとパス文字列型が推論できず any キャストが必要
  - 型安全を優先して `startEvent` / `finishEvent` / `reopenEvent` をそれぞれ個別関数に
- **QR コードは `qrcode.react` の `QRCodeSVG`**:
  - 外部サービスに依存せずにクライアント生成
  - `value` には `/login?code=XXXXX` の完全 URL を埋め、`LoginForm` が `useSearchParams` でプリセットを拾う

---

## Phase 4: Member コンテキスト ✅ 完了

### 概要タスク
- [x] Flyway V2: members テーブル
- [x] Member ドメイン (Member / MemberId / MemberName / SoccerExperience + イベント3種)
- [x] MemberRepository (Write) + MemberQueryService (Read)
- [x] BulkRegisterMembers / UpdateMember / UpdateEnthusiasm / DeleteMember UseCase
- [x] Member Controller (Command + Query) + DTO
- [x] Event の `MemberRegistrationPort` → `MemberRegistrationAdapter` で幹事自動登録
- [x] `StubMemberCountAdapter` → `MemberCountAdapter` (実カウント) に差し替え
- [x] SecurityConfig に Member エンドポイント追加(CRUD は ADMIN、意気込み更新・一覧は USER も可)
- [x] Frontend: メンバー管理タブ(キュー方式の登録フォーム、一覧、経験/幹事バッジ、編集/削除ボタン)
- [x] Frontend: メンバー編集モーダル(名前/年次/経験/幹事/備考/意気込み)
- [x] Frontend: Route Handler `/api/events/{id}/members` と `/members/{memberId}/enthusiasm`
- [x] Frontend: イベント作成フォームに `organizerName` を追加
- [x] Frontend: 詳細ページにタブバー(メンバー/試合/結果)を追加
- [x] テスト: Member Domain 単体 + 結合テスト4件追加
- [x] ArchUnit テスト緑・全50件緑

### Phase 4 完了条件
- [x] イベント作成時に幹事メンバーが自動登録される
- [x] メンバーの一括登録が動く
- [x] 意気込みを(本人を含む)ユーザーが更新できる(Phase 4 時点では本人判定は `canAccessEvent` レベル)
- [x] 画面からメンバー登録→一覧表示→編集→削除の一連の動線が動く

### Phase 4 の Tips・メモ

- **Spring Boot 4 (Jackson 3) は Kotlin Module 自動登録されない**:
  - data class のデフォルト値(`isOrganizer: Boolean = false` など)が効かず、欠落時に `Cannot map null into type boolean` エラー
  - DTO 側を `Boolean? = false` にして `organizerFlag()` のようなヘルパーで変換する方がシンプル
  - 将来 Jackson 3 対応の Kotlin Module が Spring Boot に組み込まれたら外して OK
- **`is` プレフィクスの Kotlin プロパティ**:
  - Jackson はデフォルトで `isFoo` → JSON キー `foo` として扱う。既存 GAS API と合わせるため `@get:JsonProperty("isOrganizer")` で明示する
- **Stub Adapter を `@Primary` で差し替え**:
  - Phase 3 で作った `StubMemberCountAdapter` を削除して実装版 `MemberCountAdapter` に。`@Component` + `@Primary` で自動置換
- **テスト高速化の設定**:
  - Gradle 並列実行(`maxParallelForks`) + Testcontainers reuse (`testcontainers.reuse.enable=true`) + JVM 起動オプション(`TieredStopAtLevel=1`)で改善
  - Docker イメージ側に `/root/.testcontainers.properties` を置いて再起動後も reuse 設定が維持されるよう

---

## Phase 5: Match Operation (Round + Match 独立集約) ← 次はここから

### 概要タスク
- [ ] Flyway V3: rounds, matches, match_participants, goals
- [ ] **hypersistence-utils (Hibernate 7対応版) を追加** して JSONB カラムに対応
- [ ] Round 集約
- [ ] Match 集約 (独立)
- [ ] TeamSplitService
- [ ] 集約またぎ整合性: `FinishRoundUseCase`, `ReopenMatchUseCase`
- [ ] チーム分け UI
- [ ] 対戦カード選択 UI (3チーム以上)
- [ ] 得点記録 UI
- [ ] タイマー UI

### Phase 5 完了条件
- [ ] 2〜Nチームのチーム分けが動く
- [ ] マッチ作成・得点記録・終了・再開が動く
- [ ] Round 終了時の整合性チェックが効く

---

## Phase 6: MVP Evaluation

### 概要タスク
- [ ] Flyway V4: mvp_evaluations, mvp_player_ratings
- [ ] GeminiClient 実装
- [ ] SelectMvpUseCase
- [ ] MatchQueryPort / MemberQueryPort / SurveyQueryPort
- [ ] Frontend: MVP選出UI
- [ ] Frontend: MVP結果表示

### Phase 6 完了条件
- [ ] イベント終了状態で MVP 選出が実行できる
- [ ] 幹事が MVP/準MVP から除外されている
- [ ] レーティング・称号・コメントが全員分表示される

---

## Phase 7: Survey (Web フォーム自前化)

### 概要タスク
- [ ] Flyway V5: surveys, survey_responses, survey_comments
- [ ] Survey 集約 (Open/Closed)
- [ ] SurveyResponse 独立集約
- [ ] アンケート回答 API
- [ ] 回答集計 Query
- [ ] Frontend: アンケート回答画面
- [ ] Frontend: 管理者向け締切操作
- [ ] Frontend: 回答状況可視化

### Phase 7 完了条件
- [ ] アプリ内でアンケート回答ができる
- [ ] 同一メンバーの重複回答が防がれる
- [ ] MVP 評価時にコメントが反映される

---

## Phase 8: 仕上げ・デプロイ

### 概要タスク
- [ ] 機能パリティ検証 (AS IS 機能を全カバー確認)
- [ ] スタッツ表示統合
- [ ] ハイライト生成 (TO BE で追加する場合)
- [ ] 本番用 `docker-compose.prod.yml`
- [ ] ホスティング先選定 (未定)
- [ ] ドメイン・SSL
- [ ] 本番 DB
- [ ] GitHub Actions での自動デプロイ

### Phase 8 完了条件
- [ ] 本番環境で全機能が動作する
- [ ] デプロイが GitHub Actions で自動化されている

---

## Phase 9: 旧システム停止

### 概要タスク
- [ ] 旧 GAS アプリの停止通知
- [ ] `src/` → `legacy/gas/` に移動
- [ ] README を新構成に完全置き換え
- [ ] `.clasp.json` 削除
- [ ] `.github/workflows/deploy.yml` (GAS用) 削除
- [ ] `AGENTS.md` から AS IS 記述を削除

### Phase 9 完了条件
- [ ] リポジトリから GAS 関連コード・設定が完全撤去される
- [ ] 新システムが本番稼働している
