-- Migration 001: Create analyses table
-- Run: psql $DATABASE_URL -f migrations/001_create_analyses.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS analyses (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  type       VARCHAR(10)   NOT NULL CHECK (type IN ('voice', 'image', 'video')),
  filename   VARCHAR(255),
  score      NUMERIC(5,2)  NOT NULL,
  verdict    VARCHAR(20)   NOT NULL,
  details    JSONB,
  created_at TIMESTAMP     NOT NULL DEFAULT now()
);

-- Reports table for citizen reports
CREATE TABLE IF NOT EXISTS reports (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID          REFERENCES analyses(id) ON DELETE SET NULL,
  source_url  TEXT,
  description TEXT          NOT NULL,
  reporter    VARCHAR(255),
  status      VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at  TIMESTAMP     NOT NULL DEFAULT now()
);
