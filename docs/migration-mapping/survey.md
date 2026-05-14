# Survey.gs ↔ Survey コンテキスト

## GAS 側の公開関数

| 関数名 | 呼び出し元 | 処理内容 |
|---|---|---|
| `createSurveyForm(eventId)` | `js-results.html` | Google フォーム自動生成 |
| `fetchSurveyResponses(eventId)` | `js-results.html`, `Mvp.gs` | フォーム回答取得 → スプレッドシート保存 |
| `getSurveyVoters(eventId)` | `Events.gs` | 回答者名一覧取得 |

## 新実装での対応先

| GAS 関数 | UseCase / QueryService | API エンドポイント |
|---|---|---|
| `createSurveyForm` | `CreateSurveyUseCase` | `POST /api/events/{eventId}/survey` |
| `fetchSurveyResponses` | （廃止） | — |
| `getSurveyVoters` | `SurveyQueryService` | `GET /api/events/{eventId}/survey/responses` |
| — (新規) | `SubmitSurveyResponseUseCase` | `POST /api/events/{eventId}/survey/responses` |
| — (新規) | `CloseSurveyUseCase` | `POST /api/events/{eventId}/survey/close` |

## 差分・変更点

| 項目 | GAS 版 | 新実装 |
|---|---|---|
| フォーム実装 | Google Forms (`FormApp`) | アプリ内 Web フォーム（自前実装） |
| 回答の保存 | `fetchSurveyResponses` で外部取得 → スプレッドシート保存 | `SubmitSurveyResponseUseCase` で直接 DB 保存 |
| 重複回答制御 | 同一回答者の最新回答のみ使用（全削除→再保存） | DB の UNIQUE 制約 (`survey_id + respondent_member_id`) |
| フォーム URL | Google Forms の公開 URL | アプリ内ページ `/events/{id}` の結果タブ内 |
| 回答者の特定 | フォーム内のプルダウンで名前選択 | 認証済みユーザーの `memberId` で自動特定 |
| アンケート状態 | なし（常に回答可能） | `SurveyStatus`: `Open` / `Closed` |

## 廃止される機能

| 機能 | 理由 |
|---|---|
| `createSurveyForm` (Google Forms 生成) | アプリ内フォームに置き換え |
| `fetchSurveyResponses` (外部取得) | 回答が直接 DB に保存されるため不要 |
| イベントの `フォームURL` / `フォームID` カラム | Google Forms 依存を廃止 |

## 新規追加される機能

| 機能 | 説明 |
|---|---|
| アンケート締切 (`CloseSurveyUseCase`) | 管理者が回答受付を停止できる |
| 回答の直接送信 | ユーザーがアプリ内で回答を送信 |
| 回答者の自動特定 | ログイン中の `memberId` で回答者を特定（プルダウン不要） |

## 補足

- GAS 版では Google Forms に依存していたため、回答取得が「外部からの取り込み」だった
- 新実装ではアプリ内完結のため、回答は即座に DB に保存される
- `SurveyResponse` は独立集約として設計（Survey 集約の肥大化を防止）
- コメントの構造は同じ: 対象メンバー1人あたり1コメント
