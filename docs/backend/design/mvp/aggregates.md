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
├── title: String
├── reason: String                            MVP/準MVPのみ
├── totalScore: TotalScore (0〜100)
├── rating: Rating (0.0〜10.0, scale=1)
└── comment: String
```

### 設計意図

- メンバーがリネームされても、**選出時点の名前を保存**（スナップショット）
- MVP Evaluation は Member 集約への依存を避ける
- 幹事は MVP/準MVP の選出対象外（プロンプトで AI に指示）

### 不変条件

- `totalScore` は 0〜100 にクランプ
- `rating` は 0.0〜10.0、小数第1位
- `rank == MVP` の件数 == `mvpCount`（ベストエフォート）
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
