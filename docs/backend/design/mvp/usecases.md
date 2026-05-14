# MVP Evaluation コンテキスト — ユースケース

## Command (Write)

| UseCase | 入力 | 出力 | 前提条件 |
|---|---|---|---|
| `SelectMvpUseCase` | `eventId, mvpCount, runnerUpCount` | `MvpEvaluationId` | Event status == Finished |

### SelectMvpUseCase の処理フロー

1. Event を検証（`status == Finished` でなければ拒否）
2. 試合データを `MatchQueryPort` から取得
3. メンバー情報を `MemberQueryPort` から取得
4. アンケートコメントを `SurveyQueryPort` から取得
5. `MvpPromptBuilder` がプロンプトを構築
6. `GeminiClient` で実行、JSON レスポンスをパース
7. `MvpEvaluation` 集約を生成
8. 既存の `MvpEvaluation` があれば削除して新規保存
9. `MvpEvaluationCompleted` ドメインイベントを発行

### 他コンテキストへの依存 Port

| Port | メソッド | 取得情報 |
|---|---|---|
| `MatchQueryPort` | `getMatchDataForMvp(eventId)` | 試合データ（得点・勝利・出場数） |
| `MemberQueryPort` | `getMembersForMvp(eventId)` | メンバー情報（経験・年次・備考・幹事） |
| `SurveyQueryPort` | `getCommentsForMvp(eventId)` | アンケートコメント |

## Query (Read)

| QueryService | メソッド | 出力 |
|---|---|---|
| `MvpQueryService` | `findByEventId(eventId)` | `MvpEvaluationDto?` |
| `MvpQueryService` | `existsByEventIds(eventIds)` | `Map<String, Boolean>` |
