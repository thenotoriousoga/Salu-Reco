# Match Operation コンテキスト — 集約設計

このコンテキストは **Round と Match を独立集約に分離**する(TO BE 変更)。

理由:
- Round と Match は異なるライフサイクルを持つ（Match は Round 進行中に複数回作成される）
- Match のスコア更新頻度が高く、Round 全体を再構築するコストが無駄
- Match を他の集約（MVP評価のクエリ対象、ハイライト生成など）から直接参照したい

集約境界をまたぐ整合性は **アプリケーション層の UseCase** が担保する。

---

## Round (集約ルート)

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
├── memberIds: List<MemberId>
└── captainId: MemberId?                     キャプテン（各チーム1名、ランダム選出）
```

### Round の不変条件

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

---

## Match (独立集約ルート)

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
- `status == Finished` のとき、新規 Goal の追加はできない（再開後のみ可）

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

---

## Round 集約と Match 集約の整合性 (アプリケーション層)

集約をまたぐ不変条件はアプリケーション層の UseCase が保証する。

| 不変条件 | 実装場所 | 実装方法 |
|---|---|---|
| Match 作成時、親 Round が進行中 | `CreateMatchUseCase` | UseCase が Round を取得して検証 |
| Round 終了時、配下 Match が全て終了 | `FinishRoundUseCase` | `MatchQueryPort.hasOngoingMatchIn(roundId)` を呼ぶ |
| Match 再開時、Round が終了なら進行中に戻す | `ReopenMatchUseCase` | 同一トランザクションで両集約を更新 |
| Event 終了時、進行中 Round なし | `FinishEventUseCase` | `RoundQueryPort.hasOngoingRoundIn(eventId)` を呼ぶ |
