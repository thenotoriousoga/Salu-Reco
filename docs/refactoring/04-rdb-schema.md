# RDB スキーマ設計 (PostgreSQL) - TO BE

## 方針

- スキーマはコンテキスト境界を尊重する(他コンテキストのテーブルを JOIN しない / Read 側の COUNT/EXISTS のみ例外)
- **ID は `UUID` 型** (PostgreSQL ネイティブ)、値は **UUID v7** をアプリ側で生成
- 全テーブルに `created_at`, `updated_at` を付与(`updated_at` 不要なテーブルはスキップ)
- 削除はハードデリート(小規模アプリのため)
- 外部キー制約はコンテキスト内でのみ設定。コンテキスト境界はアプリケーション側で担保
- タイムスタンプは `TIMESTAMPTZ`
- 文字列は `TEXT` (PostgreSQL では VARCHAR とパフォーマンス差がない)
- 楽観的ロック (`@Version`) は採用しない

## ID 型方針 (UUID v7)

- カラム型: `UUID`(PostgreSQL ネイティブ)
- 値生成: **アプリ層で UUID v7 を生成**(`com.github.f4b6a3:uuid-creator`)
- DB 側の `gen_random_uuid()` (v4) は使わない
- UUID v7 は時系列順に並ぶため B-Tree インデックスの断片化を抑制する

---

## ER 図 (新スキーマ)

```mermaid
erDiagram
    events {
        uuid id PK
        text name
        date event_date
        text status "Preparing/InProgress/Finished"
        char(5) join_code UK
        timestamptz created_at
        timestamptz updated_at
    }

    members {
        uuid id PK
        uuid event_id FK
        text name
        int seniority_year
        text soccer_experience "Experienced/Inexperienced"
        boolean is_organizer
        text note
        text enthusiasm "意気込み(本人編集)"
        timestamptz created_at
        timestamptz updated_at
    }

    rounds {
        uuid id PK
        uuid event_id FK
        int round_number
        text status "InProgress/Finished"
        jsonb team_assignment
        timestamptz created_at
        timestamptz updated_at
    }

    matches {
        uuid id PK
        uuid round_id FK
        int match_number
        text team_a_name
        text team_b_name
        text status
        timestamptz created_at
        timestamptz updated_at
    }

    match_participants {
        uuid match_id FK
        uuid member_id "他コンテキスト参照のためFKなし"
        text team "A/B"
        boolean is_substitute
    }

    goals {
        uuid id PK
        uuid match_id FK
        text team
        uuid scorer_member_id "NULL可"
        text type "Normal/OwnGoal/Unknown"
        timestamptz created_at
    }

    mvp_evaluations {
        uuid id PK
        uuid event_id UK "1イベントに1件"
        int mvp_count
        int runner_up_count
        timestamptz executed_at
        timestamptz created_at
    }

    mvp_player_ratings {
        uuid evaluation_id FK
        uuid member_id
        text member_name_snapshot
        text rank
        text title
        text reason
        int total_score
        numeric(3,1) rating
        text comment
    }

    surveys {
        uuid id PK
        uuid event_id UK "1イベントに1件"
        text status "Open/Closed"
        timestamptz opened_at
        timestamptz closed_at "NULL可"
        timestamptz created_at
        timestamptz updated_at
    }

    survey_responses {
        uuid id PK
        uuid survey_id FK
        uuid respondent_member_id "匿名許可時NULL可"
        text respondent_name
        timestamptz submitted_at
    }

    survey_comments {
        uuid response_id FK
        uuid target_member_id
        text target_member_name_snapshot
        text text
    }

    events ||--o{ members : "has"
    events ||--o{ rounds : "has"
    events ||--|| mvp_evaluations : "has one"
    events ||--|| surveys : "has one"
    rounds ||--o{ matches : "has"
    matches ||--o{ match_participants : "has"
    matches ||--o{ goals : "has"
    mvp_evaluations ||--o{ mvp_player_ratings : "has"
    surveys ||--o{ survey_responses : "has"
    survey_responses ||--o{ survey_comments : "has"
```

---

## Flyway マイグレーション

`backend/src/main/resources/db/migration/V1__init.sql` として配置する。

### Events (Event コンテキスト)

```sql
CREATE TABLE events (
    id          UUID        PRIMARY KEY,
    name        TEXT        NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
    event_date  DATE        NOT NULL,
    status      TEXT        NOT NULL CHECK (status IN ('Preparing','InProgress','Finished')),
    join_code   VARCHAR(5)  NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_join_code ON events(join_code);
CREATE INDEX idx_events_status    ON events(status);
```

**設計差分**: `survey_form_id`, `survey_form_url` を削除(Survey コンテキストが自己管理)

### Members (Member コンテキスト)

```sql
CREATE TABLE members (
    id                UUID        PRIMARY KEY,
    event_id          UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name              TEXT        NOT NULL CHECK (length(name) BETWEEN 1 AND 50),
    seniority_year    INT         NOT NULL CHECK (seniority_year >= 1),
    soccer_experience TEXT        NOT NULL CHECK (soccer_experience IN ('Experienced','Inexperienced')),
    is_organizer      BOOLEAN     NOT NULL DEFAULT FALSE,
    note              TEXT        NOT NULL DEFAULT '',
    enthusiasm        TEXT        NOT NULL DEFAULT '' CHECK (length(enthusiasm) <= 50),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_members_event_id ON members(event_id);
```

### Rounds (Match Operation コンテキスト)

```sql
CREATE TABLE rounds (
    id              UUID        PRIMARY KEY,
    event_id        UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    round_number    INT         NOT NULL,
    status          TEXT        NOT NULL CHECK (status IN ('InProgress','Finished')),
    team_assignment JSONB       NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (event_id, round_number)
);

CREATE INDEX idx_rounds_event_id ON rounds(event_id);
```

**注意**: `events(id)` への FK が付いているが、これはコンテキスト境界ルールの例外的な整合性保証(カスケード削除のため)。
ドメイン境界としては Match Operation から Event を参照しないが、インフラ層の整合性(イベント削除時に配下データを消す)は DB が保証する。

### Matches (Match Operation コンテキスト - TO BE で独立集約)

```sql
CREATE TABLE matches (
    id           UUID        PRIMARY KEY,
    round_id     UUID        NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    match_number INT         NOT NULL,
    team_a_name  TEXT        NOT NULL CHECK (length(team_a_name) BETWEEN 1 AND 10),
    team_b_name  TEXT        NOT NULL CHECK (length(team_b_name) BETWEEN 1 AND 10),
    status       TEXT        NOT NULL CHECK (status IN ('InProgress','Finished')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (round_id, match_number)
);

CREATE INDEX idx_matches_round_id ON matches(round_id);
CREATE INDEX idx_matches_status   ON matches(status);
```

### Match Participants (Match 集約の値オブジェクト)

```sql
CREATE TABLE match_participants (
    match_id      UUID    NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    member_id     UUID    NOT NULL,                         -- 他コンテキストなのでFK制約なし
    team          TEXT    NOT NULL CHECK (team IN ('A','B')),
    is_substitute BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY (match_id, member_id)
);

CREATE INDEX idx_match_participants_member_id ON match_participants(member_id);
```

### Goals (Match 集約の値オブジェクト)

```sql
CREATE TABLE goals (
    id                UUID        PRIMARY KEY,
    match_id          UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team              TEXT        NOT NULL CHECK (team IN ('A','B')),
    scorer_member_id  UUID,                                 -- NULL可 (OwnGoal/Unknown)
    type              TEXT        NOT NULL CHECK (type IN ('Normal','OwnGoal','Unknown')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        (type = 'Normal'   AND scorer_member_id IS NOT NULL) OR
        (type IN ('OwnGoal','Unknown') AND scorer_member_id IS NULL)
    )
);

CREATE INDEX idx_goals_match_id ON goals(match_id);
```

`CHECK` 制約で「Normal なら得点者必須、OwnGoal/Unknown なら null」を担保。

### MVP Evaluations (MVP Evaluation コンテキスト)

```sql
CREATE TABLE mvp_evaluations (
    id              UUID        PRIMARY KEY,
    event_id        UUID        NOT NULL UNIQUE,  -- 1イベント1評価
    mvp_count       INT         NOT NULL CHECK (mvp_count BETWEEN 1 AND 5),
    runner_up_count INT         NOT NULL CHECK (runner_up_count BETWEEN 1 AND 5),
    executed_at     TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- event_id は他コンテキストなので FK制約なし
-- UNIQUEでシングルトン性を担保
```

### MVP Player Ratings (MvpEvaluation の子)

```sql
CREATE TABLE mvp_player_ratings (
    evaluation_id          UUID          NOT NULL REFERENCES mvp_evaluations(id) ON DELETE CASCADE,
    member_id              UUID          NOT NULL,
    member_name_snapshot   TEXT          NOT NULL,
    rank                   TEXT          NOT NULL CHECK (rank IN ('MVP','RunnerUp','None')),
    title                  TEXT          NOT NULL DEFAULT '',
    reason                 TEXT          NOT NULL DEFAULT '',
    total_score            INT           NOT NULL CHECK (total_score BETWEEN 0 AND 100),
    rating                 NUMERIC(3,1)  NOT NULL CHECK (rating BETWEEN 0.0 AND 10.0),
    comment                TEXT          NOT NULL DEFAULT '',

    PRIMARY KEY (evaluation_id, member_id)
);

CREATE INDEX idx_mvp_player_ratings_evaluation_id ON mvp_player_ratings(evaluation_id);
```

### Surveys (Survey コンテキスト - TO BE: Webフォーム自前化)

```sql
CREATE TABLE surveys (
    id         UUID        PRIMARY KEY,
    event_id   UUID        NOT NULL UNIQUE,
    status     TEXT        NOT NULL CHECK (status IN ('Open','Closed')),
    opened_at  TIMESTAMPTZ NOT NULL,
    closed_at  TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**設計差分**: `form_id`, `form_url` を削除(Webフォーム自前化のため不要)

### Survey Responses (独立集約 - TO BE)

```sql
CREATE TABLE survey_responses (
    id                     UUID        PRIMARY KEY,
    survey_id              UUID        NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    respondent_member_id   UUID,                                     -- 匿名許可時NULL可
    respondent_name        TEXT        NOT NULL,
    submitted_at           TIMESTAMPTZ NOT NULL,

    -- 同じメンバーからの重複回答防止(匿名回答時はNULLで一意制約外)
    UNIQUE (survey_id, respondent_member_id)
);

CREATE INDEX idx_survey_responses_survey_id ON survey_responses(survey_id);
```

### Survey Comments (SurveyResponse の子)

```sql
CREATE TABLE survey_comments (
    response_id                  UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
    target_member_id             UUID NOT NULL,
    target_member_name_snapshot  TEXT NOT NULL,
    text                         TEXT NOT NULL DEFAULT '',

    PRIMARY KEY (response_id, target_member_id)
);

CREATE INDEX idx_survey_comments_target_member_id ON survey_comments(target_member_id);
```

---

## updated_at 自動更新トリガ

```sql
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_events_updated_at  BEFORE UPDATE ON events  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rounds_updated_at  BEFORE UPDATE ON rounds  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_surveys_updated_at BEFORE UPDATE ON surveys FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## GAS 時代との主な差分 (AS IS → TO BE)

| 項目 | AS IS (GAS) | TO BE (PostgreSQL) |
|---|---|---|
| ID生成 | UUID 先頭8文字 | **UUID v7 (アプリ側生成、UUID型で保存)** |
| 削除 | アプリ側でカスケード実装 | DB 側 `ON DELETE CASCADE` |
| リレーション | 整合性なし | FK + CHECK 制約で担保 |
| `チーム分けJSON` | 文字列 | `JSONB` |
| `isSubstitute` | `'はい'/'いいえ'` | `BOOLEAN` |
| ステータス | 日本語 | 英語ラベル (`InProgress` など) |
| Event と Survey のリレーション | Event が form_id/form_url 保持 | **Survey が独立テーブル** |
| SurveyResponse | Survey 集約の子 | **独立テーブル** |
| Match の位置づけ | Round 配下 | **独立集約テーブル** (スキーマは類似だが集約境界が異なる) |
| 楽観的ロック | なし | **なし**(導入見送り) |
| 論理削除 | なし | **なし**(ハードデリート継続) |

## 運用ガイドライン

- マイグレーションは**追記のみ** (`V2__xxx.sql`, `V3__yyy.sql`...)
- 既存マイグレーションの編集は CI/CD で弾く (Flyway `validate`)
- `spring.jpa.hibernate.ddl-auto=validate` 固定
- 本番適用前にステージング環境で Flyway 検証を実行

## UUID v7 の生成方針

### アプリ層での生成

```kotlin
// shared/infrastructure/UuidV7IdGenerator.kt
import com.github.f4b6a3.uuid.UuidCreator
import org.springframework.stereotype.Component

@Component
class UuidV7IdGenerator : IdGenerator {
    override fun generate(): String = UuidCreator.getTimeOrderedEpoch().toString()
}
```

### 依存ライブラリ

```kotlin
// backend/build.gradle.kts
dependencies {
    implementation("com.github.f4b6a3:uuid-creator:6.0.0")
}
```

### なぜ DB 側で生成しないのか

- アプリ側生成なら Event 作成時に ID を自分で決められ、ドメイン層から扱いやすい
- PostgreSQL の `gen_random_uuid()` は v4 で時系列性がない
- `uuid-creator` は JVM で軽量(依存なし、POJO のみ)
