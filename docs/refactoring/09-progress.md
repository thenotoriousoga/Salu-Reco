# 進捗チェックリスト

**再開時はこのファイルを最初に開いてください**。

チェックが入っていないタスクの最初のものが、次にやるべき作業です。
各タスクの詳細手順は `08-execution-guide.md` 参照。

---

## 全体ステータス

| Phase | 状態 | 備考 |
|---|---|---|
| Phase 0: プロジェクト基盤整備 | **未着手** | 次はここから |
| Phase 1: ウォーキングスケルトン (Event) | 未着手 | |
| Phase 2: 認証基盤 | 未着手 | |
| Phase 3: Event コンテキスト完成 | 未着手 | |
| Phase 4: Member コンテキスト | 未着手 | |
| Phase 5: Match Operation (Round + Match 独立集約) | 未着手 | |
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

## Phase 0: プロジェクト基盤整備

### 0-1. ルート設定ファイル
- [ ] `package.json` (workspace root) 作成
- [ ] `pnpm-workspace.yaml` 作成
- [ ] `.gitignore` 更新 (新規ディレクトリ対応)
- [ ] `.dockerignore` 作成
- [ ] `.env.example` 作成

### 0-2. Docker 環境
- [ ] `docker-compose.yml` 作成
- [ ] `docker/dev.Dockerfile` 作成
- [ ] `docker/backend.Dockerfile` 作成
- [ ] `docker/frontend.Dockerfile` 作成
- [ ] `docker/postgres/init.sql` 作成(空でOK)
- [ ] `.devcontainer/devcontainer.json` 作成
- [ ] `docker compose build` が成功する

### 0-3. Backend 骨組み
- [ ] `backend/settings.gradle.kts` 作成
- [ ] `backend/build.gradle.kts` 作成
- [ ] Gradle ラッパー生成 (`gradle:8.14-jdk21` コンテナで)
- [ ] `backend/src/main/kotlin/com/salurec/SaluRecApplication.kt` 作成
- [ ] `backend/src/main/resources/application.yml` 作成

### 0-4. Frontend 骨組み
- [ ] `pnpm create next-app` で frontend/ 初期化
- [ ] 必要な依存追加 (TanStack Query, Zod, openapi-typescript, etc.)

### 0-5. 初回起動確認
- [ ] `docker compose up -d` で全サービスが起動する
- [ ] `curl http://localhost:8080/actuator/health` が `UP` を返す
- [ ] http://localhost:3000 で Next.js ページが表示される
- [ ] PostgreSQL に psql で接続できる

### 0-6. README / AGENTS.md 整備
- [ ] 旧 README を `docs/legacy-readme.md` に退避
- [ ] 新 README 作成 (Docker 起動手順)
- [ ] `AGENTS.md` をリプレース後のモノレポ構成に合わせて更新

### 0-7. CI 追加 (任意)
- [ ] `.github/workflows/ci.yml` 作成 (backend/frontend テスト)

### Phase 0 完了条件

- [ ] `docker compose down -v && docker compose up -d` で問題なく再起動
- [ ] backend/frontend ともに Docker 内でホットリロードする
- [ ] ホスト OS に追加インストール不要を確認(Docker のみで完結)

---

## Phase 1: ウォーキングスケルトン (Event 集約貫通)

### 1-1. Shared Kernel
- [ ] `shared/domain/EntityId.kt`
- [ ] `shared/domain/DomainEvent.kt`
- [ ] `shared/domain/DomainEventPublisher.kt`
- [ ] `shared/domain/DomainException.kt`
- [ ] `shared/domain/IdGenerator.kt`
- [ ] `shared/domain/Clock.kt`
- [ ] `shared/infrastructure/UuidV7IdGenerator.kt`
- [ ] `shared/infrastructure/SystemClock.kt`
- [ ] `shared/infrastructure/SpringDomainEventPublisher.kt`
- [ ] `shared/web/GlobalExceptionHandler.kt`
- [ ] `shared/web/ApiErrorResponse.kt`

### 1-2. Flyway マイグレーション
- [ ] `V1__init_events.sql` 作成
- [ ] 起動時に自動適用されることを確認

### 1-3. Event Domain 層
- [ ] `event/domain/model/EventId.kt`
- [ ] `event/domain/model/EventName.kt`
- [ ] `event/domain/model/EventStatus.kt`
- [ ] `event/domain/model/JoinCode.kt`
- [ ] `event/domain/model/Event.kt`
- [ ] `event/domain/repository/EventRepository.kt`
- [ ] `event/domain/service/JoinCodeGenerator.kt`
- [ ] `event/domain/event/EventCreated.kt`

### 1-4. Event Application 層 (Command + Query)
- [ ] `event/application/command/command/CreateEventCommand.kt`
- [ ] `event/application/command/result/CreateEventResult.kt`
- [ ] `event/application/command/usecase/CreateEventUseCase.kt`
- [ ] `event/application/query/dto/EventListItemDto.kt`
- [ ] `event/application/query/service/EventQueryService.kt`

### 1-5. Event Infrastructure 層
- [ ] `event/infrastructure/persistence/entity/EventJpaEntity.kt`
- [ ] `event/infrastructure/persistence/repository/EventJpaRepository.kt`
- [ ] `event/infrastructure/persistence/repository/EventRepositoryImpl.kt`
- [ ] `event/infrastructure/persistence/query/EventQueryServiceImpl.kt`
- [ ] `event/infrastructure/persistence/mapper/EventEntityMapper.kt`
- [ ] `event/infrastructure/service/JoinCodeGeneratorImpl.kt`

### 1-6. Event Presentation 層
- [ ] `event/presentation/controller/EventCommandController.kt`
- [ ] `event/presentation/controller/EventQueryController.kt`
- [ ] `event/presentation/dto/request/CreateEventRequest.kt`
- [ ] `event/presentation/dto/response/CreateEventResponse.kt`
- [ ] `event/presentation/dto/response/EventListResponse.kt`

### 1-7. テスト
- [ ] ArchUnit テスト (レイヤー依存、JPA Entity 配置、Command/Query 分離)
- [ ] `Event` ドメインモデルの単体テスト (Kotest)
- [ ] `CreateEventUseCase` の単体テスト (MockK)
- [ ] `EventRepositoryImpl` の結合テスト (Testcontainers)
- [ ] `EventQueryServiceImpl` の結合テスト
- [ ] `EventCommandController` の API テスト

### 1-8. OpenAPI 連携
- [ ] `/v3/api-docs` が返ることを確認
- [ ] `pnpm gen:api` で `schema.ts` が生成される

### 1-9. Frontend (Phase 1 最小)
- [ ] `app/page.tsx` で `/events` にリダイレクト
- [ ] `app/events/page.tsx` でイベント一覧を表示
- [ ] `app/events/new/page.tsx` でイベント作成フォーム
- [ ] `shared/api/client.ts` の openapi-fetch クライアント

### Phase 1 完了条件
- [ ] フロントからイベント作成できる
- [ ] 作成したイベントが一覧に表示される
- [ ] backend の全テストが通る
- [ ] ArchUnit のレイヤー境界テストが通る

---

## Phase 2: 認証基盤

(Phase 1 完了時に詳細を追記)

### 概要タスク
- [ ] `SecurityConfig.kt` (Spring Security)
- [ ] `JwtTokenProvider.kt`
- [ ] `JwtAuthenticationFilter.kt`
- [ ] Identity コンテキスト: `AuthController` (login-admin, login-with-code)
- [ ] 既存 Event API に `@PreAuthorize` を付与
- [ ] Frontend: `/login` ページ + Route Handler で Set-Cookie
- [ ] Frontend: `(admin)/layout.tsx` で認証ガード

### Phase 2 完了条件
- [ ] 管理者パスワードでログインできる
- [ ] 参加コードでログインできる
- [ ] 未認証で API 叩くと 401 が返る

---

## Phase 3: Event コンテキスト完成

### 概要タスク
- [ ] Event 詳細取得 Query
- [ ] ステータス遷移: `start` / `finish` / `reopen`
- [ ] 参加コード重複チェック (UseCase レベル)
- [ ] Frontend: イベント詳細画面の雛形
- [ ] Frontend: 参加コードコピーボタン + QRコード表示

### Phase 3 完了条件
- [ ] 3 状態 (Preparing / InProgress / Finished) の遷移が API 経由で動く
- [ ] QRコードが Event 詳細画面に表示される

---

## Phase 4: Member コンテキスト

### 概要タスク
- [ ] Flyway V2: members テーブル
- [ ] Member ドメイン (含む `enthusiasm`)
- [ ] MemberRegistrationPort の実装 (Adapter 経由)
- [ ] `CreateEventUseCase` から呼び出すよう Phase 1 の Event を拡張
- [ ] 一括登録 UseCase
- [ ] 意気込み編集 API (本人のみ)
- [ ] Frontend: メンバー管理タブ
- [ ] Frontend: 意気込み編集モーダル

### Phase 4 完了条件
- [ ] イベント作成時に幹事メンバーが自動登録される
- [ ] メンバーの一括登録が動く
- [ ] 意気込みを本人のみ編集できる

---

## Phase 5: Match Operation (Round + Match 独立集約)

### 概要タスク
- [ ] Flyway V3: rounds, matches, match_participants, goals
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
