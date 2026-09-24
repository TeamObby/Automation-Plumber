-- Screener log (spec §10.2 item 7a). Applied 2026-09-25 to Supabase project screener-helper
-- (cifgvpqfodglnhywrofy, org Waterline) as migration create_screener_log.
-- One row per screener event: an answered call (upserted as the compare step learns more: the AI verdict,
-- the screener's pick, the result) or an unanswered dial (no-answer / voicemail / bad-number).
-- Written by n8n: Screener: Compare Step (calls) and Screener: Attempt Counter (unanswered dials).

create table if not exists public.screener_log (
  event_key         text primary key,        -- 'call:<call_id>', or the ladder key 'wavv:<id>' / 'na:<contact>:<ms>'
  event             text not null check (event in ('call', 'no-answer', 'voicemail', 'bad-number')),
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
  updated_at        timestamptz not null default now()
);

create index if not exists screener_log_contact on public.screener_log (ghl_contact_id);
create index if not exists screener_log_screener on public.screener_log (screener_user_id, event_at);

-- Only the service-role key (n8n) reads and writes; no public access.
alter table public.screener_log enable row level security;

-- Item 8: match rate per screener. A call counts once the compare has decided (match not null).
-- security_invoker: the view follows the table's RLS instead of running with its owner's rights.
create or replace view public.screener_accuracy with (security_invoker = true) as
select screener_user_id,
       count(*) filter (where event = 'call')                                  as calls,
       count(*) filter (where match is not null)                               as compared,
       count(*) filter (where match)                                           as matched,
       round(100.0 * count(*) filter (where match)
             / nullif(count(*) filter (where match is not null), 0), 1)        as match_pct
from public.screener_log
group by screener_user_id;
