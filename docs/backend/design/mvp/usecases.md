# MVP Evaluation コンテキスト — ユースケース

## Command (Write)

| UseCase | 入力 | 出力 | 前提条件 |
|---|---|---|---|
| `SelectMvpUseCase` | `eventId, mvpCount, runnerUpCount` | `MvpEvaluationId` | Event status == Finished |

### SelectMvpUseCase の処理フロー

1. Event を検証（`status == Finished` でなければ拒否）
2. 二重実行防止（進行中の選出がないか確認）
3. 試合データを `MatchQueryPort` から取得
4. メンバー情報を `MemberQueryPort` から取得
5. アンケートコメントを `SurveyQueryPort` から取得
6. `MvpPromptBuilder` がシステムプロンプトとユーザープロンプトを構築
7. `GeminiClient` で実行（非同期、最大4回リトライ）
8. JSON レスポンスをパースし、バリデーション実行
9. バリデーション失敗時はリトライ（プロンプト再送信）
10. `MvpEvaluation` 集約を生成
11. 既存の `MvpEvaluation` があれば削除して新規保存
12. `MvpEvaluationCompleted` ドメインイベントを発行

### 非同期実行パターン

MVP選出は Gemini API 呼び出しに時間がかかるため、非同期で実行する。

```
クライアント → selectMvp(eventId) → 「選出開始」レスポンス即返却
                                    ↓ (バックグラウンド)
                              GeminiClient 呼び出し
                                    ↓
                              バリデーション + リトライ
                                    ↓
                              結果保存
クライアント → getMvpStatus(eventId) → ポーリングで完了確認
```

### バリデーションルール

AI レスポンスが以下を満たさない場合、リトライする（最大4回）:

- MVP人数が指定数と一致
- 準MVP人数が指定数と一致
- 幹事が MVP/準MVP に選出されていない
- 最高スコアと最低スコアの差が 3.0 以上
- MVP受賞者のスコアが 8.5 以上
- 準MVP受賞者のスコアが 7.0 以上
- 全員分のデータが含まれている（欠落なし）

### Gemini API 設定

| 項目 | 値 |
|---|---|
| モデル | gemini-2.5-pro |
| temperature | 0.9 |
| responseMimeType | application/json |
| maxOutputTokens | 65536 |
| リトライ | 503/429 時に最大5回（指数バックオフ） |

### プロンプト構造

- **システムプロンプト**（固定部分）: タスク定義、出力仕様、キャラ設定（FIFA会長）、評価方針、制約
- **ユーザープロンプト**（可変部分）: 選手データ（得点・勝利・出場数・経験・年次・備考・コメント）

### 評価基準（重み順）

| 評価軸 | 重み |
|---|---|
| チームメイトからの評価（コメントの数・ポジティブさ） | 最重要 |
| 場への貢献（盛り上げ、声かけなど数字に表れない貢献） | 高 |
| 成長・チャレンジ（未経験者の積極参加） | 高 |
| 試合結果（得点数・勝利数） | 参考 |
| 参加姿勢（出場試合数） | 参考 |

※ 備考欄の情報は評価の加点対象ではない。コメントのネタに使う程度。

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
| `MvpQueryService` | `getSelectionStatus(eventId)` | `MvpSelectionStatus` (NotStarted / InProgress / Completed / Failed) |
