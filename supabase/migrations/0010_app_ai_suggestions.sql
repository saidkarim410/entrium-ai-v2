-- ─────────────────────────────────────────────────────────────
-- Per-application AI suggestions cache
-- /api/applications/<id>/suggest stores the structured output here
-- so re-opening the card doesn't re-burn AI calls.
-- ─────────────────────────────────────────────────────────────

alter table entrium.applications
  add column if not exists ai_suggestions jsonb,
  add column if not exists ai_suggestions_at timestamptz;
