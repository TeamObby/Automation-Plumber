# Supabase design: plumber campaign core tables

**Decided 2026-09-25**, delegated by Mohimenul. Two planners worked from the meeting notes, the spec, the hand-off, `screener_log.sql`, AGENTS.md and the Graduate / Capture Call code. Planner A optimised for simplicity; Planner B for completeness and analytics. Each reviewed the other's plan, and the final call is below.

- **Live** in project `screener-helper` (`cifgvpqfodglnhywrofy`) as migration `create_core_tables`.
- **Source:** [`supabase/core_tables.sql`](../supabase/core_tables.sql).

> **⚠️ Superseded (decided 2026-09-26):** these tables are being replaced by Kevin's design, per
> [`plan-2026-09-26.md`](plan-2026-09-26.md) section A.
> - Our empty `shops`, `shop_raw`, `call_log` and view `transcripts` move to schema `archive` (nothing is deleted).
> - Kevin's list tables, `score_history` and the views `calls` / `shop_call_state` / `screener_hourly` / `screener_daily`
>   are created in `waterline-pipeline`.
> - `screener_log` and its upsert stay, and are extended by Task 5.
>
> This file is kept as the record of the first design. The rules below still hold where the plan doesn't change them:
> facts in Supabase and state in GHL, RLS on, service role only, no two-way sync.

## What exists

| Object | What it is | Writer | Status |
|---|---|---|---|
| `shops` | One row per shop. `id` is Kevin's Shop ID and maps to `ghl_contact_id`. Also holds `tier`, `call_set` and `data` (jsonb). | GHL backfill and list import | empty; next step |
| `shop_raw` | Raw data per shop × `source` × `tool`: website text, reviews, license records, phone lookups. A re-fetch overwrites the row. | List / Sample Test 2 import | empty |
| `call_log` | Kevin's campaign calls: a typed copy of the Metrics sheet's `call_log` tab. | Sheet CSV backfill, then the 4 handlers | empty |
| `screener_log` | Every screener event (item 7a). Now also allows `graduated`. | Compare Step, Attempt Counter, later Graduate | live |
| view `transcripts` | Screener and Kevin transcripts in one list. | none; it is a view | live |

## Rules that must not drift

- **Supabase keeps facts; GHL keeps state.**
  - Supabase owns: shop identity, list attributes, tier, set and raw data.
  - GHL owns: stages, tags, followers, opportunities and Screener Outcome.
  - Nothing is copied back from GHL, so there is never a two-way sync. `Shop ID`, and `Tier`/`Set` if they are shown in GHL, are write-once copies there.
- **No foreign key from the logs to `shops`.** They join on `ghl_contact_id`, so a live webhook write never fails because a shop row is missing.
- **Dedupe keys.**
  - List import: upserts on `google_place_id`.
  - GHL backfill: matches on `phone`, E.164 on both sides. GHL rejects duplicate phones account-wide.
  - Both keys are unique, so a clash on phone fails loudly instead of merging two shops.
- **Freezing.** `tier` and `call_set` are frozen once the set is loaded into GHL.
- **`call_set` is Kevin's label as text** (`CA-T1-S02`, "Group A"), the same as the Notion tracker row name. Loading a set is `where call_set = …`.
- **List columns start in `data` (jsonb).** They are promoted to real columns only when a query needs them. Kevin fixes the column set after Sample Test 2.
- **"Graduate marks the shop"** means a `graduated` event in `screener_log`, keyed `grad:<contact>:<screener_opp>:<close_ms>`. The close time is in the key because a re-screen reopens the same screener opportunity. The event goes through `screener_log_upsert`, so it gets the retry queue and `Log Retry` for free. It also works when no shop row exists yet.
- **One writer per `call_log` row** (the handler rewrites the whole row), so plain PostgREST upserts are enough. `screener_log` keeps its versioned function because its writers race.
- **Security.** RLS is on with no policies, and `anon`/`authenticated` are revoked. Only the n8n service-role credential writes. Keep the service key off laptops: run imports from n8n or the SQL editor.

## Deliberately not built

- A separate transcripts table. `screener_log` and `call_log` already hold them; the view joins them.
- A closed/trial outcome table. That is V2, and GHL owns the opportunity outcome.
- Set or tier lookup tables, since the tracker is Notion.
- Enums.
- Per-review rows.
- Raw-data history.
- `graduated_at` / `kevin_opp_id` / `loaded_at` on `shops`. These would be GHL state copied over.
- Moving the n8n data tables. They are queues and dedupe state, not the record.
- An automated Supabase → GHL loader.

## Resolved disagreements

| Question | Decision | Why |
|---|---|---|
| Dedupe key: phone or place id | Both unique | Place id is the list's key. Phone is the only link to already-called GHL contacts. |
| Set: text or numbered | `call_set` text | Kevin says both "Set 2" and "Group A". The Notion rows are the names. |
| Extra shop columns | Only `source_batch` | It marks backfilled rows and answers "which list converts". |
| `shop_raw` | Overwrite per (source, tool), `content` text + `payload` jsonb | "Keep both tools" (~46:34) is covered. Cost belongs in the Sample Test report. |
| `call_log` write path | Plain upsert | One writer per row. The sheet already works last-write-wins. |
| `screener_log` changes | Only the `graduated` event | Nothing reads the rest yet. More columns would force an upsert-function rewrite and re-publishes. |

## Risks (need Kevin)

- **Free plan.** 500 MB and no backups. Website text for ~30k shops will not fit, and a source of truth needs backups. Recommendation: the Pro plan.
- **Account.** The project is in the Waterline org (a side account), not team@meetobby.com. Move it, or have Kevin OK it, before real data lands.
- **Phone format.** Phones must be E.164 on both sides, or the backfill match misses.
