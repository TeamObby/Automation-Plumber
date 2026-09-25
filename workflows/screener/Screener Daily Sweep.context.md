# Screener: Daily Sweep  [spec §7 freshness · §8 re-screen trap · §10.2 item 7b]

- **n8n ID:** `0GtpCj9xFK4xGZrX` · **URL:** https://n8n.meetobby.com/workflow/0GtpCj9xFK4xGZrX · **File:** `Screener Daily Sweep.json`
- **Folder:** `workflows/screener/` · built by `build/gen_dailysweep.js` (+ `src/daily_settings.js`, `stale_searches.js`,
  `stale_candidates.js`, `stale_decide.js`, `stale_plan.js`, `stale_report.js`, `summary_stage_urls.js`, `summary_build.js`)
- **Status:** created 2026-09-25, **inactive** — activate at go-live. Runs every day at **05:00 America/Los_Angeles**
  (the n8n instance timezone, confirmed from the trigger output), before the screeners' 08:00 PT shift.
- **Slack:** `#daily-screener-summary`, posted by **Slack [ Obby bot account ]** `QcTNBiXBrnH5rFkC`
  (`build/slack.json`). The node continues on error, so a Slack problem never fails the sweep. First post
  (123876) got `not_in_channel`; after the bot was invited, the summary posted (123877).

## Decisions (Mohimenul, 2026-09-25)
- **Stale graduated owner** (Date Screened > 14 days, still in Kevin's pipeline): **drop it from the hour lists** —
  `owner-confirmed`, the `screened-pt-*` tag and the block followers come off. Kevin keeps working the lead.
  (Spec §9's table said "and no open Kevin opportunity", which contradicted its own acceptance test "a 15-day-old
  lead drops out of Kevin's list by itself"; the acceptance test wins.)
- **Re-screen** (back to Attempt 1) after 14 days: **Gatekeeper, Not Sure, Exhausted, and graduated owners whose
  Kevin opportunity closed**. Never with an open opportunity in Kevin's pipelines (Manual Review included — the
  re-screen trap), never DND, never Disqualified, never the Attempt stages.
- **Daily summary → Slack.**

## Flow
Settings (DRY_RUN, MAX_CONTACTS 50, STALE_DAYS 14, SCREENER_USER_ID) → **GHL: owner-confirmed contacts**
(POST `/contacts/search`, tag filter) → **Stale searches** (Gatekeeper, Not Sure, Exhausted open; graduated = won) →
**Candidates** (one per contact; failed searches and full pages reported) → *Any candidates?* → One contact →
GHL: Get Contact → GHL: All Opps for Contact (`status=all`) → **Decide** → **Plan Sweep** (cap, dry run) →
*Write to GHL?* → Split → **GHL: Sweep Apply** → **Sweep Report** (every path lands here) → stage counts (9 GHL
searches, `meta.total`) → **Supabase: last 24h** (view `screener_last_24h`) → failed write-backs / failed
graduations / pending log writes (n8n tables) → **Build Summary** → **Slack: daily summary**.

## What a re-screen writes
Clear Screener Outcome, Screen AI Verdict, Screen Attempts, Date Screened, Screen Noise (+ `assignedTo` = the
screener when `SCREENER_USER_ID` is set — **needed: the screener sees Only Assigned Data**) → remove leftover result
tags → add `screening` → screener opportunity open in **Attempt 1** → block followers off it.

## Tested
- Offline: `tests/screener.test.js` §14 (every rule above, the 14/15-day edge, cap, dry run, report, summary, wiring).
- Live 2026-09-25: dry run (123869) — every GHL search accepted, 0 real candidates, stage counts, Supabase view,
  summary rendered; Slack `channel_not_found` (no channel yet) did not fail the run. Live write (123872): Dana staged
  as a graduated owner screened 23 days ago with her screener opp won → found by the tag and the graduated
  searches, **expire + re-screen**, 7 requests, 0 failed; a direct GET showed her back to clean (fields empty,
  `screening` on, screener opp open in Attempt 1).
- Found live: the follower removal also ran on Dana's open **demo** opportunity (harmless, nothing there); now
  limited to screener + Kevin opportunities (test added), deployed with the Slack settings.

## TODOs
- `SCREENER_USER_ID` = Topu's GHL user once Hridoy creates it.
- Pagination: each search reads 100; a full page is reported in Slack as truncated.
