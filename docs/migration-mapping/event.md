# Events.gs ↔ Event コンテキスト

## GAS 側の公開関数

| 関数名 | 呼び出し元 | 処理内容 |
|---|---|---|
| `getEvents()` | `js-events.html` | 全イベント一覧取得（新しい順） |
| `getEventDetail(eventId)` | `js-events.html` | イベント詳細（メンバー・ラウンド・MVP含む） |
| `createEventAsOrganizer(name, date, organizerName, email)` | `js-events.html` | イベント作成 + 幹事登録 + メール送信 |
| `startEvent(eventId)` | `js-events.html` | 準備中 → 進行中 |
| `endEvent(eventId)` | `js-events.html` | 進行中 → イベント終了 |
| `reopenEvent(eventId)` | `js-events.html` | イベント終了 → 進行中 |
| `updateEventStatus(eventId, status)` | 内部利用 | ステータス直接更新 |

## 新実装での対応先

| GAS 関数 | UseCase | API エンドポイント |
|---|---|---|
| `getEvents` | `EventQueryService` | `GET /api/events` |
| `getEventDetail` | `EventQueryService` | `GET /api/events/{id}` |
| `createEventAsOrganizer` | `CreateEventUseCase` | `POST /api/events` |
| `startEvent` | `StartEventUseCase` | `POST /api/events/{id}/start` |
| `endEvent` | `FinishEventUseCase` | `POST /api/events/{id}/finish` |
| `reopenEvent` | `ReopenEventUseCase` | `POST /api/events/{id}/reopen` |
| `updateEventStatus` | （廃止） | — |

## 差分・変更点

| 項目 | GAS 版 | 新実装 |
|---|---|---|
| `getEventDetail` | 全データ一括取得（メンバー・ラウンド・マッチ・MVP） | イベント基本情報のみ。他は別 API |
| `createEventAsOrganizer` | イベント作成 + 幹事登録 + メール送信を1関数で | イベント作成のみ。幹事登録は Member API |
| 参加コード生成 | `generateUniqueEventCode_()` | `JoinCodeGenerator`（ドメインサービス） |
| ID 生成 | UUID 先頭 8 文字 | UUID v7（36文字） |
| `endEvent` の条件 | 進行中ラウンドなし + ラウンド1つ以上 | 進行中ラウンドなし（ラウンド0でも終了可は検討中） |

## 廃止される機能

| 機能 | 理由 |
|---|---|
| メール送信 (`sendEventCodeMail_`) | QR コード + コピーボタンに置き換え |
| `updateEventStatus` (直接更新) | ステータス遷移は UseCase 経由のみ（不変条件を保護） |
| `getEventDetail` の一括取得 | コンテキスト分離。各データは個別 API で取得 |

## 補足

- GAS 版の `getEventDetail` は1回の呼び出しで全データを返す「ファットレスポンス」だったが、新実装ではコンテキスト境界を尊重し、イベント・メンバー・ラウンド・MVPを個別に取得する
- フロントエンドの Server Components で並列フェッチすることで、UX の劣化を防ぐ
