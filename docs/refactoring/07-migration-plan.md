# 段階的マイグレーション計画 (TO BE)

## 基本方針

**既存のGAS版は触らない。新環境を並行構築し、機能パリティを達成してから完全移行する。**

- 既存 `src/` ディレクトリと `clasp` デプロイは維持
- 新規コードは `backend/` と `frontend/` に追加
- データ移行は不要 (ユーザー要件)
- ホスティング先は未定のため、まずローカル完結で実装を進める

## TO BE の主要変更点

| 項目 | AS IS | TO BE |
|---|---|---|
| ID | UUID先頭8文字 | UUID v7 |
| Match | Round 集約の子 | **独立集約** |
| Survey | Google Forms 連携 | **アプリ内 Webフォーム** |
| SurveyResponse | Survey 子 | 独立集約 |
| Event作成時メール | あり | **廃止**(QR/コピーUIに置換) |
| 楽観的ロック | なし | なし(見送り) |
| 論理削除 | なし | なし(ハードデリート継続) |

## フェーズ分け

### Phase 0: プロジェクト基盤整備 (1日)

**ゴール**: Monorepo化、Docker Compose、空の backend/frontend が起動する

| タスク | 成果物 |
|---|---|
| pnpm workspace 設定 | `package.json` (root), `pnpm-workspace.yaml` |
| Docker Compose で PostgreSQL 16 | `docker-compose.yml` |
| backend: Spring Boot 空プロジェクト | Hello World API |
| frontend: Next.js 空プロジェクト | Hello World ページ |
| `.gitignore` 更新 | 新規ディレクトリ対応 |
| README を更新 | 新構成の説明(旧READMEは `docs/legacy-readme.md` に退避) |

### Phase 1: ウォーキングスケルトン (2〜3日) ★重要

**ゴール**: Event集約だけを貫通実装。認証なしでイベント作成→一覧が動く。

| タスク | 成果物 |
|---|---|
| Flyway V1 マイグレーション (events テーブルのみ) | `V1__init_events.sql` |
| Shared Kernel 整備 | `EntityId`, `IdGenerator`, `UuidV7IdGenerator`, `Clock`, `DomainEvent(Publisher)` |
| Event ドメインモデル | `Event.kt`, `EventId.kt`, `JoinCode.kt`, `EventStatus.kt`, `EventName.kt` |
| Event Repository + JPA 実装 | Domain I/F + `EventJpaEntity` + `EventRepositoryImpl` + `EventEntityMapper` |
| Command UseCase | `CreateEventUseCase` |
| Query Service | `EventQueryService` + JPQL射影実装 |
| Controller | `EventCommandController` / `EventQueryController` |
| 共通例外ハンドラ | `GlobalExceptionHandler` |
| ArchUnit テスト | レイヤー依存ルール検証 |
| Testcontainers セットアップ | Event Repository / QueryService の結合テスト |
| OpenAPI スキーマ確認 | `/v3/api-docs` が動く |
| frontend: 型生成スクリプト | `pnpm gen:api` |
| frontend: イベント一覧ページ | `/events` で表示 |
| frontend: イベント作成フォーム | `/events/new` で作成 |

**このフェーズで確立する原則を後のフェーズに適用する**:
- オニオン × CQRS のレイヤー構成テンプレート
- Domain ⇄ JPA Entity の Mapper 書き方
- ArchUnit テストの書き方
- OpenAPI 生成 → TypeScript 型生成フロー
- エラーレスポンス形式

### Phase 2: 認証基盤 (2日)

**ゴール**: 管理者パスワードログインとイベントコードログインが動く。JWT 発行・検証。

| タスク | 成果物 |
|---|---|
| Spring Security 設定 | `SecurityConfig.kt` |
| JWT 発行 (jjwt) | `JwtTokenProvider.kt` |
| AuthController | `POST /api/auth/login-admin`, `POST /api/auth/login-with-code` |
| JWT Filter | `JwtAuthenticationFilter.kt` |
| 既存 Event API に `@PreAuthorize` 付与 | |
| frontend: ログイン画面 | `/login` (管理者パスワード or イベントコード) |
| frontend: Cookie管理 | Route Handler で `Set-Cookie: salurec_token; HttpOnly; Secure; SameSite=Lax` |
| frontend: ルートガード | `(admin)/layout.tsx` |

### Phase 3: Event コンテキスト完成 (2日)

| タスク |
|---|
| イベント詳細取得API (Query) |
| ステータス遷移API (`start`, `finish`, `reopen`) |
| 参加コード重複チェック |
| frontend: イベント詳細画面の雛形 |
| frontend: **参加コードコピーボタン + QRコード表示** (メール送信置換) |

### Phase 4: Member コンテキスト (2日)

| タスク |
|---|
| members テーブル Flyway V2 |
| Member ドメイン (含む enthusiasm) / Repository / UseCase |
| MemberCommandController (CRUD + 一括登録) |
| MemberQueryController / QueryService |
| Event との連携 (幹事の自動登録: `CreateEventUseCase` から `MemberRegistrationPort` 呼出) |
| 一般ユーザー向け「意気込み」編集API |
| frontend: メンバー管理タブ |
| frontend: 意気込み編集モーダル (本人のみ) |

### Phase 5: Match Operation コンテキスト (5〜7日) ★大物

Match を独立集約にしたことで Round と Match は別のユースケースに分離する。

| タスク |
|---|
| rounds, matches, match_participants, goals テーブル Flyway V3 |
| Round 集約 & Round Repository/QueryService |
| Match 集約 & Match Repository/QueryService (独立) |
| TeamSplitService ドメインサービス (経験者/未経験者シャッフル + ラウンドロビン) |
| **集約またぎの整合性**: `FinishRoundUseCase` が `MatchQueryPort.hasOngoingMatchIn(roundId)` を呼ぶ |
| **集約またぎの整合性**: `ReopenMatchUseCase` が Round を同時に進行中に戻す |
| ラウンド作成・終了・再開 API |
| マッチ作成・終了・再開 API |
| 得点記録 API (endMatchに含める) |
| 助っ人追加 API |
| frontend: チーム分けUI (AI / ランダム) |
| frontend: 3チーム以上の対戦カード選択UI |
| frontend: 試合記録UI (得点ボタン) |
| frontend: タイマー機能 (クライアント完結) |

### Phase 6: MVP Evaluation コンテキスト (3日)

| タスク |
|---|
| mvp_evaluations, mvp_player_ratings テーブル Flyway V4 |
| Gemini Client 実装 (`com.salurec.mvp.infrastructure.gateway.GeminiClient`) |
| SelectMvpUseCase |
| MatchQueryPort / MemberQueryPort / SurveyQueryPort (他コンテキスト向けI/F) |
| MVP 結果 QueryService |
| frontend: MVP選出UI (mvpCount / runnerUpCount 指定) |
| frontend: MVP結果表示 (レーティング、称号、コメント) |

### Phase 7: Survey コンテキスト (TO BE: Webフォーム自前化) (4日)

**AS IS の 3日 → TO BE の 4日に拡大**(Google Forms 連携削除 + 自前フォーム実装)

| タスク |
|---|
| surveys, survey_responses, survey_comments テーブル Flyway V5 |
| Survey 集約 & SurveyResponse 集約 (独立) |
| Open/Close ステータス管理 |
| アンケート回答 API (匿名/記名対応) |
| アンケート集計 Query (対象メンバー別コメント一覧) |
| frontend: アンケート画面 (全メンバー分のコメント入力欄) |
| frontend: 管理者向け締切操作 |
| frontend: 回答状況の可視化 (回答済みメンバーの表示) |

### Phase 8: 残りの機能 + デプロイ (3〜5日)

| タスク |
|---|
| 既存GAS版の機能をすべてカバーしたか検証 (ユビキタス言語辞書とチェックリスト照合) |
| スタッツ表示 (レーティング) 統合 |
| ハイライト生成 (既存 AS IS は未実装。TO BE で追加する場合 Phase 8 に組み込み) |
| 本番デプロイ先の選定・構築 |
| ドメイン取得・SSL |
| 本番DB構築 |
| GitHub Actions で自動デプロイ |

### Phase 9: 旧システム停止 (1日)

| タスク |
|---|
| 旧GASアプリの停止通知 |
| `src/` 以下を `legacy/gas/` に移動 (参照用) |
| README を新構成に完全置き換え |
| `.clasp.json` と `deploy-gas.yml` を削除 |

## 合計見積

約 26〜32日 (実働。1日=集中できる作業日として換算)
AS IS → TO BE 化によって Phase 7 が +1日、AS IS 未実装機能の吸収で ±2日のばらつき。

## チェックリスト

各フェーズ完了時に以下を確認。

- [ ] ドメイン層にフレームワーク依存がないか (ArchUnit テストがグリーン)
- [ ] JPA Entity が `infrastructure.persistence.entity` 以外に存在しないか
- [ ] Controller がビジネスロジックを持っていないか
- [ ] Command と Query が相互依存していないか (ArchUnit)
- [ ] テスト (単体 + 結合 + N+1 検出) がグリーンか
- [ ] OpenAPI スキーマが生成されているか
- [ ] frontend の型生成 (`pnpm gen:api`) が通るか
- [ ] 新規エンドポイントに `@PreAuthorize` があるか
- [ ] エラー形式が共通フォーマットに準拠しているか
- [ ] ユビキタス言語辞書に用語が追加されているか (新規導入時)

## リスクと対応

| リスク | 対応 |
|---|---|
| Phase 5 (Match Operation) の集約またぎ整合性が複雑化 | UseCase 単位でトランザクション境界を分かりやすく書く。統合テストを厚めに |
| Phase 7 Webフォーム自前化で工数超過 | Phase 7 をさらに分割 (基本フォーム → 集計ビュー → 管理画面) |
| Gemini API のコスト上昇 | モデル選択 (Flash-Lite) + プロンプトキャッシュの検討 |
| ホスティング選定で詰まる | Phase 8 まではローカル完結でOK。選定は最後に |
| 新旧並行期間のデータ整合性 | 新システムへの移行はきっぱりカットオーバー(データ移行不要なので容易) |

## 次のアクション (Phase 0 の具体的手順)

1. `package.json` / `pnpm-workspace.yaml` を作成
2. `docker-compose.yml` を作成 (PostgreSQL 16)
3. `backend/` 配下に Spring Boot 初期化 (Gradle Kotlin DSL)
4. `frontend/` 配下に Next.js 初期化 (`pnpm create next-app`)
5. `.gitignore` 更新
6. README を新構成で書き直し (既存内容は `docs/legacy-readme.md` に退避)
7. CIは既存の `deploy-gas.yml` をそのまま維持 (まだGAS版を動かすため)
