# Event コンテキスト — 集約設計

## Event (集約ルート)

```
Event (AggregateRoot)
├── id: EventId (ValueObject: UUID v7)
├── name: EventName (ValueObject)
├── date: LocalDate
├── status: EventStatus (Enum: Preparing / InProgress / Finished)
└── joinCode: JoinCode (ValueObject)
```

### 設計差分 (AS IS → TO BE)

- `surveyFormUrl`, `surveyFormId` を Event から削除。Survey コンテキストが自己管理する
- メール送信機能を廃止したため `organizerEmail` 等は持たない

### 値オブジェクト

- **EventId**: UUID v7。文字列(36文字)として保持
- **EventName**: 1文字以上100文字以下の文字列
- **JoinCode**: 紛らわしい文字 (0/O, 1/I/L) を除く 4〜5文字の英数字
  - `JoinCode.generate(): JoinCode` で自動生成
  - `JoinCode.from(raw: String)` で検証付き変換 (ユーザー入力用)

### 不変条件

| 条件 | 違反時の挙動 |
|---|---|
| `name` は空文字禁止 | インスタンス化時に `IllegalArgumentException` |
| `date` は null 禁止 | 同上 |
| `joinCode` は一意 | リポジトリレベルで UNIQUE制約 + 作成時の重複チェック |
| `status` 遷移: `Preparing → InProgress → Finished ⇄ InProgress` のみ | `start()`, `finish()`, `reopen()` メソッドで厳密に遷移制御 |

### 振る舞い (ドメインメソッド)

```kotlin
class Event(...) {
    fun start(memberCount: Int): Event {
        check(status == EventStatus.Preparing) { "準備中のイベントのみ開始できます" }
        require(memberCount >= 2) { "メンバーを2名以上登録してください" }
        return copy(status = EventStatus.InProgress)
    }

    fun finish(roundCount: Int, hasOngoingRound: Boolean): Event {
        check(status == EventStatus.InProgress) { "進行中のイベントのみ終了できます" }
        require(roundCount > 0) { "ラウンドがありません" }
        require(!hasOngoingRound) { "進行中のラウンドがあります" }
        return copy(status = EventStatus.Finished)
    }

    fun reopen(): Event {
        check(status == EventStatus.Finished) { "イベント終了状態のイベントのみ再開できます" }
        return copy(status = EventStatus.InProgress)
    }
}
```

**注意**: `memberCount` や `hasOngoingRound` はアプリケーションサービスが他コンテキストから取得して Event に渡す。Event は他テーブルを参照しない。
