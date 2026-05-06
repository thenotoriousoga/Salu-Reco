# 集約設計 (TO BE)

各コンテキストの集約、エンティティ、値オブジェクトと不変条件をまとめる。

## 設計方針

- **集約は小さく**: トランザクション整合性が必要な範囲のみを集約にまとめる
- **集約をまたぐ参照は ID のみ**: 他集約のエンティティは直接保持しない
- **不変条件は集約ルートが守る**: 外部からのデータ変更はルート経由のみ
- **値オブジェクトは不変**: `data class` + `val` プロパティで表現
- **集約ルートから子エンティティへの参照のみ許可**: 子→親の双方向参照はしない
- **集約をまたぐ不変条件はアプリケーション層 UseCase が保証**する
- **ID は UUID v7** を採用。時系列順に並ぶため B-Tree インデックスの断片化を抑制

---

## Event コンテキスト

### Event (集約ルート)

```
Event (AggregateRoot)
├── id: EventId (ValueObject: UUID v7)
├── name: EventName (ValueObject)
├── date: LocalDate
├── status: EventStatus (Enum: Preparing / InProgress / Finished)
└── joinCode: JoinCode (ValueObject)
```

#### 設計差分 (AS IS → TO BE)

- `surveyFormUrl`, `surveyFormId` を Event から削除。Survey コンテキストが自己管理する
- メール送信機能を廃止したため `organizerEmail` 等は持たない

#### 値オブジェクト

- **EventId**: UUID v7。文字列(36文字)として保持
- **EventName**: 1文字以上100文字以下の文字列
- **JoinCode**: 紛らわしい文字 (0/O, 1/I/L) を除く 4〜5文字の英数字
  - `JoinCode.generate(): JoinCode` で自動生成
  - `JoinCode.from(raw: String)` で検証付き変換 (ユーザー入力用)

#### 不変条件

| 条件 | 違反時の挙動 |
|---|---|
| `name` は空文字禁止 | インスタンス化時に `IllegalArgumentException` |
| `date` は null 禁止 | 同上 |
| `joinCode` は一意 | リポジトリレベルで UNIQUE制約 + 作成時の重複チェック |
| `status` 遷移: `Preparing → InProgress → Finished ⇄ InProgress` のみ | `start()`, `finish()`, `reopen()` メソッドで厳密に遷移制御 |

#### 振る舞い (ドメインメソッド)

```kotlin
class Event(...) {
    fun start(memberCount: Int): Event {
        check(status == EventStatus.Preparing) { "準備中のイベントのみ開始できます" }
        require(memberCount >= 2) { "メンバーを2名以上登録してください" }
        return copy(status = EventStatus.InProgress)
    }

    fun finish(roundCount: Int, hasOngoingRound: Boolean): Event {
        check(status == EventStatus.InProgress) { "進行中のイベントのみ終了できます" }
        require(roundCount > 0) { "ラウンドがありません" }
        require(!hasOngoingRound) { "進行中のラウンドがあります" }
        return copy(status = EventStatus.Finished)
    }

    fun reopen(): Event {
        check(status == EventStatus.Finished) { "イベント終了状態のイベントのみ再開できます" }
        return copy(status = EventStatus.InProgress)
    }
}
```

**注意**: `memberCount` や `hasOngoingRound` はアプリケーションサービスが他コンテキストから取得して Event に渡す。Event は他テーブルを参照しない。

#### ドメインイベント

- `EventCreated(eventId, createdBy)`
- `EventStarted(eventId)`
- `EventFinished(eventId)` → MVP Evaluation 側で「選出可能」状態を認知
- `EventReopened(eventId)`

---

## Member コンテキスト

### Member (集約ルート)

```
Member (AggregateRoot)
├── id: MemberId
├── eventId: EventId                            他集約への参照はIDのみ
├── name: MemberName
├── seniorityYear: Int (1以上)
├── soccerExperience: SoccerExperience (Enum)
├── isOrganizer: Boolean
├── note: String                                自由記述
└── enthusiasm: String                          意気込み (メンバー本人が更新)
```

#### 設計差分 (AS IS → TO BE)

- `enthusiasm` (意気込み) を維持
- 年次・サッカー経験は維持
- 将来的な「イベントごとの任意項目設定」機能を見越したスキーマ拡張は今回スコープ外

#### 値オブジェクト

- **MemberId**: UUID v7
- **MemberName**: 1〜50文字
- **SoccerExperience**: Enum `Experienced / Inexperienced`

#### 不変条件

- `seniorityYear >= 1`
- `name` は空文字禁止
- `enthusiasm` は 50文字以内
- 同一 `eventId` 内で `name` 重複は許可(現実にはあり得る)

#### 振る舞い

```kotlin
class Member(...) {
    fun rename(newName: MemberName): Member = copy(name = newName)
    fun updateExperience(exp: SoccerExperience): Member = copy(soccerExperience = exp)
    fun markAsOrganizer(): Member = copy(isOrganizer = true)
    fun unmarkAsOrganizer(): Member = copy(isOrganizer = false)
    fun updateEnthusiasm(text: String): Member {
        require(text.length <= 50) { "意気込みは50文字以内です" }
        return copy(enthusiasm = text)
    }
    fun updateNote(text: String): Member = copy(note = text)
}
```

#### ドメインイベント

- `MemberRegistered(memberId, eventId)`
- `MemberUpdated(memberId)`
- `OrganizerRegistered(memberId, eventId)` ← Event作成時の初期メンバー登録

---

## Match Operation コンテキスト

このコンテキストは **Round と Match を独立集約に分離**する(TO BE 変更)。
理由:
- Round と Match は異なるライフサイクルを持つ(Match は Round 進行中に複数回作成される)
- Match のスコア更新頻度が高く、Round 全体を再構築するコストが無駄
- Match を他の集約(MVP評価のクエリ対象、ハイライト生成など)から直接参照したい

集約境界をまたぐ整合性は **アプリケーション層の UseCase** が担保する。

### Round (集約ルート)

```
Round (AggregateRoot)
├── id: RoundId
├── eventId: EventId
├── roundNumber: Int                         イベント内連番
├── status: RoundStatus (InProgress / Finished)
└── teamAssignment: TeamAssignment (ValueObject)
```

### TeamAssignment (値オブジェクト)

```
TeamAssignment (ValueObject)
└── teams: List<Team>

Team (ValueObject)
├── name: TeamName
└── memberIds: List<MemberId>
```

不変条件:
- `teams.size >= 2`
- 各チームのメンバー数は 3 以上
- チーム名は空文字禁止、10文字以内

### Round の振る舞い

```kotlin
class Round(...) {
    fun finish(hasOngoingMatch: Boolean): Round {
        check(status == RoundStatus.InProgress) { "進行中のラウンドのみ終了できます" }
        require(!hasOngoingMatch) { "進行中の試合があります。先に試合を終了してください" }
        return copy(status = RoundStatus.Finished)
    }

    fun reopen(): Round {
        check(status == RoundStatus.Finished) { "終了状態のラウンドのみ再開できます" }
        return copy(status = RoundStatus.InProgress)
    }
}
```

**重要**: `hasOngoingMatch` はアプリケーション層が `MatchQueryPort.hasOngoingMatchIn(roundId)` で取得して渡す。Round は Match を参照しない。

### ドメインイベント

- `RoundCreated(roundId, eventId)`
- `RoundFinished(roundId)`
- `RoundReopened(roundId)`

---

### Match (独立集約ルート)

```
Match (AggregateRoot)
├── id: MatchId
├── roundId: RoundId                          他集約への参照はIDのみ
├── matchNumber: Int
├── teamAName: TeamName
├── teamBName: TeamName
├── status: MatchStatus (InProgress / Finished)
├── participants: List<MatchParticipant>      集約内の値オブジェクト
└── goals: List<Goal>                         集約内の値オブジェクト
```

### MatchParticipant (値オブジェクト)

```
MatchParticipant (ValueObject)
├── memberId: MemberId
├── team: MatchTeam (Enum: A / B)
└── isSubstitute: Boolean                     助っ人フラグ
```

### Goal (値オブジェクト、IDを持つ値オブジェクト)

```
Goal (ValueObject)
├── id: GoalId                                UIでの削除/編集で必要なのでID保持
├── team: MatchTeam
├── scorerId: MemberId?                       オウンゴール/不明の場合は null
└── type: GoalType (Normal / OwnGoal / Unknown)
```

### Match の不変条件

- `participants` の `memberId` は重複しない
- `Goal.type == Normal` の場合、`scorerId` は必須
- `Goal.type == OwnGoal | Unknown` の場合、`scorerId` は null
- `status == Finished` のとき、新規 Goal の追加はできない(再開後のみ可)

### Match の振る舞い

```kotlin
class Match(...) {
    fun recordGoal(goal: Goal): Match {
        check(status == MatchStatus.InProgress) { "進行中の試合のみ得点記録できます" }
        return copy(goals = goals + goal)
    }

    fun removeGoal(goalId: GoalId): Match {
        check(status == MatchStatus.InProgress) { "進行中の試合のみ編集できます" }
        return copy(goals = goals.filterNot { it.id == goalId })
    }

    fun addSubstitute(memberId: MemberId, team: MatchTeam): Match {
        check(status == MatchStatus.InProgress) { "進行中の試合のみ助っ人を追加できます" }
        require(participants.none { it.memberId == memberId }) { "既に出場しているメンバーです" }
        return copy(participants = participants + MatchParticipant(memberId, team, isSubstitute = true))
    }

    fun finish(goals: List<Goal>, newSubs: List<MatchParticipant>): Match {
        check(status == MatchStatus.InProgress) { "進行中の試合のみ終了できます" }
        return copy(
            status = MatchStatus.Finished,
            goals = goals,
            participants = participants + newSubs,
        )
    }

    fun reopen(): Match {
        check(status == MatchStatus.Finished) { "終了状態の試合のみ再開できます" }
        return copy(status = MatchStatus.InProgress)
    }

    fun scoreA(): Int = goals.count { it.team == MatchTeam.A }
    fun scoreB(): Int = goals.count { it.team == MatchTeam.B }
}
```

### ドメインイベント

- `MatchCreated(matchId, roundId)`
- `MatchFinished(matchId, roundId)`
- `MatchReopened(matchId, roundId)`
- `GoalRecorded(matchId, goalId)` (ハイライト生成用の将来拡張ポイント)

---

### Round 集約と Match 集約の整合性 (アプリケーション層)

集約をまたぐ不変条件はアプリケーション層の UseCase が保証する。

| 不変条件 | 実装場所 | 実装方法 |
|---|---|---|
| Match 作成時、親 Round が進行中 | `CreateMatchUseCase` | UseCase が Round を取得して検証 |
| Round 終了時、配下 Match が全て終了 | `FinishRoundUseCase` | `MatchQueryPort.hasOngoingMatchIn(roundId)` を呼ぶ |
| Match 再開時、Round が終了なら進行中に戻す | `ReopenMatchUseCase` | 同一トランザクションで両集約を更新 |
| Event 終了時、進行中 Round なし | `FinishEventUseCase` | `RoundQueryPort.hasOngoingRoundIn(eventId)` を呼ぶ |

### ドメインサービス

#### TeamSplitService

チーム分けは Round 生成前の独立ロジック。集約に含めない。

```kotlin
class TeamSplitService {
    fun split(
        members: List<MemberForSplit>,       // 軽量DTO(memberId + 経験)
        teamCount: Int,
        existingTeams: List<Team>? = null,
    ): TeamAssignment
}
```

- Fisher-Yates シャッフル + ラウンドロビン配分
- 既存チーム考慮モードあり
- Member 集約への依存を避けるため、入力は軽量DTO (`MemberForSplit`)

---

## MVP Evaluation コンテキスト

### MvpEvaluation (集約ルート)

```
MvpEvaluation (AggregateRoot)
├── id: MvpEvaluationId
├── eventId: EventId
├── executedAt: Instant
├── mvpCount: Int
├── runnerUpCount: Int
└── playerRatings: List<PlayerRating>         集約内の値オブジェクト
```

### PlayerRating (値オブジェクト)

```
PlayerRating (ValueObject)
├── memberId: MemberId
├── memberName: String                        スナップショット
├── rank: MvpRank (MVP / RunnerUp / None)
├── title: String
├── reason: String                            MVP/準MVPのみ
├── totalScore: TotalScore (0〜100)
├── rating: Rating (0.0〜10.0, scale=1)
└── comment: String
```

#### 設計意図

- メンバーがリネームされても、**選出時点の名前を保存**(スナップショット)
- MVP Evaluation は Member 集約への依存を避ける
- 幹事は MVP/準MVP の選出対象外(プロンプトで AI に指示)

### 不変条件

- `totalScore` は 0〜100 にクランプ
- `rating` は 0.0〜10.0、小数第1位
- `rank == MVP` の件数 == `mvpCount` (ベストエフォート)
- 同一 `eventId` には1つの `MvpEvaluation` のみ存在(再選出時は delete して再作成)

### 振る舞い

```kotlin
class MvpEvaluation(...) {
    companion object {
        fun create(
            eventId: EventId,
            mvpCount: Int,
            runnerUpCount: Int,
            ratings: List<PlayerRating>,
            clock: Clock,
        ): MvpEvaluation { ... }
    }
}
```

### 生成プロセス (SelectMvpUseCase)

1. Event を検証 (`status == Finished` でなければ拒否)
2. 試合データを `MatchQueryPort` から取得
3. メンバー情報を `MemberQueryPort` から取得
4. アンケートコメントを `SurveyQueryPort` から取得
5. `MvpPromptBuilder` がプロンプトを構築
6. `GeminiClient` で実行、JSON レスポンスをパース
7. `MvpEvaluation` 集約を生成
8. 既存の `MvpEvaluation` があれば削除して新規保存

### ドメインイベント

- `MvpEvaluationCompleted(evaluationId, eventId)`

---

## Survey コンテキスト (TO BE: Webフォーム自前化)

Google フォーム連携を廃止し、アプリ内で完結する Webフォームとして再設計する。

### Survey (集約ルート)

```
Survey (AggregateRoot)
├── id: SurveyId
├── eventId: EventId
├── status: SurveyStatus (Open / Closed)      回答受付中 / 締切
├── openedAt: Instant
└── closedAt: Instant?                        締切時刻(未締切なら null)
```

SurveyResponse は巨大化する可能性があるため **別集約**とする(Survey 集約の肥大化を避ける)。

### SurveyResponse (独立集約ルート)

```
SurveyResponse (AggregateRoot)
├── id: SurveyResponseId
├── surveyId: SurveyId                        他集約への参照はIDのみ
├── respondentMemberId: MemberId?             匿名回答を許可するなら null も可(要件により決定)
├── respondentName: String                    入力された回答者名
├── submittedAt: Instant
└── comments: List<SurveyComment>             集約内の値オブジェクト
```

### SurveyComment (値オブジェクト)

```
SurveyComment (ValueObject)
├── targetMemberId: MemberId
├── targetMemberName: String                  スナップショット
└── text: String
```

### 設計差分 (AS IS → TO BE)

| 項目 | AS IS | TO BE |
|---|---|---|
| フォーム実装 | Google フォーム | アプリ内 Web フォーム |
| URL | `Event.surveyFormUrl` に外部URL | `/events/:eventId/survey` で自前ルート |
| 回答取得 | Google Forms API から一括取り込み | ユーザーが直接POSTするので取り込み不要 |
| 冪等性確保 | 再取得時に全削除 | 不要(ユーザー入力時点で永続化) |
| 1人が複数回回答 | Google側の挙動依存 | **1 SurveyResponse / 1 回答者** としてポリシーで制御 |

### 不変条件

- `Survey` は `Event` に対して1つ(UNIQUE(eventId))
- `SurveyResponse` は `surveyId` + `respondentMemberId` で一意(重複回答防止、メンバーID指定時のみ)
- `Survey.status == Closed` の場合、新規 `SurveyResponse` 追加は不可
- `SurveyComment.targetMemberId` は自分自身でも可(自己評価)

### Survey の振る舞い

```kotlin
class Survey(...) {
    fun close(): Survey {
        check(status == SurveyStatus.Open) { "受付中のアンケートのみ締切できます" }
        return copy(status = SurveyStatus.Closed, closedAt = now)
    }

    fun reopen(): Survey {
        check(status == SurveyStatus.Closed) { "締切済みのアンケートのみ再開できます" }
        return copy(status = SurveyStatus.Open, closedAt = null)
    }
}
```

### SurveyResponse の振る舞い

```kotlin
class SurveyResponse(...) {
    companion object {
        fun submit(
            surveyId: SurveyId,
            respondentMemberId: MemberId?,
            respondentName: String,
            comments: List<SurveyComment>,
            clock: Clock,
        ): SurveyResponse {
            require(comments.isNotEmpty()) { "コメントを1件以上入力してください" }
            return SurveyResponse(...)
        }
    }
}
```

### ドメインイベント

- `SurveyOpened(surveyId, eventId)`
- `SurveyClosed(surveyId, eventId)`
- `SurveyResponseSubmitted(responseId, surveyId)`

---

## Identity & Access コンテキスト

ステートレスなため集約は軽量。

### Administrator (ドメイン概念)

- パスワードは環境変数 `ADMIN_PASSWORD` に保持
- DB には保存しない
- ログイン成功時に JWT を発行する

### EventAccessToken (値オブジェクト)

```
EventAccessToken (ValueObject)
├── role: Role (ADMIN / USER)
├── eventId: EventId?          USERの場合は必須、ADMINの場合はnull
├── memberId: MemberId?        参加者ログイン時、どのメンバーとして入ったか(任意)
└── expiresAt: Instant
```

JWT のペイロードとしてシリアライズされる。

---

## 集約一覧まとめ (TO BE)

| コンテキスト | 集約ルート | 子エンティティ/値オブジェクト |
|---|---|---|
| Event | `Event` | なし(シンプルな集約) |
| Member | `Member` | なし(シンプルな集約) |
| Match Operation | `Round` | `TeamAssignment`, `Team` |
| Match Operation | `Match` (独立) | `MatchParticipant`, `Goal` |
| MVP Evaluation | `MvpEvaluation` | `PlayerRating` |
| Survey | `Survey` | なし |
| Survey | `SurveyResponse` (独立) | `SurveyComment` |
| Identity & Access | (ステートレス) | `EventAccessToken` |

**集約をまたぐ整合性保証はすべてアプリケーション層の UseCase が担う**(DDD / CQRS の標準パターン)。

## 主要な設計差分サマリ (AS IS → TO BE)

| 項目 | AS IS | TO BE |
|---|---|---|
| ID 形式 | UUID先頭8文字 | **UUID v7** (36文字) |
| Match の位置づけ | Round 集約の子エンティティ | **独立集約** |
| Survey 実装 | Google フォーム連携 | **アプリ内 Web フォーム** |
| SurveyResponse | Survey 集約の子 | **独立集約** |
| Event 作成メール送信 | あり | **廃止** (QRコード/コピーUIに置き換え) |
| Event の surveyFormUrl/Id | あり | 削除(Survey コンテキストへ) |
| 論理削除 | なし | **なし** (ハードデリート継続) |
| 楽観的ロック | なし | **なし** |
