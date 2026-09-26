-- California list load (plan-2026-09-26 §A, Task 4 step 3). Ran once on 2026-09-26 via execute_sql, in one transaction.
-- Inputs: two holding tables imported through the Supabase dashboard (CSV import), now parked in schema archive:
--   archive.staging_ca_v2_list   <- ca_v2_list.csv (Kevin's v2.2 list, 18,413 rows; docs/slack-agentic-2026-09-25/07-task-8-list-upload/ca_v2_list.zip)
--   archive.staging_our_shops_ca <- our_shops_CA.csv (docs/slack-agentic-2026-09-25/01-ca-list-ai-check/): street address,
--                                   legal name, and the OLD-<phone> id for the 1,071 rows with no licence number (matched on phone).
-- Mapping: shop_id = licence number, else the OLD- id. set_id stays empty (it means "loaded into GHL"); Kevin's planned
-- v2.2 set goes to extra.v22_set_id. Every other column goes to extra. shop_phones: the dial number (from the Google
-- listing, is_main), the licence phone (licence_only unless it is also the dial number), and alt phones. shared_with =
-- how many other shops advertise the same number. score_history: Kevin's v2.2 score as each shop's first entry.
-- Result (2026-09-26): 18,413 shops = 17,567 new / 487 held / 359 disqualified; 1,071 OLD- ids; 0 duplicate licence
-- numbers; 7 dial numbers shared across 15 shops (Kevin's duplicates query); 2,528 shops with a dial number;
-- shop_phones 18,998 rows (2,528 main, 16,393 licence-only, 77 alt); score_history 18,413; 300 random-control shops.
-- The checks in step 4 abort and undo the whole load if any count differs.

begin;

with src as (
  select c.*,
         coalesce(nullif(c.licence_number,''), o_old.shop_id)          as sid,
         coalesce(o_lic.address, o_old.address)                        as street,
         coalesce(o_lic.other_name, o_old.other_name)                  as other_name_o
  from public.staging_ca_v2_list c
  left join public.staging_our_shops_ca o_lic
         on o_lic.shop_id = nullif(c.licence_number,'')
  left join public.staging_our_shops_ca o_old
         on nullif(c.licence_number,'') is null and o_old.shop_id like 'OLD-%'
        and (o_old.phone_2 = c.dial_number or o_old.phone_1 = c.dial_number)
)
insert into public.shops (shop_id, shop_name, dial_number, city, state, zip, timezone, website, owner_first, owner_last,
  licence_number, licence_status, size_group, segment, tier, score_version, top_reasons, missing_data, status, exit_reason,
  sources, extra)
select sid,
       coalesce(nullif(shop_name,''), nullif(legal_name,''), nullif(other_name_o,''), sid),
       nullif(dial_number,''), nullif(city,''), coalesce(nullif(state,''),'CA'), nullif(zip,''), nullif(timezone,''),
       nullif(website,''), nullif(owner_first,''), nullif(owner_last,''), nullif(licence_number,''), nullif(licence_status,''),
       nullif(size_group,''), nullif(segment,''), nullif(tier,'')::numeric::int, nullif(score_version,''), nullif(why,''),
       nullif(missing_data,''), status, nullif(exit_reason,''),
       to_jsonb(array_remove(array['ca_v2_list', nullif(source,'')], null)),
       jsonb_strip_nulls(jsonb_build_object(
         'legal_name', nullif(legal_name,''), 'other_name', nullif(other_name_o,''), 'address', nullif(street,''),
         'county', nullif(county,''), 'priority', priority, 'p_owner', p_owner, 'p_residential', p_residential,
         'value', value, 'size_boost', nullif(size_boost,''), 'calls_score', calls_score,
         'direction_score', nullif(direction_score,''), 'owner_title', nullif(owner_title,''),
         'business_type', nullif(business_type,''), 'classes', nullif(classes,''), 'workers_comp', nullif(workers_comp,''),
         'licence_issued', nullif(licence_issued,''), 'ppp_jobs', nullif(ppp_jobs,''), 'n_officers', nullif(n_officers,''),
         'google_reviews', nullif(google_reviews,''), 'google_rating', nullif(google_rating,''),
         'google_ads', nullif(google_ads,''), 'google_match', nullif(google_match,''),
         'google_link_check', nullif(google_link_check,''), 'place_id', nullif(place_id,''),
         'random_control', random_control, 'ready_to_dial', ready_to_dial, 'call_order', call_order,
         'v22_set_id', nullif(set_id,''), 'licence_phone', nullif(licence_phone,''), 'alt_phones', nullif(alt_phones,'')))
from src;

with p as (
  select shop_id, dial_number as phone,
         case when extra->>'licence_phone' = dial_number then 'google,licence' else 'google' end as sources,
         true as is_main, true as on_google, false as lic_only
  from public.shops where dial_number is not null
  union all
  select shop_id, extra->>'licence_phone', 'licence', false, false, true
  from public.shops where extra ? 'licence_phone' and extra->>'licence_phone' is distinct from dial_number
  union all
  select s.shop_id,
         case when length(d) = 10 then '+1' || d when length(d) = 11 and left(d,1) = '1' then '+' || d end,
         'alt', false, false, false
  from public.shops s,
       lateral regexp_split_to_table(s.extra->>'alt_phones', '[;,|/]+') t(tok),
       lateral (select regexp_replace(tok, '\D', '', 'g') as d) n
  where s.extra ? 'alt_phones'
)
insert into public.shop_phones (shop_id, phone, sources, is_main, on_google_listing, licence_only)
select distinct on (shop_id, phone) shop_id, phone, sources, is_main, on_google, lic_only
from p where phone is not null
order by shop_id, phone, is_main desc
on conflict (shop_id, phone) do nothing;

update public.shop_phones p set shared_with = x.n - 1
from (select phone, count(distinct shop_id) as n from public.shop_phones group by phone) x
where x.phone = p.phone and x.n > 1;

insert into public.score_history (shop_id, scored_at, score_version, tier, priority, reasons, source, raw)
select shop_id, '2026-09-24T00:00:00Z', score_version, tier, (extra->>'priority')::numeric, top_reasons,
       'ca_v2_list.csv (Kevin v2.2)',
       jsonb_strip_nulls(jsonb_build_object('p_owner', extra->'p_owner', 'p_residential', extra->'p_residential',
         'value', extra->'value', 'size_boost', extra->'size_boost', 'calls_score', extra->'calls_score',
         'direction_score', extra->'direction_score', 'size_group', size_group, 'segment', segment,
         'status', status, 'v22_set_id', extra->'v22_set_id', 'random_control', extra->'random_control'))
from public.shops where score_version is not null;

do $$
declare n int; nn int; d int; dr int; o int;
begin
  select count(*) into n from public.shops;
  if n <> 18413 then raise exception 'shops = %, expected 18413', n; end if;
  select count(*) into nn from public.shops where status = 'new';
  if nn <> 17567 then raise exception 'new = %, expected 17567', nn; end if;
  select count(*) into nn from public.shops where status = 'held';
  if nn <> 487 then raise exception 'held = %, expected 487', nn; end if;
  select count(*) into nn from public.shops where status = 'disqualified';
  if nn <> 359 then raise exception 'disqualified = %, expected 359', nn; end if;
  select count(*) into o from public.shops where shop_id like 'OLD-%';
  if o <> 1071 then raise exception 'OLD- ids = %, expected 1071', o; end if;
  select count(*), coalesce(sum(c),0) into d, dr from (select dial_number, count(*) c from public.shops
    where dial_number is not null group by 1 having count(*) > 1) z;
  if d <> 7 or dr <> 15 then raise exception 'shared dial numbers = % across % rows, expected 7 across 15', d, dr; end if;
end $$;

alter table public.staging_ca_v2_list  set schema archive;
alter table public.staging_our_shops_ca set schema archive;

commit;
