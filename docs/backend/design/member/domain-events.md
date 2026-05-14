# Member コンテキスト — ドメインイベント

## 発行するドメインイベント

| イベント | 発行タイミング | 消費者 |
|---|---|---|
| `MemberRegistered(memberId, eventId)` | メンバー登録時 | — |
| `MemberUpdated(memberId)` | メンバー情報更新時 | — |
| `OrganizerRegistered(memberId, eventId)` | Event 作成時の幹事自動登録 | — |

## 備考

- `OrganizerRegistered` は Event コンテキストの `MemberRegistrationPort` 経由で発生する
- 初期実装では同期処理で十分
