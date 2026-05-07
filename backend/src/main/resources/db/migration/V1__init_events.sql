-- Phase 1: Event コンテキストの初期スキーマ
-- 参照: docs/refactoring/04-rdb-schema.md

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

-- updated_at 自動更新トリガ(後続の Phase でも流用)
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
