# Match Operation コンテキスト — ユースケース

## Command (Write)

### Round 関連

| UseCase | 入力 | 出力 | 前提条件 |
|---|---|---|---|
| `CreateRoundUseCase` | `eventId, teamCount, memberIds` | `RoundId` | イベントが進行中、メンバー4名以上 |
| `FinishRoundUseCase` | `roundId` | `Unit` | status == InProgress, 進行中マッチなし |
| `ReopenRoundUseCase` | `roundId` | `Unit` | status == Finished |

### Match 関連

| UseCase | 入力 | 出力 | 前提条件 |
|---|---|---|---|
| `CreateMatchUseCase` | `roundId, teamAName, teamBName, participants` | `MatchId` | 親 Round が進行中 |
| `RecordGoalUseCase` | `matchId, goal` | `Unit` | status == InProgress |
| `RemoveGoalUseCase` | `matchId, goalId` | `Unit` | status == InProgress |
| `AddSubstituteUseCase` | `matchId, memberId, team` | `Unit` | status == InProgress, 未出場メンバー |
| `FinishMatchUseCase` | `matchId` | `Unit` | status == InProgress |
| `ReopenMatchUseCase` | `matchId` | `Unit` | status == Finished（Round が終了なら自動で進行中に戻す） |

### 集約またぎの整合性

- `CreateMatchUseCase`: Round を取得して InProgress を検証
- `FinishRoundUseCase`: `MatchQueryPort.hasOngoingMatchIn(roundId)` で確認
- `ReopenMatchUseCase`: Round が Finished なら同一トランザクションで Round も InProgress に戻す

## Query (Read)

| QueryService | メソッド | 出力 |
|---|---|---|
| `RoundQueryService` | `listByEventId(eventId)` | `List<RoundDto>` |
| `RoundQueryService` | `hasOngoingRoundIn(eventId)` | `Boolean` |
| `MatchQueryService` | `listByRoundId(roundId)` | `List<MatchDto>` |
| `MatchQueryService` | `hasOngoingMatchIn(roundId)` | `Boolean` |
| `MatchQueryService` | `countRoundsByEventIds(eventIds)` | `Map<String, Int>` |

## Port (他コンテキストへの公開インターフェース)

| Port | メソッド | 利用元 |
|---|---|---|
| `RoundStatusPort` | `hasOngoingRoundIn(eventId): Boolean` | Event コンテキスト (FinishEventUseCase) |
| `MatchQueryPort` | `getMatchDataForMvp(eventId): List<MatchDataDto>` | MVP コンテキスト (SelectMvpUseCase) |
