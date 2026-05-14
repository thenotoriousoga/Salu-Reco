# Member コンテキスト — ユースケース

## Command (Write)

| UseCase | 入力 | 出力 | 前提条件 |
|---|---|---|---|
| `BulkRegisterMembersUseCase` | `eventId, List<MemberRegistration>` | `List<MemberId>` | イベントが存在する |
| `UpdateMemberUseCase` | `memberId, name, seniorityYear, experience, isOrganizer, note` | `Unit` | メンバーが存在する |
| `UpdateEnthusiasmUseCase` | `memberId, text` | `Unit` | メンバーが存在する、50文字以内 |
| `DeleteMemberUseCase` | `memberId` | `Unit` | メンバーが存在する |

### BulkRegisterMembersUseCase の処理フロー

1. イベントの存在確認
2. 各メンバーの MemberId を UUID v7 で生成
3. Member 集約を生成・一括保存
4. `MemberRegistered` ドメインイベントを発行

## Query (Read)

| QueryService | メソッド | 出力 |
|---|---|---|
| `MemberQueryService` | `listByEventId(eventId: String)` | `List<MemberDto>` |
| `MemberQueryService` | `countByEventIds(eventIds: List<String>)` | `Map<String, Int>` |

## Port (他コンテキストへの公開インターフェース)

| Port | メソッド | 利用元 |
|---|---|---|
| `MemberCountPort` | `countByEventId(eventId: String): Int` | Event コンテキスト (StartEventUseCase) |
| `MemberRegistrationPort` | `registerOrganizer(eventId, name): String` | Event コンテキスト (CreateEventUseCase) |
