# Survey コンテキスト — ドメインイベント

## 発行するドメインイベント

| イベント | 発行タイミング | 消費者 |
|---|---|---|
| `SurveyOpened(surveyId, eventId)` | アンケート受付開始時 | — |
| `SurveyClosed(surveyId, eventId)` | アンケート締切時 | — |
| `SurveyResponseSubmitted(responseId, surveyId)` | 回答送信時 | — |
