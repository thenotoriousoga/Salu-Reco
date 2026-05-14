# Event コンテキスト — ドメインイベント

## 発行するドメインイベント

| イベント | 発行タイミング | 消費者 |
|---|---|---|
| `EventCreated(eventId, createdBy)` | イベント作成時 | — |
| `EventStarted(eventId)` | ステータスが Preparing → InProgress に遷移 | — |
| `EventFinished(eventId)` | ステータスが InProgress → Finished に遷移 | MVP Evaluation（選出可能状態を認知） |
| `EventReopened(eventId)` | ステータスが Finished → InProgress に遷移 | — |

## 備考

- 初期実装ではドメインイベントは同期のアプリケーションサービス呼び出しで代替可能
- `EventFinished` は MVP Evaluation コンテキストが「選出可能」状態を認知するために使用
