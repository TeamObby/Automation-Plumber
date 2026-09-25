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

## Half-failed sweeps (codex review, 2026-09-25)
A re-screen clears Date Screened first; if a later write failed (e.g. the stage move), the next sweep would no
longer see the lead as stale and it would stay half changed. Now a contact with any failed write is saved in
**`screener_sweep_pending`** `J61RThPMfxykZt1N` (`contact_id`, `ops_json` = all its writes, `error`, `queued_at`,
`first_failed_at`); pending contacts are always re-read (**Pending sweeps** → Candidates). **Plan Sweep**: if the
fresh decision plans writes, those win; if it plans nothing, the saved writes are **replayed** (all idempotent) —
unless the screener opportunity moved **after** `queued_at` (a newer call or dial happened), then they are dropped
and the lead is reported ("moved after a half-failed sweep — check by hand"). **Sweep Report** decides the table
changes; a side branch saves / clears them. A dry run never touches the table.

**Replay guards (4th codex review, 2026-09-25).** A replay re-checks the current re-screen guards (Decide now
outputs `open_kevin` and `dnd`): if the saved writes contain any re-screen write (clear fields, result tags,
`screening`, Attempt 1, screener-opp followers) and the lead **now** has an open Kevin opportunity or is **DND**,
nothing is replayed. The lead counts as blocked (reason kept: "not re-screened: … (earlier half-done re-screen
stopped)"), is listed under *Needs a human* ("half-done re-screens stopped — check by hand"), and its pending row is
cleared (the saved writes are dropped, so the summary says it once). Expire-only replays (hour tags and block
followers off) still run: expiry applies whatever the guards say.
**Write kinds (5th codex review, 2026-09-25).** Expiry and re-screen share the label `remove block followers
(screener opp)`, so the label cannot tell them apart: a blocked replay of a half-failed *expiry* was being dropped,
leaving the lead on Kevin's hour board. Decide now tags every write `kind: 'expire' | 'rescreen'`, Sweep Report keeps
the kind in `ops_json`, and a blocked replay drops only the `rescreen` writes and still replays the `expire` ones
(reason "… | expiry writes replayed"). A saved row without kinds counts as re-screen only by the writes a re-screen
alone makes (clear fields, result tags, `screening`, Attempt 1).

## What a re-screen writes
Clear Screener Outcome, Screen AI Verdict, Screen Attempts, Date Screened, Screen Noise (+ `assignedTo` = the
screener when `SCREENER_USER_ID` is set — optional since 2026-09-25: Topu has normal access, not Only Assigned Data) → remove leftover result
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

- Half-failed sweep, live 2026-09-25: Dana put in Gatekeeper with no Date Screened (codex's state) and a saved
  "move to Attempt 1" queued after it → the sweep (123884) found her by the Gatekeeper search **and** the pending
  table, replayed exactly that write (Dana back in Attempt 1, checked by a direct GET) and cleared the row; the next
  run (123885) had no pending row. The summary said "1 earlier half-done sweeps finished".
- Replay guards: offline only (§14: DND stopped, open Kevin opp stopped with the reason kept, expire-only replay
  still allowed, stopped clears the pending row, summary line; mutation-checked). Deployed 2026-09-25 and re-pulled;
  not run live because a real run (DRY_RUN off) would also sweep any real stale leads.
- Write kinds: offline (§14: the codex repro — expiry with a failed screener-opp follower removal is replayed with an
  open Kevin opp; a mixed plan keeps its expiry writes; an old row without kinds; saved rows keep kinds;
  mutation-checked). Deployed 2026-09-25 and re-pulled.

## TODOs
- `SCREENER_USER_ID` optional (Topu has normal access). While empty, the summary still warns "no screener
  assigned" for re-screened leads — drop that warning if nobody wants the assignment.
- Pagination: each search reads 100; a full page is reported in Slack as truncated.
