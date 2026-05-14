# Members.gs ↔ Member コンテキスト

## GAS 側の公開関数

| 関数名 | 呼び出し元 | 処理内容 |
|---|---|---|
| `getEventMembers(eventId)` | `js-members.html`, `Events.gs` | イベントのメンバー一覧取得 |
| `bulkAddMembersFromQueue(eventId, memberDataList)` | `js-members.html` | メンバー一括登録（キュー方式） |
| `deleteEventMember(memberId)` | `js-members.html` | メンバー削除 |
| `updateMember(memberId, data)` | `js-members.html` | メンバー情報更新 |
| `updateMemberSpirit(memberId, spirit)` | `js-members.html` | 意気込み更新（一般ユーザー用） |

## 新実装での対応先

| GAS 関数 | UseCase / QueryService | API エンドポイント |
|---|---|---|
| `getEventMembers` | `MemberQueryService` | `GET /api/events/{eventId}/members` |
| `bulkAddMembersFromQueue` | `BulkAddMembersUseCase` | `POST /api/events/{eventId}/members` |
| `deleteEventMember` | `DeleteMemberUseCase` | `DELETE /api/events/{eventId}/members/{memberId}` |
| `updateMember` | `UpdateMemberUseCase` | `PUT /api/events/{eventId}/members/{memberId}` |
| `updateMemberSpirit` | `UpdateEnthusiasmUseCase` | `PUT /api/events/{eventId}/members/{memberId}/enthusiasm` |

## 差分・変更点

| 項目 | GAS 版 | 新実装 |
|---|---|---|
| ID 生成 | UUID 先頭 8 文字 | UUID v7（36文字） |
| 一括登録の入力 | `{ name, years, exp, org, note }` | `{ name, seniorityYear, soccerExperience, isOrganizer, note }` |
| サッカー経験 | `'あり'` / `'なし'` 文字列 | `Experienced` / `Inexperienced` enum |
| 幹事フラグ | `'はい'` / `'いいえ'` 文字列 | `Boolean` |
| 意気込み | `spirit` パラメータ名 | `enthusiasm`（ユビキタス言語に統一） |
| 削除 | `memberId` のみで削除可 | `eventId` + `memberId` で認可チェック付き |
| バリデーション | サーバー側で最低限 | Domain 層の値オブジェクトで厳密に検証 |

## 廃止される機能

- なし（全機能が新実装に移行）

## 補足

- GAS 版では `deleteEventMember` が `memberId` だけで削除できたが、新実装では URL に `eventId` を含め、認可チェック（そのイベントにアクセス権があるか）を行う
- `updateMemberSpirit` は一般ユーザーが自分の意気込みを更新する機能。新実装でも USER ロールで呼び出し可能にする
