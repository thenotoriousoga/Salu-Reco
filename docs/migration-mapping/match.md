# Rounds.gs + TeamSplit.gs ↔ Match Operation コンテキスト

## GAS 側の公開関数

### Rounds.gs

| 関数名 | 呼び出し元 | 処理内容 |
|---|---|---|
| `createRound(eventId, teamNames, teams)` | `js-rounds.html` | ラウンド作成（チーム分け結果保存） |
| `endRound(roundId)` | `js-rounds.html` | ラウンド終了 |
| `createMatch(roundId, teamAName, teamBName, teamAMembers, teamBMembers)` | `js-rounds.html` | マッチ作成（2チーム対戦） |
| `endMatch(matchId, goals, newSubs)` | `js-rounds.html` | マッチ終了 + 得点・助っ人保存 |
| `reopenMatch(matchId)` | `js-rounds.html` | マッチ再開 |

### TeamSplit.gs

| 関数名 | 呼び出し元 | 処理内容 |
|---|---|---|
| `autoSplitTeams(eventId, memberIds, teamCount, existingTeams)` | `js-rounds.html` | 自動チーム分け |

## 新実装での対応先

| GAS 関数 | UseCase / DomainService | API エンドポイント |
|---|---|---|
| `autoSplitTeams` | `TeamSplitService`（ドメインサービス） | `POST /api/events/{eventId}/rounds/split-preview` |
| `createRound` | `CreateRoundUseCase` | `POST /api/events/{eventId}/rounds` |
| `endRound` | `FinishRoundUseCase` | `POST /api/events/{eventId}/rounds/{roundId}/finish` |
| `createMatch` | `CreateMatchUseCase` | `POST /api/events/{eventId}/rounds/{roundId}/matches` |
| `endMatch` | `FinishMatchUseCase` | `POST /api/events/{eventId}/matches/{matchId}/finish` |
| `reopenMatch` | `ReopenMatchUseCase` | `POST /api/events/{eventId}/matches/{matchId}/reopen` |

## 差分・変更点

| 項目 | GAS 版 | 新実装 |
|---|---|---|
| チーム分けの実行 | `autoSplitTeams` がメンバー情報を直接取得 | UseCase が Member コンテキストから取得し、軽量 DTO に変換して `TeamSplitService` に渡す |
| `createRound` の入力 | チーム分け結果（名前 + メンバーID配列）を直接受け取る | チーム分けプレビュー → 確定の2ステップ |
| チーム分け JSON | スプレッドシートに JSON 文字列で保存 | `TeamAssignment` 値オブジェクトとして JSONB カラムに保存 |
| `endMatch` | 得点と助っ人を同時に保存 | 得点は試合中にリアルタイム保存。終了時はステータス変更のみ |
| 助っ人の追加タイミング | `endMatch` 時に一括追加 | マッチ進行中に随時追加 |
| `reopenMatch` | イベント終了後は再開不可 | 同じ制約。ラウンドが終了なら自動で進行中に戻す |
| Round と Match の関係 | 同じファイルで管理 | Round と Match は独立集約（ID 参照のみ） |

## 廃止される機能

| 機能 | 理由 |
|---|---|
| `buildRoundsData_` / `buildMatchData_` | Read 側は QueryService で JPQL 射影。集約を経由しない |

## 補足

- GAS 版では `endMatch` が得点データの全削除→再書き込みを行っていたが、新実装では得点は試合中にリアルタイムで記録し、`endMatch` はステータス変更のみ
- `autoSplitTeams` のアルゴリズム（Fisher-Yates + ラウンドロビン）は新実装でもそのまま維持
- 新実装では「チーム分けプレビュー」API を追加し、確定前にユーザーが結果を確認できるようにする
