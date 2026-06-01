# MVP Evaluation コンテキスト — 集約設計

## MvpEvaluation (集約ルート)

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
├── title: String                             ユニークな称号（全員に付与）
├── reason: String                            MVP/準MVPのみ（150〜250文字）
├── rating: Rating (0.0〜10.0, scale=1)
└── comment: String                           本人へのメッセージ（120〜200文字）
```

### 設計意図

- メンバーがリネームされても、**選出時点の名前を保存**（スナップショット）
- MVP Evaluation は Member 集約への依存を避ける
- 幹事は MVP/準MVP の選出対象外（プロンプトで AI に指示）

### 不変条件

- `rating` は 0.0〜10.0、小数第1位
- MVP受賞者の `rating` は 8.5 以上
- 準MVP受賞者の `rating` は 7.0 以上
- 最高スコアと最低スコアの差は 3.0 以上
- 同じスコアは最大2人まで
- `rank == MVP` の件数 == `mvpCount`（ベストエフォート）
- 幹事は MVP/準MVP に選出されない
- 同一 `eventId` には1つの `MvpEvaluation` のみ存在（再選出時は delete して再作成）

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
