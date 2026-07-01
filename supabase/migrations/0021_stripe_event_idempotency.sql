-- 0021_stripe_event_idempotency.sql
-- M3: deduplicate Stripe webhook events.
--
-- Stripe delivers webhooks AT-LEAST-ONCE and routinely re-sends the same event id
-- (retries, overlapping checkout/subscription events). Re-processing causes redundant
-- `stripe.subscriptions.retrieve` calls inside the webhook and lets an out-of-order
-- `customer.subscription.updated` overwrite newer state. The webhook now claims each
-- event id in this table before processing; a primary-key conflict means "already
-- handled" and the event is acknowledged without re-running.
--
-- Service-role only: RLS is enabled with no policies, so the anon/authenticated roles
-- cannot read or write it; only the webhook's service-role client touches it.

create table if not exists entrium.stripe_events (
  event_id     text primary key,
  type         text,
  processed_at timestamptz not null default now()
);

alter table entrium.stripe_events enable row level security;

-- Index for time-based cleanup of old rows (optional housekeeping).
create index if not exists stripe_events_processed_at_idx
  on entrium.stripe_events (processed_at);
