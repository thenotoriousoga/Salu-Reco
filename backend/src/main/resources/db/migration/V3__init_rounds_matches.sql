-- ============================================================
-- V3: rounds, matches, match_participants, goals テーブル作成
-- Match Operation コンテキスト
-- ============================================================

-- ─── rounds ─────────────────────────────────────────────────
CREATE TABLE rounds (
    id              UUID        PRIMARY KEY,
    event_id        UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    round_number    INT         NOT NULL,
    status          TEXT        NOT NULL,  -- InProgress / Finished
    team_assignment JSONB       NOT NULL,  -- { names, teams, captains }
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_rounds_event_number UNIQUE (event_id, round_number)
);

CREATE INDEX idx_rounds_event_id ON rounds(event_id);

-- ─── matches ────────────────────────────────────────────────
CREATE TABLE matches (
    id           UUID        PRIMARY KEY,
    round_id     UUID        NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    match_number INT         NOT NULL,
    team_a_name  TEXT        NOT NULL,
    team_b_name  TEXT        NOT NULL,
    status       TEXT        NOT NULL,  -- InProgress / Finished
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_matches_round_number UNIQUE (round_id, match_number)
);

CREATE INDEX idx_matches_round_id ON matches(round_id);
CREATE INDEX idx_matches_status ON matches(status);

-- ─── match_participants ─────────────────────────────────────
CREATE TABLE match_participants (
    match_id      UUID    NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    member_id     UUID    NOT NULL REFERENCES members(id),
    team          TEXT    NOT NULL,  -- A / B
    is_substitute BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY (match_id, member_id)
);

CREATE INDEX idx_match_participants_member_id ON match_participants(member_id);

-- ─── goals ──────────────────────────────────────────────────
CREATE TABLE goals (
    id                UUID        PRIMARY KEY,
    match_id          UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team              TEXT        NOT NULL,  -- A / B (得点チーム)
    scorer_member_id  UUID        REFERENCES members(id),
    type              TEXT        NOT NULL,  -- Normal / OwnGoal / Unknown
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Normal → scorer_member_id 必須 / OwnGoal, Unknown → scorer_member_id NULL
    CONSTRAINT chk_goals_scorer CHECK (
        (type = 'Normal' AND scorer_member_id IS NOT NULL) OR
        (type IN ('OwnGoal', 'Unknown') AND scorer_member_id IS NULL)
    )
);

CREATE INDEX idx_goals_match_id ON goals(match_id);
