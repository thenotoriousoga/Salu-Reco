# ユビキタス言語

ドメインエキスパート(=ユーザー/運営)と開発者で共通して使う用語を整理する。
コード内の型名・API パス・DB テーブル名は、原則としてこの辞書に準拠する。

## 用語辞書

### 日本語(業務用語) / English(コード識別子) の対応表

| 業務用語 | コード識別子 | 説明 |
|---|---|---|
| イベント | `Event` | 1回のフットサルイベント。全てのデータはイベント単位で管理される |
| イベントステータス | `EventStatus` | `Preparing` / `InProgress` / `Finished` の3状態 |
| 参加コード | `JoinCode` | 4桁(枯渇時は5桁)の英数字。一般ユーザーがイベントに参加するためのコード。紛らわしい文字(0/O, 1/I/L)を除外 |
| 幹事 | `Organizer` | イベント作成者、または参加メンバーのうち幹事フラグが `true` のもの。運営権限を持つ |
| 管理者 | `Administrator` | パスワード認証でログインする全体管理者。全イベント横断で操作可能 |
| 一般ユーザー | `Participant` / `User` | 参加コードで参加した閲覧/操作ユーザー |
| ロール | `Role` | `ADMIN` / `USER` の2値。幹事はイベント文脈内では `ADMIN` として扱う |
| メンバー | `Member` | イベントの参加者。イベントに紐づく(イベントを横断しない) |
| 年次 | `SeniorityYear` | 新卒からの年数(1〜)。年次はメンバー属性 |
| サッカー経験 | `SoccerExperience` | `Experienced`(あり) / `Inexperienced`(なし) |
| 幹事フラグ | `IsOrganizer` | メンバーが幹事かどうか |
| 意気込み | `Enthusiasm` | メンバー本人が入力する一言(50文字以内) |
| ラウンド | `Round` | チーム分けの単位。イベント内で1〜N回繰り返される |
| ラウンドステータス | `RoundStatus` | `InProgress` / `Finished` |
| チーム分け | `TeamAssignment` | Nチーム(2〜最大)への割り振り結果。名前と所属メンバーIDを保持 |
| チーム | `Team` | ラウンド内のチーム。名前とメンバーで構成 |
| チーム名 | `TeamName` | チームの名前(1〜10文字) |
| マッチ | `Match` | 2チーム対戦。**独立集約**。Round ID で参照 |
| マッチステータス | `MatchStatus` | `InProgress` / `Finished` |
| マッチメンバー | `MatchParticipant` | マッチに出場するメンバー + 所属チーム(A/B) + 助っ人フラグ |
| 助っ人 | `Substitute` | 所属チーム外の試合に参戦したメンバー |
| 得点 | `Goal` | マッチ内で発生した1得点。得点者/チーム/種別(通常/オウンゴール/不明)を記録 |
| 得点種別 | `GoalType` | `Normal` / `OwnGoal` / `Unknown` |
| スコア | `Score` | マッチの得点集計(チームA得点数、チームB得点数) |
| 勝敗 | `MatchResult` | `TeamAWin` / `TeamBWin` / `Draw` |
| アンケート | `Survey` | イベントに紐づく回答受付管理。**アプリ内Webフォーム**(TO BE) |
| アンケートステータス | `SurveyStatus` | `Open`(受付中) / `Closed`(締切) |
| アンケート回答 | `SurveyResponse` | 1回答者からの一括送信。**独立集約**(TO BE) |
| 回答内のコメント | `SurveyComment` | 対象メンバー1人あたり1コメント(SurveyResponse内の値オブジェクト) |
| MVP選出 | `MvpSelection` | Gemini AIによる総合評価プロセス |
| MVP結果 | `MvpEvaluation` | 選出結果(全員分のレーティング+MVP/準MVP順位) |
| 総合スコア | `TotalScore` | AIが算出する0〜100点の整数 |
| レーティング | `Rating` | AIが算出する0.0〜10.0の小数(小数第一位) |
| 順位 | `MvpRank` | `MVP` / `RunnerUp`(準MVP) / `None` |
| 称号 | `Title` | 全員に付与されるテキストラベル(例: ゴールハンター) |

## 名前の付け方ルール

### Kotlin (サーバー)

- **集約ルート/エンティティ/値オブジェクト**: UpperCamelCase の英語名 (例: `Event`, `JoinCode`)
- **ID 型**: `<集約名>Id` (例: `EventId`, `MemberId`) 。全て値オブジェクト、内部値は `UUID` (v7)
- **ドメインイベント**: `<集約名><動詞の過去分詞>` (例: `EventStarted`, `MatchFinished`)
- **リポジトリ**: `<集約名>Repository`
- **ユースケース/アプリケーションサービス**: `<動詞><名詞>UseCase` (例: `CreateEventUseCase`, `SelectMvpUseCase`)

### TypeScript (クライアント)

- 型: UpperCamelCase (例: `Event`, `Member`)
- 関数: camelCase (例: `createEvent`, `fetchEvent`)
- React コンポーネント: UpperCamelCase (例: `EventList`, `MatchCard`)
- Server Actions / API 関数: `<verb><Noun>` (例: `createEvent`, `endMatch`)

### DB (PostgreSQL)

- テーブル名: snake_case 複数形 (例: `events`, `match_participants`)
- カラム名: snake_case (例: `event_id`, `created_at`)
- インデックス: `idx_<テーブル>_<カラム>` (例: `idx_members_event_id`)
- 外部キー制約: `fk_<子テーブル>_<親テーブル>` (例: `fk_members_events`)

### API (REST)

- パス: kebab-case 複数形 (例: `/api/events`, `/api/events/{id}/rounds`)
- クエリ: camelCase (例: `?eventId=xxx`)
- JSON キー: camelCase (例: `{ "eventId": "xxx", "joinCode": "ABCD" }`)

## 既存用語との対応

GAS 時代のスプレッドシートカラム名との対応表。移行作業時に参照する。

| GAS(スプレッドシート) | 新システム(ドメインモデル) |
|---|---|
| イベントID | `Event.id` (EventId, UUID v7) |
| コード | `Event.joinCode` (JoinCode) |
| ステータス (イベント) | `Event.status` (EventStatus) |
| フォームURL / フォームID | (廃止。Survey コンテキストへ責務移管、Webフォーム自前化のため不要) |
| メンバーID | `Member.id` (MemberId, UUID v7) |
| サッカー経験 (あり/なし) | `Member.soccerExperience` (Experienced/Inexperienced) |
| 幹事 (はい/いいえ) | `Member.isOrganizer` (Boolean) |
| 意気込み | `Member.enthusiasm` (String, 50文字以内) |
| ラウンドID | `Round.id` (RoundId, UUID v7) |
| チーム分けJSON | `Round.teamAssignment` (値オブジェクト, JSONB保存) |
| マッチID | `Match.id` (MatchId, UUID v7) — **独立集約に昇格** |
| チームA名/チームB名 | `Match.teamAName` / `Match.teamBName` (TeamName VO) |
| 助っ人 (はい/いいえ) | `MatchParticipant.isSubstitute` (Boolean) |
| 得点ID / 種別 | `Goal.id` / `Goal.type` (GoalType) |

## ID 生成方針

- 全ての集約ルート・エンティティの ID は **UUID v7** を採用
- 生成はアプリ層(`shared.infrastructure.UuidV7IdGenerator`)
- DB カラム型は PostgreSQL の `UUID` 型
- 利点: 時系列順に並ぶため B-Tree インデックスの断片化を抑制、外部公開しても推測困難
- 使用ライブラリ: [`com.github.f4b6a3:uuid-creator`](https://github.com/f4b6a3/uuid-creator)

## 注意事項

- UIの表示テキストは従来通り日本語を維持する(ユーザーが慣れているため)
- コード内ドキュメント(JSDoc/KDoc)やコミットメッセージは日本語でもOK
- 新規用語を導入する場合は必ずこのファイルに追記すること
