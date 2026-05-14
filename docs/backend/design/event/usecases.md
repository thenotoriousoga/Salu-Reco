# Event コンテキスト — ユースケース

## Command (Write)

| UseCase | 入力 | 出力 | 前提条件 |
|---|---|---|---|
| `CreateEventUseCase` | `CreateEventCommand(name, date, organizerName)` | `CreateEventResult(eventId, joinCode, organizerMemberId)` | — |
| `StartEventUseCase` | `eventId: String` | `Unit` | status == Preparing, メンバー2名以上 |
| `FinishEventUseCase` | `eventId: String` | `Unit` | status == InProgress, 進行中ラウンドなし |
| `ReopenEventUseCase` | `eventId: String` | `Unit` | status == Finished |

### CreateEventUseCase の処理フロー

1. EventId を UUID v7 で生成
2. JoinCode を一意生成（重複チェック付き）
3. Event 集約を生成・保存
4. `MemberRegistrationPort.registerOrganizer()` で幹事メンバーを自動登録
5. `EventCreated` ドメインイベントを発行

### ステータス遷移 UseCase の他コンテキスト依存

| UseCase | 依存 Port | 取得情報 |
|---|---|---|
| `StartEventUseCase` | `MemberCountPort` | イベントのメンバー数 |
| `FinishEventUseCase` | `RoundStatusPort` | 進行中ラウンドの有無 |

## Query (Read)

| QueryService | メソッド | 出力 |
|---|---|---|
| `EventQueryService` | `list(query: ListEventsQuery)` | `List<EventListItemDto>` |
| `EventQueryService` | `findDetail(id: String)` | `EventDetailDto?` |

### EventListItemDto

```kotlin
data class EventListItemDto(
    val id: String,
    val name: String,
    val date: LocalDate,
    val status: String,
    val joinCode: String,
    val memberCount: Int,      // MemberQueryPort から取得
    val roundCount: Int,       // MatchQueryPort から取得
    val hasMvpResult: Boolean, // MvpQueryPort から取得
)
```
