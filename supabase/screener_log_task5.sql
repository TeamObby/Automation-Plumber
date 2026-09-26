-- ⚠️ The function below is superseded by supabase/screener_log_codex_fixes.sql (fields get their own version, fields_ms).
-- Task 5: Kevin's call fields on screener_log, a safer upsert, and public-key access closed (plan-2026-09-26 §B).
-- Target: Supabase project screener-helper. Migration name: screener_log_task5. Supersedes the function in
-- screener_log.sql (the table and the two views there are unchanged apart from the grants below).
--
-- 1. Seven nullable columns, no defaults: existing rows and existing n8n payloads are unaffected.
--      shop_id, number_dialed                       facts: filled once, never blanked
--      how_he_answered, voicemail_greeting,
--      first_name, best_time, background             Topu's per-call picks: a newer write wins, a null never blanks
-- 2. screener_log_upsert (same signature, so n8n needs no change today) writes the new columns, and gains one guard:
--    an UNDECIDED write (result_stage null) never replaces a DECIDED row. Before this, a Screener Outcome the Compare
--    Step doesn't know (e.g. "No Answer") logged on `wait` with result_stage/match null and a newer decided_ms, and
--    overwrote the previous call's settled row. decided_ms now advances only when the decision is actually applied.
-- 3. anon / authenticated lose their default grants on screener_log and its two views (they saw 0 rows under RLS
--    anyway). n8n uses the service role, which is unaffected.

alter table public.screener_log add column if not exists shop_id            text;
alter table public.screener_log add column if not exists number_dialed      text;
alter table public.screener_log add column if not exists how_he_answered    text;
alter table public.screener_log add column if not exists voicemail_greeting text;
alter table public.screener_log add column if not exists first_name         text;
alter table public.screener_log add column if not exists best_time          text;
alter table public.screener_log add column if not exists background         text;

create or replace function public.screener_log_upsert(r jsonb) returns void
language sql security invoker set search_path = '' as $$
  insert into public.screener_log as t (event_key, event, event_at, ghl_contact_id, company, screener_user_id, attempt_no,
    duration_sec, pt_block, screener_outcome, noise, ai_call_outcome, ai_owner_reached, ai_confidence, ai_quote_verified,
    match, result_stage, reason, call_id, recording_url, transcript, decided_ms, updated_at,
    shop_id, number_dialed, how_he_answered, voicemail_greeting, first_name, best_time, background)
  values (r->>'event_key', r->>'event', (r->>'event_at')::timestamptz, r->>'ghl_contact_id', r->>'company',
    r->>'screener_user_id', (r->>'attempt_no')::integer, (r->>'duration_sec')::integer, r->>'pt_block',
    r->>'screener_outcome', r->>'noise', r->>'ai_call_outcome', r->>'ai_owner_reached', (r->>'ai_confidence')::numeric,
    (r->>'ai_quote_verified')::boolean, (r->>'match')::boolean, r->>'result_stage', r->>'reason', r->>'call_id',
    r->>'recording_url', r->>'transcript', coalesce((r->>'decided_ms')::bigint, 0), coalesce((r->>'updated_at')::timestamptz, now()),
    nullif(r->>'shop_id', ''), nullif(r->>'number_dialed', ''), nullif(r->>'how_he_answered', ''),
    nullif(r->>'voicemail_greeting', ''), nullif(r->>'first_name', ''), nullif(r->>'best_time', ''), nullif(r->>'background', ''))
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
    shop_id           = coalesce(t.shop_id, excluded.shop_id),
    number_dialed     = coalesce(t.number_dialed, excluded.number_dialed),
    how_he_answered   = case when excluded.decided_ms >= t.decided_ms then coalesce(excluded.how_he_answered, t.how_he_answered) else t.how_he_answered end,
    voicemail_greeting= case when excluded.decided_ms >= t.decided_ms then coalesce(excluded.voicemail_greeting, t.voicemail_greeting) else t.voicemail_greeting end,
    first_name        = case when excluded.decided_ms >= t.decided_ms then coalesce(excluded.first_name, t.first_name) else t.first_name end,
    best_time         = case when excluded.decided_ms >= t.decided_ms then coalesce(excluded.best_time, t.best_time) else t.best_time end,
    background        = case when excluded.decided_ms >= t.decided_ms then coalesce(excluded.background, t.background) else t.background end,
    -- the decision: replaced only by a same-or-newer run, and never by an undecided write over a decided row
    attempt_no        = case when excluded.decided_ms >= t.decided_ms and (excluded.result_stage is not null or t.result_stage is null)
                             then coalesce(excluded.attempt_no, t.attempt_no) else t.attempt_no end,
    screener_outcome  = case when excluded.decided_ms >= t.decided_ms and (excluded.result_stage is not null or t.result_stage is null)
                             then excluded.screener_outcome else t.screener_outcome end,
    noise             = case when excluded.decided_ms >= t.decided_ms and (excluded.result_stage is not null or t.result_stage is null)
                             then excluded.noise else t.noise end,
    match             = case when excluded.decided_ms >= t.decided_ms and (excluded.result_stage is not null or t.result_stage is null)
                             then excluded.match else t.match end,
    result_stage      = case when excluded.decided_ms >= t.decided_ms and (excluded.result_stage is not null or t.result_stage is null)
                             then excluded.result_stage else t.result_stage end,
    reason            = case when excluded.decided_ms >= t.decided_ms and (excluded.result_stage is not null or t.result_stage is null)
                             then excluded.reason else t.reason end,
    decided_ms        = case when excluded.decided_ms >= t.decided_ms and (excluded.result_stage is not null or t.result_stage is null)
                             then greatest(excluded.decided_ms, t.decided_ms) else t.decided_ms end,
    updated_at        = excluded.updated_at;
$$;
revoke execute on function public.screener_log_upsert(jsonb) from public, anon, authenticated;
grant execute on function public.screener_log_upsert(jsonb) to service_role;

revoke all on public.screener_log, public.screener_accuracy, public.screener_last_24h from anon, authenticated;
