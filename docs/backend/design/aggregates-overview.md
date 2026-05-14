# 集約設計 — 概要・方針

各コンテキストの集約設計の詳細は、コンテキスト別フォルダの `aggregates.md` を参照。
このファイルでは全体方針と集約一覧のサマリを管理する。

## 設計方針

- **集約は小さく**: トランザクション整合性が必要な範囲のみを集約にまとめる
- **集約をまたぐ参照は ID のみ**: 他集約のエンティティは直接保持しない
- **不変条件は集約ルートが守る**: 外部からのデータ変更はルート経由のみ
- **値オブジェクトは不変**: `data class` + `val` プロパティで表現
- **集約ルートから子エンティティへの参照のみ許可**: 子→親の双方向参照はしない
- **集約をまたぐ不変条件はアプリケーション層 UseCase が保証**する
- **ID は UUID v7** を採用。時系列順に並ぶため B-Tree インデックスの断片化を抑制

---

## 集約一覧

| コンテキスト | 集約ルート | 子エンティティ/値オブジェクト | 詳細 |
|---|---|---|---|
| Event | `Event` | なし（シンプルな集約） | [event/aggregates.md](event/aggregates.md) |
| Member | `Member` | なし（シンプルな集約） | [member/aggregates.md](member/aggregates.md) |
| Match Operation | `Round` | `TeamAssignment`, `Team` | [match/aggregates.md](match/aggregates.md) |
| Match Operation | `Match` (独立) | `MatchParticipant`, `Goal` | [match/aggregates.md](match/aggregates.md) |
| MVP Evaluation | `MvpEvaluation` | `PlayerRating` | [mvp/aggregates.md](mvp/aggregates.md) |
| Survey | `Survey` | なし | [survey/aggregates.md](survey/aggregates.md) |
| Survey | `SurveyResponse` (独立) | `SurveyComment` | [survey/aggregates.md](survey/aggregates.md) |
| Identity & Access | (ステートレス) | `EventAccessToken` | [identity/usecases.md](identity/usecases.md) |

**集約をまたぐ整合性保証はすべてアプリケーション層の UseCase が担う**（DDD / CQRS の標準パターン）。

---

## 設計上の補足

- **ID 形式**: UUID v7（36文字）。時系列順に並ぶため B-Tree インデックスの断片化を抑制
- **Match の位置づけ**: 独立集約（Round とは ID 参照のみ）
- **Survey 実装**: アプリ内 Web フォーム（外部サービス非依存）
- **SurveyResponse**: 独立集約（Survey とは ID 参照のみ）
- **論理削除**: なし（ハードデリート）
- **楽観的ロック**: なし
