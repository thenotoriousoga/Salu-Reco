-- Phase 4: Member コンテキストの初期スキーマ
-- 参照: docs/refactoring/04-rdb-schema.md

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

CREATE TRIGGER trg_members_updated_at BEFORE UPDATE ON members
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
