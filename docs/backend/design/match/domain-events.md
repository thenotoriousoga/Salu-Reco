# Match Operation コンテキスト — ドメインイベント

## Round が発行するドメインイベント

| イベント | 発行タイミング | 消費者 |
|---|---|---|
| `RoundCreated(roundId, eventId)` | ラウンド作成時 | — |
| `RoundFinished(roundId)` | ラウンド終了時 | — |
| `RoundReopened(roundId)` | ラウンド再開時 | — |

## Match が発行するドメインイベント

| イベント | 発行タイミング | 消費者 |
|---|---|---|
| `MatchCreated(matchId, roundId)` | マッチ作成時 | — |
| `MatchFinished(matchId, roundId)` | マッチ終了時 | — |
| `MatchReopened(matchId, roundId)` | マッチ再開時 | — |
| `GoalRecorded(matchId, goalId)` | 得点記録時 | ハイライト生成（将来拡張ポイント） |
