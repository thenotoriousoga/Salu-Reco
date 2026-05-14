# Mvp.gs + Gemini.gs ↔ MVP Evaluation コンテキスト

## GAS 側の公開関数

### Mvp.gs

| 関数名 | 呼び出し元 | 処理内容 |
|---|---|---|
| `selectMVP(eventId, mvpCount, subMvpCount)` | `js-results.html` | MVP 選出実行 |

### Gemini.gs

| 関数名 | 呼び出し元 | 処理内容 |
|---|---|---|
| `callGemini_(prompt)` | `Mvp.gs` (内部) | Gemini API 呼び出し |

## 新実装での対応先

| GAS 関数 | UseCase / Port | API エンドポイント |
|---|---|---|
| `selectMVP` | `SelectMvpUseCase` | `POST /api/events/{eventId}/mvp/evaluate` |
| `callGemini_` | `AiEvaluationPort` → `GeminiApiAdapter` | （内部実装。API 公開なし） |

## 内部関数の対応

| GAS 内部関数 | 新実装での配置 |
|---|---|
| `getMvpData_` | UseCase 内で各コンテキストの QueryPort を呼び出し |
| `getParticipantIds_` | UseCase 内のロジック or QueryPort |
| `calcMemberStats_` | `MatchQueryPort` 経由で取得 |
| `buildMvpPrompt_` | `mvp/domain/service/` or `mvp/application/` |
| `parseMvpResponse_` | `mvp/infrastructure/adapter/GeminiResponseParser` |
| `saveMvpResults_` | `MvpEvaluationRepository.save()` |

## 差分・変更点

| 項目 | GAS 版 | 新実装 |
|---|---|---|
| データ取得 | `getMultipleSheetData_` で全シート一括取得 | 各コンテキストの QueryPort 経由 |
| プロンプト構築 | `buildMvpPrompt_` で文字列結合 | 同等のロジック。配置先は Application 層 |
| AI モデル | `gemini-2.5-pro` | 環境変数 `GEMINI_MODEL` で設定可能（デフォルト: `gemini-2.0-flash`） |
| リトライ | 503 時に 1 回リトライ（5秒待機） | Spring Retry で最大 2 回リトライ |
| レスポンスパース | `JSON.parse` + 手動マッピング | 同等。パース失敗時のエラーハンドリングを強化 |
| 結果保存 | 既存削除 → 全件再書き込み | `MvpEvaluationRepository` で既存削除 → 新規保存 |
| アンケート自動取得 | `selectMVP` 内で `fetchSurveyResponses` を呼ぶ | UseCase 内で `SurveyQueryPort` 経由。Google Forms 依存なし |
| 前提条件 | イベント終了状態のみ | 同じ |

## 廃止される機能

| 機能 | 理由 |
|---|---|
| Google Forms からの回答自動取得 | Survey コンテキストがアプリ内フォームとして自前実装 |

## 補足

- プロンプトの内容（評価方針、キャラ設定、出力仕様）は GAS 版をそのまま移植する
- 新実装では `AiEvaluationPort` インターフェースを Domain 層に定義し、Gemini 以外の AI に差し替え可能にする
- MVP 選出の前提条件（イベント終了状態）は Event コンテキストの `EventQueryPort` で確認する
