# Survey コンテキスト — 集約設計

Google フォーム連携を廃止し、アプリ内で完結する Webフォームとして再設計する。

---

## Survey (集約ルート)

```
Survey (AggregateRoot)
├── id: SurveyId
├── eventId: EventId
├── status: SurveyStatus (Open / Closed)      回答受付中 / 締切
├── openedAt: Instant
└── closedAt: Instant?                        締切時刻（未締切なら null）
```

SurveyResponse は巨大化する可能性があるため **別集約**とする（Survey 集約の肥大化を避ける）。

### 不変条件

- `Survey` は `Event` に対して1つ（UNIQUE(eventId)）
- `Survey.status == Closed` の場合、新規 `SurveyResponse` 追加は不可

### Survey の振る舞い

```kotlin
class Survey(...) {
    fun close(): Survey {
        check(status == SurveyStatus.Open) { "受付中のアンケートのみ締切できます" }
        return copy(status = SurveyStatus.Closed, closedAt = now)
    }

    fun reopen(): Survey {
        check(status == SurveyStatus.Closed) { "締切済みのアンケートのみ再開できます" }
        return copy(status = SurveyStatus.Open, closedAt = null)
    }
}
```

---

## SurveyResponse (独立集約ルート)

```
SurveyResponse (AggregateRoot)
├── id: SurveyResponseId
├── surveyId: SurveyId                        他集約への参照はIDのみ
├── respondentMemberId: MemberId?             匿名回答を許可するなら null も可（要件により決定）
├── respondentName: String                    入力された回答者名
├── submittedAt: Instant
└── comments: List<SurveyComment>             集約内の値オブジェクト
```

### SurveyComment (値オブジェクト)

```
SurveyComment (ValueObject)
├── targetMemberId: MemberId
├── targetMemberName: String                  スナップショット
└── text: String
```

### 不変条件

- `SurveyResponse` は `surveyId` + `respondentMemberId` で一意（重複回答防止、メンバーID指定時のみ）
- `SurveyComment.targetMemberId` は自分自身でも可（自己評価）

### SurveyResponse の振る舞い

```kotlin
class SurveyResponse(...) {
    companion object {
        fun submit(
            surveyId: SurveyId,
            respondentMemberId: MemberId?,
            respondentName: String,
            comments: List<SurveyComment>,
            clock: Clock,
        ): SurveyResponse {
            require(comments.isNotEmpty()) { "コメントを1件以上入力してください" }
            return SurveyResponse(...)
        }
    }
}
```

---

## 設計差分 (AS IS → TO BE)

| 項目 | AS IS | TO BE |
|---|---|---|
| フォーム実装 | Google フォーム | アプリ内 Web フォーム |
| URL | `Event.surveyFormUrl` に外部URL | `/events/:eventId/survey` で自前ルート |
| 回答取得 | Google Forms API から一括取り込み | ユーザーが直接POSTするので取り込み不要 |
| 冪等性確保 | 再取得時に全削除 | 不要（ユーザー入力時点で永続化） |
| 1人が複数回回答 | Google側の挙動依存 | **1 SurveyResponse / 1 回答者** としてポリシーで制御 |
