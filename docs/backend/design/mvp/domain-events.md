# MVP Evaluation コンテキスト — ドメインイベント

## 発行するドメインイベント

| イベント | 発行タイミング | 消費者 |
|---|---|---|
| `MvpEvaluationCompleted(evaluationId, eventId)` | MVP選出完了時 | — |

## 消費するドメインイベント

| イベント | 発行元 | 用途 |
|---|---|---|
| `EventFinished(eventId)` | Event コンテキスト | MVP選出可能状態の認知 |
