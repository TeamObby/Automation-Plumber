-- Supabase core tables for the plumber campaign (decided 2026-09-25; project screener-helper, migration
-- create_core_tables). Kevin's meeting (2026-09-24) named the tables: shops (Supabase id <-> GHL id, tier, set),
-- raw data, transcripts incl. screener calls, call logs. Decided by two planners (simplicity vs completeness)
-- arguing it out; rationale in docs/supabase-design.md.
--
-- Rules: Supabase keeps facts about shops and events; GHL keeps state (stages, tags, followers, opportunities).
-- Nothing is copied back from GHL, so there is no two-way sync. The logs join shops on ghl_contact_id with NO
-- foreign key: a live webhook write must never fail because a shop row is missing.
-- Writes only through the n8n service-role credential; RLS on with no policies; anon/authenticated revoked.

-- One row per shop. id is Kevin's "Shop ID" (a short number people can type into GHL search).
create table if not exists public.shops (
  id               bigint generated always as identity primary key,
  ghl_contact_id   text unique,            -- null until the shop is loaded into / found in GHL
  google_place_id  text unique,            -- the list import's upsert key (Tosif's data is keyed on it)
  phone            text unique,            -- E.164, as GHL stores it; GHL rejects duplicate phones account-wide, so
                                           -- this links the GHL backfill to the list import. A clash fails loudly.
  name             text,                   -- nullable: GHL contacts can lack a company (backfill uses Graduate's fallback)
  website          text,
  city             text,
  state            char(2),
  tier             smallint check (tier >= 1),
  call_set         text,                   -- Kevin's set label, same as the Notion tracker row ("CA-T1-S02", "Group A")
  source_batch     text,                   -- where the row came from: 'ghl-backfill', 'sample-test-2', 'ca-list-1', ...
  data             jsonb not null default '{}'::jsonb,  -- list + derived columns until Kevin fixes the set (after Sample Test 2)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists shops_call_set_idx on public.shops (call_set);
create index if not exists shops_state_tier_idx on public.shops (state, tier);
-- Tier and call_set are frozen once the set is loaded into GHL (re-scoring touches only unloaded shops).

-- Raw data per shop: website text, reviews, license records, phone-tool lookups. One row per shop x source x tool;
-- a re-fetch overwrites it. Both tools' results are kept side by side (Kevin ~46:34: compare Apify vs the free scraper).
create table if not exists public.shop_raw (
  shop_id     bigint not null references public.shops (id) on delete cascade,
  source      text not null,               -- free text: 'website', 'google_reviews', 'license', 'phone_lookup', ...
  tool        text not null default '',    -- 'dataforseo', 'apify', 'free-scraper', ...
  content     text,                        -- plain text (website pages)
  payload     jsonb,                       -- structured results (reviews array, API response)
  fetched_at  timestamptz not null default now(),
  primary key (shop_id, source, tool)
);

-- Kevin's campaign calls: a typed copy of the call_log tab of "Plumber Campaign Metrics" (metrics-sheet-setup.gs),
-- so the history backfills as a straight CSV import. Dropped: from_number (never filled), date_pt and ghl_link
-- (derivable). One writer per row (the disposition / missed-call handler rewrites the whole row), so plain
-- PostgREST upserts on log_key, the same last-write-wins as the sheet today.
create table if not exists public.call_log (
  log_key             text primary key,    -- 'call:<wavv call_id>', or 'miss:<contact_id>:<ms>' for missed calls
  called_at           timestamptz not null,
  ghl_contact_id      text not null,
  company             text,
  city                text,
  pipeline            text,
  stage_name          text,
  attempt_no          integer,
  is_mgr              boolean,
  is_missed_variant   boolean,
  picked_up           boolean,
  duration_sec        integer,
  disposition_source  text,
  disposition_slug    text,
  ai_outcome          text,
  final_outcome       text,
  resume_call_at      text,
  recording_url       text,
  call_id             text,
  transcript          text,                -- the sheet's call_transcript
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists call_log_contact_idx on public.call_log (ghl_contact_id);
create index if not exists call_log_called_at_idx on public.call_log (called_at);

-- screener_log gains the 'graduated' event: Graduate "marks the shop" by logging it through screener_log_upsert
-- (retry queue + Log Retry for free, works with no shop row). Key grad:<contact>:<screener_opp>:<close_ms>, because
-- a re-screen reopens the SAME screener opportunity and must not overwrite the first graduation.
alter table public.screener_log drop constraint if exists screener_log_event_check;
alter table public.screener_log add constraint screener_log_event_check
  check (event in ('call', 'no-answer', 'voicemail', 'bad-number', 'graduated'));

-- Kevin's "transcripts table" without storing anything twice: every call with a transcript, screener or Kevin.
create or replace view public.transcripts with (security_invoker = true) as
select 'screener'::text as caller, ghl_contact_id, event_at as at, call_id, result_stage as outcome, transcript
from public.screener_log where event = 'call' and transcript is not null
union all
select 'kevin'::text, ghl_contact_id, called_at, call_id, final_outcome, transcript
from public.call_log where transcript is not null;

alter table public.shops    enable row level security;
alter table public.shop_raw enable row level security;
alter table public.call_log enable row level security;
revoke all on public.shops, public.shop_raw, public.call_log, public.transcripts from anon, authenticated;
