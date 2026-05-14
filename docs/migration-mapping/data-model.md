# データモデル対応表: スプレッドシート ↔ PostgreSQL

## シート → テーブル対応

| GAS シート名 | PostgreSQL テーブル | 所有コンテキスト |
|---|---|---|
| イベント | `events` | Event |
| メンバー | `members` | Member |
| ラウンド | `rounds` | Match Operation |
| マッチ | `matches` | Match Operation |
| マッチメンバー | `match_participants` | Match Operation |
| 得点 | `goals` | Match Operation |
| アンケート回答 | `survey_responses` + `survey_comments` | Survey |
| MVP結果 | `mvp_evaluations` + `mvp_player_ratings` | MVP Evaluation |
| — (新規) | `surveys` | Survey |

## カラム対応表

### イベント → `events`

| GAS カラム | PostgreSQL カラム | 型変更 |
|---|---|---|
| イベントID | `id` | `VARCHAR(8)` → `UUID` |
| 日付 | `date` | `TEXT` → `DATE` |
| 名称 | `name` | `TEXT` → `VARCHAR(100)` |
| ステータス | `status` | `TEXT` → `VARCHAR(20)` (enum値) |
| フォームURL | （廃止） | — |
| フォームID | （廃止） | — |
| コード | `join_code` | `TEXT` → `VARCHAR(5) UNIQUE` |
| — (新規) | `created_at` | `TIMESTAMPTZ` |

### メンバー → `members`

| GAS カラム | PostgreSQL カラム | 型変更 |
|---|---|---|
| メンバーID | `id` | `VARCHAR(8)` → `UUID` |
| イベントID | `event_id` | `VARCHAR(8)` → `UUID` (FK) |
| 名前 | `name` | `TEXT` → `VARCHAR(50)` |
| 年次 | `seniority_year` | `NUMBER` → `SMALLINT` |
| サッカー経験 | `soccer_experience` | `'あり'/'なし'` → `VARCHAR(15)` (enum値) |
| 幹事 | `is_organizer` | `'はい'/'いいえ'` → `BOOLEAN` |
| 備考 | `note` | `TEXT` → `VARCHAR(200)` |
| 意気込み | `enthusiasm` | `TEXT` → `VARCHAR(50)` |
| — (新規) | `created_at` | `TIMESTAMPTZ` |

### ラウンド → `rounds`

| GAS カラム | PostgreSQL カラム | 型変更 |
|---|---|---|
| ラウンドID | `id` | `VARCHAR(8)` → `UUID` |
| イベントID | `event_id` | `VARCHAR(8)` → `UUID` (FK) |
| ラウンド番号 | `round_number` | `NUMBER` → `SMALLINT` |
| チーム分けJSON | `team_assignment` | `TEXT` → `JSONB` |
| ステータス | `status` | `TEXT` → `VARCHAR(20)` |

### マッチ → `matches`

| GAS カラム | PostgreSQL カラム | 型変更 |
|---|---|---|
| マッチID | `id` | `VARCHAR(8)` → `UUID` |
| ラウンドID | `round_id` | `VARCHAR(8)` → `UUID` (FK) |
| マッチ番号 | `match_number` | `NUMBER` → `SMALLINT` |
| チームA名 | `team_a_name` | `TEXT` → `VARCHAR(10)` |
| チームB名 | `team_b_name` | `TEXT` → `VARCHAR(10)` |
| ステータス | `status` | `TEXT` → `VARCHAR(20)` |

### マッチメンバー → `match_participants`

| GAS カラム | PostgreSQL カラム | 型変更 |
|---|---|---|
| マッチID | `match_id` | `VARCHAR(8)` → `UUID` (FK) |
| メンバーID | `member_id` | `VARCHAR(8)` → `UUID` (FK) |
| チーム | `team_side` | `TEXT` → `VARCHAR(1)` (A/B) |
| 助っ人 | `is_substitute` | `'はい'/'いいえ'` → `BOOLEAN` |
| — (新規) | `id` | `UUID` (PK) |

### 得点 → `goals`

| GAS カラム | PostgreSQL カラム | 型変更 |
|---|---|---|
| 得点ID | `id` | `VARCHAR(8)` → `UUID` |
| マッチID | `match_id` | `VARCHAR(8)` → `UUID` (FK) |
| チーム | `team_side` | `TEXT` → `VARCHAR(1)` |
| メンバーID | `member_id` | `VARCHAR(8)` → `UUID` (nullable) |
| 種別 | `goal_type` | `TEXT` → `VARCHAR(10)` (enum値) |

### アンケート回答 → `survey_responses` + `survey_comments`

GAS 版は1シートにフラットに保存していたが、新実装では正規化する。

| GAS カラム | 新テーブル.カラム | 備考 |
|---|---|---|
| イベントID | `survey_responses.survey_id` (FK) | Survey 経由で間接参照 |
| 回答者名 | `survey_responses.respondent_member_id` (FK) | 名前ではなく ID で特定 |
| 対象メンバーID | `survey_comments.target_member_id` | |
| 対象メンバー名 | （廃止） | ID から JOIN で取得 |
| コメント | `survey_comments.comment` | |

### MVP結果 → `mvp_evaluations` + `mvp_player_ratings`

| GAS カラム | 新テーブル.カラム | 備考 |
|---|---|---|
| イベントID | `mvp_evaluations.event_id` (FK) | |
| — (新規) | `mvp_evaluations.id` (PK) | UUID |
| — (新規) | `mvp_evaluations.mvp_count` | 選出時の設定値 |
| — (新規) | `mvp_evaluations.sub_mvp_count` | 選出時の設定値 |
| — (新規) | `mvp_evaluations.evaluated_at` | 選出日時 |
| メンバーID | `mvp_player_ratings.member_id` | |
| 名前 | （廃止） | ID から JOIN で取得 |
| 順位 | `mvp_player_ratings.rank` | |
| 称号 | `mvp_player_ratings.title` | |
| 理由 | `mvp_player_ratings.reason` | |
| 総合スコア | `mvp_player_ratings.total_score` | |
| レーティング | `mvp_player_ratings.rating` | |
| 評価コメント | `mvp_player_ratings.comment` | |

## ID 体系の変更

| 項目 | GAS 版 | 新実装 |
|---|---|---|
| 生成方式 | `Utilities.getUuid().substring(0, 8)` | UUID v7 (時系列順) |
| 文字数 | 8 文字 | 36 文字 |
| DB 型 | TEXT | `UUID` ネイティブ型 |
| インデックス性能 | ランダム → B-Tree 断片化 | 時系列順 → 断片化抑制 |

## 新規追加テーブル

| テーブル | 所有コンテキスト | 目的 |
|---|---|---|
| `surveys` | Survey | アンケートの受付状態管理（GAS 版では Event に混在） |

## 補足

- GAS 版では「名前」をキーにした参照が多かったが、新実装では全て ID 参照に統一
- 日本語カラム名は全て英語 snake_case に変換
- `created_at` / `updated_at` は必要なテーブルにのみ追加（全テーブルに機械的に付けない）
