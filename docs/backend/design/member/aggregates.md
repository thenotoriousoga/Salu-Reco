# Member コンテキスト — 集約設計

## Member (集約ルート)

```
Member (AggregateRoot)
├── id: MemberId
├── eventId: EventId                            他集約への参照はIDのみ
├── name: MemberName
├── seniorityYear: Int (1以上)
├── soccerExperience: SoccerExperience (Enum)
├── isOrganizer: Boolean
├── note: String                                自由記述
└── enthusiasm: String                          意気込み (メンバー本人が更新)
```

### 設計差分 (AS IS → TO BE)

- `enthusiasm` (意気込み) を維持
- 年次・サッカー経験は維持
- 将来的な「イベントごとの任意項目設定」機能を見越したスキーマ拡張は今回スコープ外

### 値オブジェクト

- **MemberId**: UUID v7
- **MemberName**: 1〜50文字
- **SoccerExperience**: Enum `Experienced / Inexperienced`

### 不変条件

- `seniorityYear >= 1`
- `name` は空文字禁止
- `enthusiasm` は 50文字以内
- 同一 `eventId` 内で `name` 重複は許可(現実にはあり得る)

### 振る舞い

```kotlin
class Member(...) {
    fun rename(newName: MemberName): Member = copy(name = newName)
    fun updateExperience(exp: SoccerExperience): Member = copy(soccerExperience = exp)
    fun markAsOrganizer(): Member = copy(isOrganizer = true)
    fun unmarkAsOrganizer(): Member = copy(isOrganizer = false)
    fun updateEnthusiasm(text: String): Member {
        require(text.length <= 50) { "意気込みは50文字以内です" }
        return copy(enthusiasm = text)
    }
    fun updateNote(text: String): Member = copy(note = text)
}
```
