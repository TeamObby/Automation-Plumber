-- ⚠️ The calls view below is superseded by supabase/screener_log_codex_fixes.sql (Codex fix, 2026-09-26).
-- Waterline v1: Kevin's Task 4 database, adapted to the live screener (docs/plan-2026-09-26.md §A and §B).
-- Target: Supabase project screener-helper (cifgvpqfodglnhywrofy). Migration name: waterline_v1.
-- Source: Kevin's waterline_pipeline zip (supabase_v1_schema.sql, task8_tables.sql, job_ads_table.sql,
-- task9_phones.sql), copied verbatim where marked "Kevin, verbatim".
--
-- What this does:
--   1. Moves our empty first-design tables (shops, shop_raw, call_log, view transcripts) to schema archive.
--      Nothing is deleted. It refuses to run if any of them holds a row.
--   2. Creates Kevin's list tables: shops, shop_phones (+ 2 Task 9 columns), raw_pages, sets, source_records,
--      needs_check, job_ads, and his outcome_group() function.
--   3. Adds score_history: the score a shop had when it was loaded or re-scored (replaces frozen_at_first_dial,
--      which only Kevin's log_call filled).
--   4. Adds read-only views: calls (screener_log under Kevin's column names), shop_call_state (list state from
--      shops + call state from screener_log), and Kevin's screener_hourly / screener_daily over calls.
--   5. RLS on every table, security_invoker on every view, anon/authenticated revoked everywhere.
--
-- Deliberately NOT created (see the plan): the calls TABLE, log_call(), record_ai_check(), attach_transcript(),
-- Kevin's shop_call_state as written (it reads columns only log_call writes), and task9_phones.sql's settings /
-- next_phone() / log_call(). screener_log, screener_log_upsert and the n8n views are not touched.
--
-- Rollback (only while the new tables are empty):
--   drop view public.screener_daily, public.screener_hourly, public.shop_call_state, public.calls;
--   drop table public.score_history, public.job_ads, public.needs_check, public.source_records,
--              public.sets, public.raw_pages, public.shop_phones, public.shops;
--   drop function public.outcome_group(text); drop sequence public.shop_seq;
--   alter table archive.shops set schema public; alter table archive.shop_raw set schema public;
--   alter table archive.call_log set schema public; alter view archive.transcripts set schema public;

-- 1. Archive our first-design tables (only if they are still ours and still empty) ----------------------
create schema if not exists archive;
revoke all on schema archive from public, anon, authenticated;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'shops' and column_name = 'call_set') then
    if exists (select 1 from public.shops) or exists (select 1 from public.shop_raw)
       or exists (select 1 from public.call_log) then
      raise exception 'waterline_v1: public.shops / shop_raw / call_log are not empty; refusing to archive them';
    end if;
    if to_regclass('public.transcripts') is not null then
      alter view public.transcripts set schema archive;
    end if;
    alter table public.shop_raw    set schema archive;
    alter table public.call_log    set schema archive;
    alter table public.shops       set schema archive;
  end if;
end $$;

set search_path = public;

-- 2. Kevin's list tables (Kevin, verbatim) ----------------------------------------------------------
create sequence if not exists shop_seq start 1;

create table if not exists shops (
  shop_id            text primary key default ('WL-' || lpad(nextval('shop_seq')::text, 6, '0')),
  ghl_contact_id     text unique,                 -- GHL contact ID (filled when loaded into GHL)
  shop_name          text not null,
  dial_number        text,                        -- the advertised number only, as +1XXXXXXXXXX
  city text, state text, zip text,
  timezone           text,                        -- e.g. America/Los_Angeles
  website            text,
  owner_first text, owner_last text,
  licence_number text, licence_status text,
  size_group         text,                        -- solo / 2-5 / 6-20 / unknown
  segment            text,                        -- A..I from the SEGMENT MAP
  fit text, sure text,                            -- H / M / L
  tier               int,
  score_version      text,                        -- e.g. v1
  top_reasons        text,
  missing_data       text,
  set_id             text,                        -- which batch it was loaded in
  status             text not null default 'new',
  exit_reason        text,                        -- e.g. out-7g, wrong-number, dnc
  who_answered       text,
  best_time_to_call  text,
  background         text,                        -- latest Screen Noise when someone answered
  answer_style       text,
  vm_greeting        text,                        -- latest voicemail greeting type (Mailbox full = misses calls)
  said_busy          text,                        -- from the AI check
  screen_flag        boolean not null default false, -- AI disagreed with the screener; needs a look
  owner_class        text,                        -- likely / maybe / unlikely (owner answers)   [decision 26]
  residential_class  text,                        -- likely / unsure / unlikely (home jobs)      [decision 26]
  in_call_pool       boolean generated always as (owner_class = 'likely' and residential_class = 'likely') stored,
  screen_attempts    int not null default 0,
  first_dialed_at    timestamptz,
  frozen_at_first_dial jsonb,                     -- copy of tier/fit/sure/reasons at first dial
  sales_result       text,
  customer_start date, cancel_date date, cancel_reason text,
  calls_caught_total int,
  sources            jsonb,                       -- which lists this shop came from
  extra              jsonb,                       -- any other columns we collect
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint status_ok check (status in (
    'new','queued','screening','owner_confirmed','with_kevin','demo_booked','customer','lost',
    'out_gatekeeper','disqualified','dnc','exhausted','called_before','held'))
);
create index if not exists shops_dial_idx   on shops (dial_number);
create index if not exists shops_set_idx    on shops (set_id);
create index if not exists shops_status_idx on shops (status);
create index if not exists shops_tier_idx   on shops (state, tier);

-- Every advertised phone number found for a shop (one row per shop + number). The shop keeps ONE main dial_number.
create table if not exists shop_phones (
  id            bigint generated always as identity primary key,
  shop_id       text not null references shops (shop_id),
  phone         text not null,                 -- +1XXXXXXXXXX
  sources       text,                          -- where it's advertised: google, website, yelp, facebook, angi...
  is_main       boolean not null default false, -- the number the screener dials first (usually the Google listing's)
  line_type     text,                          -- mobile / landline / voip / tollfree (ClearoutPhone or Twilio)
  carrier       text,
  valid         boolean,
  screen_result text,                          -- outcome when this number was screened, if it was
  shared_with   int not null default 0,        -- how many OTHER shops advertise this same number (answering service / agency sign)
  unique (shop_id, phone)
);
create index if not exists shop_phones_phone_idx on shop_phones (phone);

create table if not exists raw_pages (
  id          bigint generated always as identity primary key,
  shop_id     text references shops (shop_id),
  kind        text,          -- website / google_reviews / yelp_reviews / job_ad / google_ads / lsa
  url         text,
  content     text,
  source_tool text,          -- e.g. dataforseo, apify, manual
  fetched_at  timestamptz not null default now()
);
create index if not exists raw_shop_idx on raw_pages (shop_id);

create table if not exists sets (
  set_id    text primary key,    -- e.g. CA-A1-S01, CA-RANDOM-S01
  state     text,
  tier      int,
  segment   text,
  size      int,
  loaded_at timestamptz,
  done_at   timestamptz,
  notes     text
);

-- Task 9 columns only (Kevin, verbatim from task9_phones.sql). settings / next_phone / log_call are not run.
alter table shop_phones add column if not exists on_google_listing boolean not null default false;
alter table shop_phones add column if not exists licence_only boolean not null default false;

-- TASK 8: tables for the list upload + merge program. Safe to run more than once. Never deletes anything.
create table if not exists source_records (
  id bigserial primary key,
  source text not null,              -- which tool or list: dataforseo_maps, yelp, old_google_list, licence_tx ...
  source_id text not null,           -- that tool's own id for the record (place_id, yelp id, licence number ...)
  shop_id text,                      -- the shop it was attached to (empty if not attached)
  action text not null,              -- ATTACH / NEW_SHOP / NEEDS_CHECK / CONFLICT / UPDATE / SKIP / NO_MATCH
  verdict text, proofs text, reason text,
  name text, phone text, city text, state text,
  raw jsonb,                         -- the full record exactly as the tool gave it
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (source, source_id)         -- the same record can never be saved twice
);
create index if not exists source_records_shop on source_records (shop_id);

create table if not exists needs_check (
  id bigserial primary key,
  source text not null, source_id text not null,
  candidate_shop_ids text,           -- the shop(s) it might belong to
  reason text,
  raw jsonb,
  status text not null default 'open',   -- open / attached / new_shop / rejected
  resolved_shop_id text, resolved_by text, resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source, source_id)
);
alter table source_records enable row level security;
alter table needs_check enable row level security;

-- TASK 2: every job ad found. Safe to run more than once. Never deletes anything.
create table if not exists job_ads (
  job_id text primary key,            -- Google Jobs id (or source + url)
  title text, company text, city text, state text,
  posted_date date, source_site text, url text, description text, salary text,
  keyword text,                       -- which search found it
  is_plumbing_employer boolean,       -- after the filter
  drop_reason text,                   -- staffing agency / franchise / property manager / big contractor
  shop_id text,                       -- the shop it matched (task 8)
  result text,                        -- hot / replacing / no action / needs check
  first_seen timestamptz not null default now()
);
alter table job_ads enable row level security;

-- Kevin's outcome groups (verbatim logic; search_path pinned for the security advisor).
create or replace function outcome_group(o text) returns text language sql immutable set search_path = '' as $$
  select case
    when o in ('Owner - Busy','Owner - Quiet')   then 'owner'
    when o = 'Gatekeeper'                        then 'gatekeeper'
    when o in ('No Answer','Voicemail')          then 'no_answer'
    when o in ('Wrong Number','Not A Plumber')   then 'wrong'
    when o = 'Do Not Call'                       then 'dnc'
    when o = 'Not Sure'                          then 'unsure'
    else 'unknown' end;
$$;

-- 3. score_history (added) ------------------------------------------------------------------------------
-- One row per scoring of a shop. "The score at call time" = the latest row before the shop's first dial.
create table if not exists score_history (
  id                bigint generated always as identity primary key,
  shop_id           text not null references shops (shop_id),
  scored_at         timestamptz not null default now(),
  score_version     text,            -- e.g. v2.2-CA-2026-09-24
  tier              int,
  priority          numeric,
  owner_class       text,            -- likely / maybe / unlikely
  residential_class text,            -- likely / unsure / unlikely
  reasons           text,            -- the "why" shown to the caller
  source            text,            -- which file or run wrote it
  raw               jsonb            -- the full scored row
);
create index if not exists score_history_shop_idx on score_history (shop_id, scored_at);

-- 4. Views ---------------------------------------------------------------------------------------------
-- calls: screener_log (the only call log, written by n8n) under Kevin's column names.
--   caller: every screener_log row is Topu's until a second dialler exists; then map screener_user_id here.
--   outcome: the screener's pick, else the dial event (No Answer / Voicemail / Wrong Number).
--   Left out: graduated events, and answered-call rows the AI heard as a machine with no pick
--   (the WAVV voicemail event already logs that dial, so it would count twice).
create or replace view calls with (security_invoker = true) as
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
  and not (l.event = 'call' and l.screener_outcome is null
           and l.ai_call_outcome in ('voicemail', 'no_conversation'));

-- shop_call_state: Kevin's "called or not" answer per shop. The list side comes from shops.status (written by
-- the loader: new / queued / called_before / held / disqualified); the call side from each shop's latest
-- decided screener_log row, matched on ghl_contact_id. Nothing call-related is stored on shops.
create or replace view shop_call_state with (security_invoker = true) as
with last_decided as (
  select distinct on (ghl_contact_id) ghl_contact_id, event, result_stage, event_at
  from public.screener_log
  where event = 'graduated' or result_stage is not null
  order by ghl_contact_id, event_at desc, updated_at desc),
dials as (
  select ghl_contact_id, max(attempt_no) as screen_attempts, min(event_at) as first_dialed_at
  from public.screener_log
  where event <> 'graduated'
  group by ghl_contact_id)
select s.shop_id, s.shop_name, s.state, s.set_id, s.owner_class, s.residential_class, s.in_call_pool, s.status,
       coalesce(d.screen_attempts, 0) as screen_attempts,
       d.first_dialed_at,
       ld.result_stage                as last_result,
       case
         when ld.event = 'graduated' or ld.result_stage = 'Owner Verified'  then 'with Kevin'
         when ld.result_stage in ('Gatekeeper', 'Disqualified', 'Exhausted') then 'out'
         when ld.result_stage = 'Not Sure'                                   then 'screened: not sure'
         when d.first_dialed_at is not null or s.status in ('queued', 'screening') then 'in screener queue'
         when s.status = 'called_before'                                     then 'called before'
         when s.status = 'held'                                              then 'saved for later'
         when s.status in ('disqualified', 'dnc', 'lost', 'exhausted', 'out_gatekeeper') then 'out'
         when s.status = 'new'                                               then 'never called'
         else s.status end            as call_state
from shops s
left join dials d        on d.ghl_contact_id  = s.ghl_contact_id
left join last_decided ld on ld.ghl_contact_id = s.ghl_contact_id;

-- Kevin's productivity views (Kevin, verbatim, plus security_invoker), now reading the calls view.
create or replace view screener_hourly with (security_invoker = true) as
with x as (
  select caller, called_at at time zone 'America/Los_Angeles' as t, outcome, duration_sec, ai_mismatch,
         extract(epoch from called_at - lag(called_at) over (partition by caller order by called_at)) as gap_sec
  from calls where call_type in ('screen','callback'))
select caller, date_trunc('hour', t) as hour,
       count(*)                                                     as dials,
       count(*) filter (where outcome_group(outcome) not in ('no_answer','unknown')) as answered,
       count(*) filter (where outcome_group(outcome) = 'owner')     as owners,
       count(*) filter (where outcome_group(outcome) = 'gatekeeper') as gatekeepers,
       round(avg(gap_sec) filter (where gap_sec < 900))             as avg_sec_between_dials,
       round(sum(coalesce(duration_sec,0)) / 60.0, 1)               as talk_min,
       count(*) filter (where ai_mismatch)                          as ai_flags
from x group by 1, 2;

create or replace view screener_daily with (security_invoker = true) as
with x as (
  select caller, called_at at time zone 'America/Los_Angeles' as t, outcome, ai_mismatch, ai_checked_at,
         extract(epoch from called_at - lag(called_at) over (partition by caller, (called_at at time zone 'America/Los_Angeles')::date order by called_at)) as gap_sec
  from calls where call_type in ('screen','callback'))
select caller, t::date as day,
       count(*)                                                        as dials,
       min(t)::time                                                    as first_dial,
       max(t)::time                                                    as last_dial,
       round(count(distinct date_trunc('minute', t) - (extract(minute from t)::int % 10) * interval '1 minute') / 6.0, 1) as active_hours,
       round(count(*) / nullif(count(distinct date_trunc('minute', t) - (extract(minute from t)::int % 10) * interval '1 minute') / 6.0, 0)) as dials_per_active_hour,
       count(*) filter (where gap_sec > 900)                           as breaks_over_15_min,
       count(*) filter (where outcome_group(outcome) not in ('no_answer','unknown')) as answered,
       count(*) filter (where outcome_group(outcome) = 'owner')        as owners,
       round(100.0 * count(*) filter (where outcome_group(outcome) = 'owner')
             / nullif(count(*) filter (where outcome_group(outcome) not in ('no_answer','unknown')), 0)) as owner_pct_of_answered,
       count(*) filter (where ai_checked_at is not null)               as ai_checked,
       count(*) filter (where ai_mismatch)                             as ai_flags,
       round(100.0 * count(*) filter (where ai_mismatch) / nullif(count(*) filter (where ai_checked_at is not null), 0)) as ai_flag_pct
from x group by 1, 2;

-- 5. Security -------------------------------------------------------------------------------------------
alter table shops          enable row level security;
alter table shop_phones    enable row level security;
alter table raw_pages      enable row level security;
alter table sets           enable row level security;
alter table source_records enable row level security;
alter table needs_check    enable row level security;
alter table job_ads        enable row level security;
alter table score_history  enable row level security;
revoke all on shops, shop_phones, raw_pages, sets, source_records, needs_check, job_ads, score_history,
              calls, shop_call_state, screener_hourly, screener_daily
  from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;   -- shop_seq and the identity/serial sequences
revoke all on function outcome_group(text) from public, anon, authenticated;
grant execute on function outcome_group(text) to service_role;
