-- Screener log (spec §10.2 item 7a). Applied 2026-09-25 to Supabase project screener-helper
-- (cifgvpqfodglnhywrofy, org Waterline) as migration create_screener_log.
-- One row per screener event: an answered call (upserted as the compare step learns more: the AI verdict,
-- the screener's pick, the result) or an unanswered dial (no-answer / voicemail / bad-number).
-- Written by n8n: Screener: Compare Step (calls) and Screener: Attempt Counter (unanswered dials), always
-- through screener_log_upsert below; Screener: Log Retry replays writes that failed.

create table if not exists public.screener_log (
  event_key         text primary key,        -- 'call:<call_id>', or the ladder key 'wavv:<id>' / 'na:<contact>:<ms>'
  event             text not null check (event in ('call', 'no-answer', 'voicemail', 'bad-number', 'graduated')),  -- graduated: core_tables.sql
  event_at          timestamptz not null,    -- when the call was answered / the dial happened
  ghl_contact_id    text not null,
  company           text,
  screener_user_id  text,                    -- GHL user who dialled
  attempt_no        integer,                 -- Screen Attempts after this event
  duration_sec      integer,
  pt_block          text,                    -- 'PT 09-10'; null outside 06:00-16:00 Pacific
  screener_outcome  text,                    -- the screener's pick, spelled as the GHL dropdown
  noise             text check (noise in ('busy', 'quiet')),
  ai_call_outcome   text,                    -- owner / gatekeeper / voicemail / ...
  ai_owner_reached  text,                    -- yes / no / unclear
  ai_confidence     numeric,
  ai_quote_verified boolean,
  match             boolean,                 -- screener pick agrees with the AI; NULL while the compare still waits
  result_stage      text,                    -- Owner Verified / Gatekeeper / Not Sure / Disqualified / Attempt n / Exhausted
  reason            text,
  call_id           text,
  recording_url     text,
  transcript        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  decided_ms        bigint not null default 0   -- when the writing run read GHL: the version of the decision
);

create index if not exists screener_log_contact on public.screener_log (ghl_contact_id);
create index if not exists screener_log_screener on public.screener_log (screener_user_id, event_at);

-- Only the service-role key (n8n) reads and writes; no public access.
alter table public.screener_log enable row level security;

-- Item 8: match rate per screener, answered calls only (dial rows have no screener or match).
-- A call counts once the compare has decided (match not null).
-- security_invoker: the view follows the table's RLS instead of running with its owner's rights.
-- Migrations: create_screener_log, screener_accuracy_calls_only (2026-09-25).
create or replace view public.screener_accuracy with (security_invoker = true) as
select screener_user_id,
       count(*)                                                                as calls,
       count(*) filter (where match is not null)                               as compared,
       count(*) filter (where match)                                           as matched,
       round(100.0 * count(*) filter (where match)
             / nullif(count(*) filter (where match is not null), 0), 1)        as match_pct
from public.screener_log
where event = 'call'
group by screener_user_id;

-- The only write path (codex review, 2026-09-25; migration screener_log_versioned_upsert). Atomic and versioned:
-- call facts are only filled in, never blanked; the decision (mark, noise, match, stage, reason, attempt) is
-- replaced only by a run that read GHL at the same time or later (decided_ms), so a late or replayed write
-- can never overwrite a newer decision. Callable by the service_role only.
create or replace function public.screener_log_upsert(r jsonb) returns void
language sql security invoker set search_path = '' as $$
  insert into public.screener_log as t (event_key, event, event_at, ghl_contact_id, company, screener_user_id, attempt_no,
    duration_sec, pt_block, screener_outcome, noise, ai_call_outcome, ai_owner_reached, ai_confidence, ai_quote_verified,
    match, result_stage, reason, call_id, recording_url, transcript, decided_ms, updated_at)
  values (r->>'event_key', r->>'event', (r->>'event_at')::timestamptz, r->>'ghl_contact_id', r->>'company',
    r->>'screener_user_id', (r->>'attempt_no')::integer, (r->>'duration_sec')::integer, r->>'pt_block',
    r->>'screener_outcome', r->>'noise', r->>'ai_call_outcome', r->>'ai_owner_reached', (r->>'ai_confidence')::numeric,
    (r->>'ai_quote_verified')::boolean, (r->>'match')::boolean, r->>'result_stage', r->>'reason', r->>'call_id',
    r->>'recording_url', r->>'transcript', coalesce((r->>'decided_ms')::bigint, 0), coalesce((r->>'updated_at')::timestamptz, now()))
  on conflict (event_key) do update set
    event_at          = coalesce(excluded.event_at, t.event_at),
    company           = coalesce(excluded.company, t.company),
    screener_user_id  = coalesce(excluded.screener_user_id, t.screener_user_id),
    duration_sec      = coalesce(excluded.duration_sec, t.duration_sec),
    pt_block          = coalesce(excluded.pt_block, t.pt_block),
    ai_call_outcome   = coalesce(excluded.ai_call_outcome, t.ai_call_outcome),
    ai_owner_reached  = coalesce(excluded.ai_owner_reached, t.ai_owner_reached),
    ai_confidence     = coalesce(excluded.ai_confidence, t.ai_confidence),
    ai_quote_verified = coalesce(excluded.ai_quote_verified, t.ai_quote_verified),
    call_id           = coalesce(excluded.call_id, t.call_id),
    recording_url     = coalesce(excluded.recording_url, t.recording_url),
    transcript        = coalesce(excluded.transcript, t.transcript),
    attempt_no        = case when excluded.decided_ms >= t.decided_ms then coalesce(excluded.attempt_no, t.attempt_no) else t.attempt_no end,
    screener_outcome  = case when excluded.decided_ms >= t.decided_ms then excluded.screener_outcome else t.screener_outcome end,
    noise             = case when excluded.decided_ms >= t.decided_ms then excluded.noise else t.noise end,
    match             = case when excluded.decided_ms >= t.decided_ms then excluded.match else t.match end,
    result_stage      = case when excluded.decided_ms >= t.decided_ms then excluded.result_stage else t.result_stage end,
    reason            = case when excluded.decided_ms >= t.decided_ms then excluded.reason else t.reason end,
    decided_ms        = greatest(excluded.decided_ms, t.decided_ms),
    updated_at        = excluded.updated_at;
$$;
revoke execute on function public.screener_log_upsert(jsonb) from public, anon, authenticated;
grant execute on function public.screener_log_upsert(jsonb) to service_role;

-- Item 7b: the last 24 hours for the daily Slack summary (Screener: Daily Sweep). One row.
-- Migration screener_last_24h (2026-09-25).
create or replace view public.screener_last_24h with (security_invoker = true) as
select count(*) filter (where event = 'call')                                   as calls,
       count(*) filter (where event = 'call' and match is not null)            as compared,
       count(*) filter (where event = 'call' and match)                        as matched,
       count(*) filter (where event = 'call' and result_stage = 'Owner Verified') as owners,
       count(*) filter (where event = 'no-answer')                              as no_answers,
       count(*) filter (where event = 'voicemail')                              as voicemails,
       count(*) filter (where event = 'bad-number')                             as bad_numbers
from public.screener_log
where event_at >= now() - interval '24 hours';
