# 設計決定記録 (Architecture Decision Records)

合意済みの重要な設計判断を ADR 形式で記録する。
コンテキストが失われても再開できるよう、背景・判断理由・代替案を残す。

## ADR 一覧

| ID | タイトル | ステータス | 日付 |
|---|---|---|---|
| ADR-001 | オニオンアーキテクチャ × CQRS 採用 | Accepted | 2026-05 |
| ADR-002 | Spring Data JPA + Persistence Model パターン | Accepted | 2026-05 |
| ADR-003 | ID は UUID v7(アプリ層で生成) | Accepted | 2026-05 |
| ADR-004 | Match を独立集約に分離 | Accepted | 2026-05 |
| ADR-005 | Survey を Web フォーム自前化 | Accepted | 2026-05 |
| ADR-006 | SurveyResponse を独立集約に分離 | Accepted | 2026-05 |
| ADR-007 | イベント作成時のメール送信を廃止 | Accepted | 2026-05 |
| ADR-008 | 論理削除・楽観的ロックを採用しない | Accepted | 2026-05 |
| ADR-009 | 技術スタック最新化 (Spring Boot 4.0.x / Kotlin 2.3 / Node 24 LTS) | Accepted | 2026-05 |
| ADR-010 | Docker 完結開発環境 (ホスト OS に依存ツールを入れない) | Accepted | 2026-05 |
| ADR-011 | DevContainer 採用 | Accepted | 2026-05 |
| ADR-012 | 認証方式は管理者パスワード + 参加コード (AS IS 踏襲) | Accepted | 2026-05 |
| ADR-013 | 幹事を MVP 選出対象から除外 (AS IS 踏襲) | Accepted | 2026-05 |
| ADR-014 | チーム3以上の対戦カードは手動選択 (AS IS 踏襲) | Accepted | 2026-05 |

---

## ADR-001: オニオンアーキテクチャ × CQRS 採用

### ステータス
Accepted

### コンテキスト
DDD を採用することは決定済み。層構成とパフォーマンス戦略を決める必要があった。

### 決定
**オニオンアーキテクチャ**をベースに、Application 層で **CQRS (Command Query Responsibility Segregation)** を適用する。

- 依存方向: 外側(Infrastructure/Presentation) → 内側(Application → Domain) のみ
- Write 経路: 集約 + Repository 経由で整合性保証
- Read 経路: QueryService が JPQL で直接 DTO 射影(集約を経由しない)
- シングルストア方式 (Write/Read 同じ PostgreSQL)
- イベントソーシングは採用しない

### 理由
- 小規模アプリでイベントソーシング・別DB は過剰
- Read 側をドメイン経由にすると JOIN/集計のたびに集約再構築が発生しパフォーマンスが悪化
- CQS を物理的にパッケージ分離することで意図が明確になる
- ArchUnit で境界を機械的に強制できる

### 代替案
- レイヤードアーキテクチャ のみ (Domain から Infrastructure を参照可): 依存方向が逆転し、DDD の原則に反する
- クリーンアーキテクチャ: Onion とほぼ同義だが、層の分離がより細かい。本プロジェクトには過剰

### 参照
- `05-backend-architecture.md`

---

## ADR-002: Spring Data JPA + Persistence Model パターン

### ステータス
Accepted

### コンテキスト
ORM / DB アクセス層の技術選定。初期案は jOOQ だったが、チームの習熟度と国内事例の豊富さから JPA を希望。

### 決定
**Spring Data JPA (Hibernate 6) を採用し、Persistence Model パターン**でドメインモデルと JPA Entity を完全分離する。

- Domain Model: 純粋 Kotlin (`data class`, `val`)、`jakarta.persistence.*` に依存しない
- JPA Entity: `infrastructure.persistence.entity` にのみ配置、`var` フィールド
- 層間は Mapper で明示変換
- `FetchType.LAZY` 基本、必要に応じて明示的にロード
- `spring.jpa.hibernate.ddl-auto=validate` 固定、スキーマは Flyway で管理

### 理由
- 国内事例が豊富で、将来の保守者が参加しやすい
- Persistence Model パターンで分離すれば DDD の純粋性を保てる
- 単純 CRUD の生産性が高い
- チームの習熟度を活かせる
- 複雑クエリは発生しない想定のため JPA の弱点に当たらない

### 代替案
- **jOOQ**: 型安全性と CQRS 適合性は最高だが、国内情報が少ない
- **MyBatis**: SQL 完全制御は強いが、型安全性が弱く XML 分散管理がつらい

### 注意
- 集約ルートの保存は「既存 Entity 取得 → 書き換え → dirty checking に任せる」方式
- N+1 は p6spy + テストで機械的に検出する

### 参照
- `05-backend-architecture.md`

---

## ADR-003: ID は UUID v7 (アプリ層で生成)

### ステータス
Accepted

### コンテキスト
AS IS は UUID 先頭8文字を使用していた。TO BE では衝突リスクと時系列性のバランスを考える必要がある。

### 決定
**UUID v7 を採用し、アプリケーション層で生成する**。

- カラム型: PostgreSQL の `UUID` 型
- 生成: `com.github.f4b6a3:uuid-creator` ライブラリ
- `UuidCreator.getTimeOrderedEpoch()` を使用

### 理由
- UUID v7 は時系列順に並ぶため B-Tree インデックスの断片化を抑制
- 外部公開しても推測困難(セキュリティ)
- アプリ側生成なら Event 作成時に ID を先に決められ、ドメイン層から扱いやすい
- PostgreSQL の `gen_random_uuid()` は v4 のため時系列性なし

### 代替案
- UUID v4: 完全ランダムだが、インデックス断片化が発生
- ULID: v7 と同様の時系列性だが Java エコシステムでの採用例が少ない
- CHAR(8) 継続: 衝突確率が無視できないレベルに上がる可能性

### 参照
- `04-rdb-schema.md`

---

## ADR-004: Match を独立集約に分離

### ステータス
Accepted

### コンテキスト
AS IS では Match は Round の子テーブル扱いだった。TO BE の集約設計で Round 集約の肥大化とマッチ単体更新コストが懸念された。

### 決定
**Round 集約と Match 集約を分離する**。

- Round 集約ルート: `Round`
- Match 集約ルート: `Match` (独立)
- Match から Round への参照は `RoundId` のみ
- 集約をまたぐ不変条件はアプリケーション層 UseCase が保証

### 理由
- Match のスコア更新頻度が高い(ライフサイクルが異なる)
- MVP 評価やハイライト生成などから Match を直接クエリしたい
- Round 単位で毎回子コレクションを再構築するコストが無駄
- DDD 的に「集約は小さく保つ」原則に従う

### 代替案
- Round 集約の子として継続: トランザクション整合性は簡単だが、上記デメリットが残る

### 集約をまたぐ不変条件の保証方針
| 不変条件 | 実装場所 | 実装方法 |
|---|---|---|
| Match 作成時、親 Round が進行中 | `CreateMatchUseCase` | Round を取得して検証 |
| Round 終了時、配下 Match が全て終了 | `FinishRoundUseCase` | `MatchQueryPort.hasOngoingMatchIn(roundId)` を呼ぶ |
| Match 再開時、Round が終了なら進行中に戻す | `ReopenMatchUseCase` | 同一トランザクションで両集約を更新 |

### 参照
- `03-aggregates.md`

---

## ADR-005: Survey を Web フォーム自前化

### ステータス
Accepted

### コンテキスト
AS IS は Google Forms を自動生成して URL を共有する方式。TO BE では「あるべき姿」として検討した結果、アプリ内完結型を選択。

### 決定
**Google Forms 連携を廃止し、アプリ内 Web フォームとして再実装する**。

### 理由
- モバイル体験の向上 (Google Forms は別タブ遷移)
- Salu-Rec ブランドに統一
- 回答取得 API 経由の取り込みが不要になる
- 冪等性管理(再取得時の全削除)が不要
- 重複回答制御を DB の UNIQUE 制約で厳密に担保できる

### 代替案
- 現状維持: Google Forms 連携に運用負荷と権限管理コストが残る
- 両対応: 複雑化、メンテ負荷増

### 参照
- `03-aggregates.md`, `04-rdb-schema.md`

---

## ADR-006: SurveyResponse を独立集約に分離

### ステータス
Accepted

### コンテキスト
AS IS では Survey に全回答が紐づく構造。TO BE でアンケート回答数の増大に対応するため再設計。

### 決定
**SurveyResponse を独立集約とする**。

- Survey 集約: 受付状態 (Open/Closed) のみを管理
- SurveyResponse 集約: 1 回答者からの一括送信として扱う
- SurveyComment: SurveyResponse 集約内の値オブジェクト

### 理由
- Survey 集約の肥大化を回避
- 回答の UNIQUE 制約 (`survey_id + respondent_member_id`) を DB レベルで担保
- 回答者ごとに独立したライフサイクル

### 参照
- `03-aggregates.md`

---

## ADR-007: イベント作成時のメール送信を廃止

### ステータス
Accepted

### コンテキスト
AS IS はイベント作成時に参加コードとアプリURLをメール送信する機能を持つ。運用負荷と TO BE での「あるべき姿」を検討。

### 決定
**メール送信機能を廃止し、参加コードのコピーボタン + QRコード表示 UI に置き換える**。

### 理由
- SMTP 設定、配信性能、バウンス管理の運用負荷を排除
- 現場では口頭/メッセージアプリ共有が主流
- QR コードの方がモバイル時代に適切
- 必要なら後から追加可能

### 参照
- `03-aggregates.md`, `07-migration-plan.md`

---

## ADR-008: 論理削除・楽観的ロックを採用しない

### ステータス
Accepted

### コンテキスト
DDD プロジェクトで一般的な「あるべき」機能の検討。

### 決定
**論理削除 (`deleted_at`) も楽観的ロック (`@Version`) も採用しない**(ハードデリート継続、並行更新制御なし)。

### 理由
- 小規模アプリ(単一管理者運用が中心)で並行更新が発生しにくい
- ハードデリートでも CASCADE DELETE で関連データは一緒に消える
- 監査性はログで補完可能
- 実装・テストコストを下げる

### 将来検討
- 複数管理者運用に拡大した場合は `@Version` の導入を再検討
- 誤操作の多いフェーズに入ったら `deleted_at` の導入も再検討

### 参照
- `04-rdb-schema.md`

---

## ADR-009: 技術スタック最新化

### ステータス
Accepted (2026-05)

### コンテキスト
新規プロジェクトなのでLTS/安定版で始める。

### 決定

| 項目 | バージョン | 根拠 |
|---|---|---|
| Kotlin | **2.3.21** | 2026-04 時点の最新安定版 |
| JDK | **21 (LTS)** | Spring Boot 4.x 要件 (Jakarta EE 10+) |
| Spring Boot | **4.0.6** | 長期運用のため 3.5 系(2026-06 EOS予定) ではなく 4.x を選択 |
| Node.js | **24.x (Active LTS)** | 20.x は 2026-04-30 EOL のため不可 |
| PostgreSQL | **16** | 最新の安定メジャー |
| Next.js | **15.x** | App Router 安定、TypeScript 5.x 対応 |

### 参照
- `00-overview.md`

---

## ADR-010: Docker 完結開発環境

### ステータス
Accepted

### コンテキスト
ホスト OS(Windows)に言語ランタイムやツールをインストールしたくない、という強い要望。チーム再現性・OS 差分の排除・本番環境との一致を優先。

### 決定
**ホスト OS には Docker 以外の開発ツールをインストールしない**。以下を徹底する。

- 全ての開発コマンドは Docker コンテナ内で実行
- Java / Gradle / Kotlin / Node.js / pnpm / psql / Flyway CLI はすべてコンテナ提供
- `./gradlew`, `pnpm` などを直接叩かず、`docker compose exec` 経由で叩く
- 本番デプロイも Docker イメージで行う(同一アーキテクチャで dev/prod 一致)
- ホスト必須: **Docker Engine (Docker Desktop on Windows/Mac、または WSL2 上の Docker)** のみ
- Git はホスト側で OK(多くの開発者が既に入れている / IDE と統合されている)

### 理由
- "It works on my machine" 問題の根絶
- Windows/Mac/Linux で同じ開発体験
- 本番環境と完全同一のランタイム
- 新メンバー参加時のセットアップが `docker compose up` のみ
- 依存ライブラリのホスト汚染ゼロ

### 代替案
- ホストに SDK インストール: バージョン管理ツール (sdkman, nvm, asdf) 必須、OS差分対応が面倒
- Nix / devbox: 強力だが学習コスト高

### 運用ルール
- `build.gradle.kts`, `package.json` 等の設定変更時はコンテナ再ビルド(`docker compose build`)
- 依存追加・変更は必ずコンテナ内で実行 (`docker compose exec backend ./gradlew --refresh-dependencies`)
- IDE は Kiro / VS Code を想定、DevContainer 連携推奨

### 参照
- `08-execution-guide.md`, `11-docker-environment.md`

---

## ADR-011: DevContainer 採用

### ステータス
Accepted

### コンテキスト
Docker 完結環境を採用したが、IDE との統合体験を落としたくない。

### 決定
**VS Code / Kiro の DevContainer 機能を採用する**。

- `.devcontainer/devcontainer.json` で開発環境を宣言
- エディタ・ターミナル・デバッガすべてコンテナ内で動作
- 複数コンテナ(backend + frontend + postgres) を扱うため `dockerComposeFile` ベースで構成
- ホストの IDE 拡張と連動(Kotlin/TS 補完)

### 理由
- コード補完・ジャンプ・デバッガを IDE に統合した状態で Docker 完結を実現
- チームメンバー間で開発環境が完全同一
- Kiro は VS Code 互換なので DevContainer を理解する

### 代替案
- docker-compose のみ: シンプルだがエディタ統合が弱い
- Gitpod / GitHub Codespaces: クラウド依存、コスト発生

### 参照
- `11-docker-environment.md`

---

## ADR-012: 認証方式 (管理者パスワード + 参加コード)

### ステータス
Accepted

### 決定
**AS IS の方式を踏襲する**。

- 管理者: 環境変数 `ADMIN_PASSWORD` によるパスワード認証
- 参加者: 4桁英数字の参加コード (JoinCode)
- JWT (jjwt) をステートレスに発行
- Cookie (httpOnly) で管理

### 理由
- アカウント登録必須にすると仲間内利用のハードルが上がる
- シンプル運用のメリットが大きい

### 将来検討
- 複数管理者が必要になったら Magic Link / Google OAuth 導入

---

## ADR-013: 幹事を MVP 選出対象から除外

### ステータス
Accepted

### 決定
**AS IS 踏襲: 幹事は MVP / 準MVP 選出対象から除外する**。レーティング・称号・コメントは通常通り付与。

### 理由
- 運営者が自分でイベントを開いて自分を MVP に選出するのは不自然
- プロンプトで AI に明示指示することで実現

---

## ADR-014: チーム3以上の対戦カード選択

### ステータス
Accepted

### 決定
**AS IS 踏襲: ユーザーが手動で対戦カードを選ぶ**(自動生成はしない)。

### 理由
- 総当たり / 順番固定 / ランダムなど好みが分かれる
- 現場の柔軟性を優先
- 必要なら将来「総当たり自動生成」ボタンをおまけ追加
