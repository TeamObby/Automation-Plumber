-- Codex review fixes on the 2026-09-26 migrations (waterline_v1, screener_log_task5). Migration name:
-- screener_log_codex_fixes. Supersedes the calls view in waterline_v1.sql and the function in screener_log_task5.sql.
--
-- 1. Per-call fields get their own version, fields_ms. Before: they were accepted when decided_ms >= the row's
--    decided_ms, but an undecided write does not advance decided_ms, so a delayed older write could overwrite newer
--    details (Codex: version 300 "Business name", then delayed 200 "Just hello" won). Now: a write that carries at least
--    one of the fields is accepted only if its decided_ms >= fields_ms, and then advances fields_ms. A write without
--    any of them never touches them or the version.
-- 2. calls view: an unmarked answered-call row that the AI heard as a machine is left out ONLY when a matching WAVV
--    voicemail / no-answer row exists (same WAVV call id, or the same contact within 10 minutes). A null AI outcome
--    no longer hides the row (NULL IN (...) made the old filter drop it).

alter table public.screener_log add column if not exists fields_ms bigint not null default 0;

create or replace function public.screener_log_upsert(r jsonb) returns void
language sql security invoker set search_path = '' as $$
  insert into public.screener_log as t (event_key, event, event_at, ghl_contact_id, company, screener_user_id, attempt_no,
    duration_sec, pt_block, screener_outcome, noise, ai_call_outcome, ai_owner_reached, ai_confidence, ai_quote_verified,
    match, result_stage, reason, call_id, recording_url, transcript, decided_ms, updated_at,
    shop_id, number_dialed, how_he_answered, voicemail_greeting, first_name, best_time, background, fields_ms)
  values (r->>'event_key', r->>'event', (r->>'event_at')::timestamptz, r->>'ghl_contact_id', r->>'company',
    r->>'screener_user_id', (r->>'attempt_no')::integer, (r->>'duration_sec')::integer, r->>'pt_block',
    r->>'screener_outcome', r->>'noise', r->>'ai_call_outcome', r->>'ai_owner_reached', (r->>'ai_confidence')::numeric,
    (r->>'ai_quote_verified')::boolean, (r->>'match')::boolean, r->>'result_stage', r->>'reason', r->>'call_id',
    r->>'recording_url', r->>'transcript', coalesce((r->>'decided_ms')::bigint, 0), coalesce((r->>'updated_at')::timestamptz, now()),
    nullif(r->>'shop_id', ''), nullif(r->>'number_dialed', ''), nullif(r->>'how_he_answered', ''),
    nullif(r->>'voicemail_greeting', ''), nullif(r->>'first_name', ''), nullif(r->>'best_time', ''), nullif(r->>'background', ''),
    case when coalesce(nullif(r->>'how_he_answered',''), nullif(r->>'voicemail_greeting',''), nullif(r->>'first_name',''),
                       nullif(r->>'best_time',''), nullif(r->>'background','')) is not null
         then coalesce((r->>'decided_ms')::bigint, 0) else 0 end)
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
    -- Topu's per-call fields: their own version (fields_ms); only a write that carries one of them counts
    how_he_answered   = case when excluded.fields_ms > 0 and excluded.fields_ms >= t.fields_ms
                             then coalesce(excluded.how_he_answered, t.how_he_answered) else t.how_he_answered end,
    voicemail_greeting= case when excluded.fields_ms > 0 and excluded.fields_ms >= t.fields_ms
                             then coalesce(excluded.voicemail_greeting, t.voicemail_greeting) else t.voicemail_greeting end,
    first_name        = case when excluded.fields_ms > 0 and excluded.fields_ms >= t.fields_ms
                             then coalesce(excluded.first_name, t.first_name) else t.first_name end,
    best_time         = case when excluded.fields_ms > 0 and excluded.fields_ms >= t.fields_ms
                             then coalesce(excluded.best_time, t.best_time) else t.best_time end,
    background        = case when excluded.fields_ms > 0 and excluded.fields_ms >= t.fields_ms
                             then coalesce(excluded.background, t.background) else t.background end,
    fields_ms         = case when excluded.fields_ms > 0 and excluded.fields_ms >= t.fields_ms
                             then excluded.fields_ms else t.fields_ms end,
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

create or replace view public.calls with (security_invoker = true) as
select l.event_key                                      as id,
       s.shop_id,
       l.ghl_contact_id,
       l.event_at                                       as called_at,
       'outbound'::text                                 as direction,
       'screen'::text                                   as call_type,
       'Topu'::text                                     as caller,
       coalesce(l.screener_outcome,
                case l.event when 'no-answer'  then 'No Answer'
                             when 'voicemail'  then 'Voicemail'
                             when 'bad-number' then 'Wrong Number' end) as outcome,
       l.duration_sec,
       l.recording_url,
       l.transcript,
       l.ai_call_outcome                                as ai_outcome,
       l.ai_confidence,
       case when l.ai_call_outcome is not null then l.updated_at end as ai_checked_at,
       (l.match = false)                                as ai_mismatch,
       l.result_stage,
       l.attempt_no,
       l.pt_block,
       l.noise,
       l.event                                          as source_event
from public.screener_log l
left join public.shops s on s.ghl_contact_id = l.ghl_contact_id
where l.event <> 'graduated'
  and not (l.event = 'call'
           and l.screener_outcome is null
           and coalesce(l.ai_call_outcome, '') in ('voicemail', 'no_conversation')
           and exists (select 1 from public.screener_log d
                       where d.event in ('voicemail', 'no-answer')
                         and (d.event_key = 'wavv:' || l.call_id
                              or (d.ghl_contact_id = l.ghl_contact_id
                                  and d.event_at between l.event_at - interval '10 minutes'
                                                     and l.event_at + interval '10 minutes'))));
revoke all on public.calls from anon, authenticated;
