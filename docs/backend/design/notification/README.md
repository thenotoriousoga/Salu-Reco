# Notification コンテキスト — 設計概要

## 概要

LINE Messaging API を使用して、イベントの各種アクション（チーム分け、ラウンド結果、MVP結果など）をLINEグループに通知する。

## 位置づけ

- **コアドメイン度**: サポート（通知は付加価値だが、アプリの中核ロジックではない）
- **依存方向**: 他コンテキスト → Notification（ドメインイベント経由で通知をトリガー）
- **外部依存**: LINE Messaging API、Gemini API（コメンテーター解説生成）

## 機能一覧

| 通知種別 | トリガー | 内容 |
|---|---|---|
| イベント開始 | `EventStarted` | 参加メンバー一覧、イベントURL |
| チーム分け結果 | `RoundCreated` | チーム構成、キャプテン表示、AI解説コメント |
| ラウンド結果 | `RoundFinished` | チーム順位表、得点ランキング、AI解説コメント |
| アンケートリマインド | 手動トリガー | 未回答者への催促 |
| MVP結果 | `MvpEvaluationCompleted` | MVP/準MVP発表、得点・勝ち点ランキング |

## LINEグループ連携

### 紐づけフロー

1. LINEグループに公式アカウント（Bot）を招待
2. Bot がグループ参加時に挨拶メッセージを送信
3. グループ内で `@Bot名 連携:参加コード` とメンション付きメッセージを送信
4. 参加コードからイベントを検索し、`events.line_group_id` に保存
5. 連携完了メッセージを送信

### 解除

- 管理者がアプリ内から解除操作 → `events.line_group_id` を NULL に更新

## コメンテーター機能

各通知にAI生成の解説コメントを付与する。

- 7人の解説者キャラクター（それぞれ異なる口調・視点）
- ラウンド番号に基づいて解説者を選択（チーム分けと結果で被らないペア）
- Gemini API（gemini-2.5-flash-lite, temperature=0.7）でテキスト生成

## 非同期通知キュー

通知はUIをブロックしないよう非同期で実行する。

### 新システムでの実装方針

- Spring の `@Async` + `ApplicationEventListener` でドメインイベントを非同期処理
- 失敗時はログ記録（通知失敗でビジネスロジックを巻き戻さない）
- リトライは LINE API の 429/503 に対して最大3回

## ファイル構成

```
notification/
├── domain/
│   ├── model/
│   │   └── Commentator.kt              解説者の定義
│   └── port/
│       ├── LineMessagingPort.kt         LINE API 抽象化
│       └── CommentaryGeneratorPort.kt   AI解説生成の抽象化
├── application/
│   ├── command/
│   │   ├── NotifyEventStartUseCase.kt
│   │   ├── NotifyTeamSplitUseCase.kt
│   │   ├── NotifyRoundResultUseCase.kt
│   │   ├── NotifySurveyReminderUseCase.kt
│   │   └── NotifyMvpResultUseCase.kt
│   └── port/
│       ├── EventQueryPort.kt           Event情報取得
│       ├── MemberQueryPort.kt          メンバー情報取得
│       └── MatchQueryPort.kt           試合データ取得
├── infrastructure/
│   ├── line/
│   │   └── LineMessagingClient.kt      LINE Messaging API 実装
│   ├── gemini/
│   │   └── GeminiCommentaryGenerator.kt  Gemini API でコメンタリー生成
│   └── listener/
│       └── NotificationEventListener.kt  ドメインイベントリスナー
└── presentation/
    └── controller/
        └── NotificationController.kt   手動トリガー用（アンケートリマインド等）
```
