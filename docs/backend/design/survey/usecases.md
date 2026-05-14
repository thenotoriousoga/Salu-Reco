# Survey コンテキスト — ユースケース

## Command (Write)

| UseCase | 入力 | 出力 | 前提条件 |
|---|---|---|---|
| `OpenSurveyUseCase` | `eventId` | `SurveyId` | イベントが存在する、既存 Survey なし |
| `CloseSurveyUseCase` | `surveyId` | `Unit` | status == Open |
| `ReopenSurveyUseCase` | `surveyId` | `Unit` | status == Closed |
| `SubmitSurveyResponseUseCase` | `surveyId, respondentMemberId?, respondentName, comments` | `SurveyResponseId` | Survey status == Open, 重複回答なし |

### SubmitSurveyResponseUseCase の処理フロー

1. Survey を取得し、status == Open を検証
2. 重複回答チェック（respondentMemberId が指定されている場合）
3. SurveyResponse 集約を生成・保存
4. `SurveyResponseSubmitted` ドメインイベントを発行

## Query (Read)

| QueryService | メソッド | 出力 |
|---|---|---|
| `SurveyQueryService` | `findByEventId(eventId)` | `SurveyDto?` |
| `SurveyQueryService` | `listResponsesBySurveyId(surveyId)` | `List<SurveyResponseDto>` |
| `SurveyQueryService` | `getCommentsForMvp(eventId)` | `List<SurveyCommentDto>` |

## Port (他コンテキストへの公開インターフェース)

| Port | メソッド | 利用元 |
|---|---|---|
| `SurveyQueryPort` | `getCommentsForMvp(eventId): List<SurveyCommentDto>` | MVP コンテキスト (SelectMvpUseCase) |
