# Screener build — pick-up-here notes

**Purpose:** everything a fresh session (or teammate) needs to continue the screener build without
re-deriving it. Written 2026-09-23. Full design: [`screener-system-plan.md`](screener-system-plan.md).
GHL side of the existing campaign: [`ghl-automations.md`](ghl-automations.md). Repo map: [`AGENTS.md`](../AGENTS.md).

---

## 1. Where it stands in one paragraph

The **GHL container is built** (pipeline, stages, fields, tags, 10 block users, test rig) and
**Mohimenul's n8n items 1–7 are built** (capture + AI verdict, hour block, compare + write-back,
attempt ladder, graduate, the Supabase screener log, the daily stale sweep + Slack summary) and tested live on
the test contact, Graduate end to end included; five Codex review rounds on them are fixed. The **three GHL guards
are live** (2026-09-25); the n8n entry workflows stay **inactive** until the go-live switches. After
Kevin's 2026-09-24 meeting, **Supabase** becomes the source of truth and **Topu** (the screener) is
due to start calling. The critical path is: go-live switches (GHL intake swap, publish `Screener Outcome Changed`,
publish `Graduate`, activate the entry workflows) → one real test call. Only item 8 (accuracy on real calls) is left on Mohimenul's screener list.

---

## 2. Live IDs

**Location** `rzaMhqeo2apNI1p6DG5z` · **Pipeline `Screener — Plumbers`** `CvDwpavqkHSRhg5Bn3L4`

| Stage | ID |
|---|---|
| Attempt 1 | `7ff9193f-1e0a-4c93-9626-a6aab22b666b` |
| Attempt 2 | `d3d8862e-bc2e-443f-97e6-f77e577ac09e` |
| Attempt 3 | `abb54fb0-dbfc-44d9-aa21-796b91b7540b` |
| Attempt 4 | `ec53d2ba-8322-45d6-9d60-283cc4fc016e` |
| Owner Verified | `c8e33d9d-fd1b-46f6-87a6-7cc47841642f` |
| Gatekeeper | `f83777fa-1dc0-4163-aa84-ef501126d82b` |
| Not Sure | `0c160182-e74d-4ace-9d3b-c4404043ef4b` |
| Exhausted | `c1db8172-84bf-45a1-8f0e-5625157574a5` |
| Disqualified | `65f9e1b4-8688-456d-845e-ebe0781101b9` |

**Custom fields** (contact). Since 2026-09-25 the **`Screener` folder holds only `Screener Outcome`** — the one
field Topu touches; the four n8n-written fields live in **`Call Context (do not edit)`** (IDs/keys unchanged).
On a call Topu types **"screener"** in the contact page's *Search fields and folders* box → the dropdown is
at the top (verified on Dana). GHL cannot move a folder or pin a field higher — tried, it lands below 30+ fields.

| Field | ID | Key | Type |
|---|---|---|---|
| Screener Outcome | `iTZa77JWntQs2QBuo9QU` | `contact.screener_outcome` | SINGLE_OPTIONS |
| Date Screened | `MUkHW8R17PIksrSnpz6g` | `contact.date_screened` | DATE |
| Screen Attempts | `vcqKnq23gN5wIIHqRww4` | `contact.screen_attempts` | NUMERICAL |
| Screen Noise | `AbbR6jH9PFMLJCRdCqMp` | `contact.screen_noise` | TEXT |
| Screen AI Verdict | `boOwqb5qGOmbWBopWvTv` | `contact.screen_ai_verdict` | LARGE_TEXT |

**`Screener Outcome` options — copy exactly (plain hyphen):**
`Owner - Busy` · `Owner - Quiet` · `Gatekeeper` · `Not Sure` · `Wrong Number` · `Not A Plumber` · `Do Not Call`

**Tags (17):** `screening` · `owner-confirmed` · `screen-busy` · `screen-quiet` · `screen-mismatch` ·
`screener-a` · `screener-b` · `screened-pt-06-07` … `screened-pt-15-16`

**Hour-block users** (role User, placeholder addresses `ptHHMM@meetobby.com`)

| Block | ID | Block | ID |
|---|---|---|---|
| PT 06-07 | `ZU6NEmag5FFcYAYwtu75` | PT 11-12 | `nTHz8ZbvpMxoWqsyJsLs` |
| PT 07-08 | `QKMhxRVQX45dq2bxF5a5` | PT 12-13 | `u1v0arwCtQw8kr9FSYIT` |
| PT 08-09 | `u24gWdO3FlXhwjwhm6sE` | PT 13-14 | `7KI79ZeuhHa1WrmFSaPH` |
| PT 09-10 | `hdIv63msJcYjhwfIJ4eg` | PT 14-15 | `j5w26gAQTznnaAgqRePi` |
| PT 10-11 | `T4p1bK3yo6Bl14OK1LP3` | PT 15-16 | `QlDlzTUPYag7RxkJ2B5Q` |

**Test rig:** contact **Dana Happy** `2Z5mwZe5RT4NQdNW85vj`, phone **(805) 265-3731** (team Google
Voice), tagged `screening`, opportunity `FAstcBVvrgbpds2gQIV3` in Attempt 1.
⚠️ Same contact is the AI-receptionist demo record (`obby-demo`, `obby-sms`…) — reused because GHL
blocks duplicate phone numbers.

**Workflows**

| Where | Name | ID | State |
|---|---|---|---|
| GHL | `Screener Outcome Changed` | `29535603-03a9-470c-8d98-0cde44df6c04` | **Draft, fully configured** (Contact Changed on `Screener Outcome` → `/webhook/screener-outcome` with `contact_id`) — publish at go-live |
| GHL | `Import Contact To Screener` | `6cd0ccf5-87d4-4ac2-a62a-e19c723377f4` | **Draft** (2026-09-25): Contact Created + tag `plumber` → add tag `screening` → Create opportunity **Screener — Plumbers / Attempt 1**. At go-live: publish this **and unpublish `Import Contact To New`** `475c6d9a-b7a2-43dd-ade0-de610a2f5021` in the same minute |
| GHL | Call Recorded Trigger | `120588ca-915c-4a87-9f7e-ab6ca8b273fc` | live **v7, guarded** 2026-09-25 → `screener-call` |
| GHL | Capture Wavv Disposition | `d5e8da04-4b4b-4eef-87c3-189cfbba34bd` | live **v11, guarded** 2026-09-25 → `screener-disposition` |
| GHL | Call No Answer | `0092952f-83d2-44aa-bd9c-829d350c08ce` | live **v37, guarded** 2026-09-25 → `screener-no-answer` (tested on Dana) |
| GHL | Move Leads Into Cadence | `571b33ab-2e83-4b72-8688-7a24f8c67b3b` | live but inert (posts to a `webhook-test` URL) — **no guard**; one would break Graduate |
| n8n | Screener: Capture Call | `jQaCWO08lddHg9fN` | inactive by design |
| n8n | Screener: Classify Transcript | `LbGY5ptzldJjnTZJ` | sub-workflow, published |
| n8n | Screener: Classifier Eval | `FMUXvDBXsigHA4vb` | test harness |
| n8n | Screener: Compare Step | `3pwiQXC8etTcKf5Z` | item 4, sub-workflow, published — `BLOCK_USER` filled |
| n8n | Screener: Mark + Compare | `zVCzfADKZqPWV6hk` | item 4, inactive |
| n8n | Screener: Write-back Retry | `IvxTYaChixQOiNzt` | retries failed GHL writes, inactive |
| n8n | Screener: Attempt Counter | `Wwx2R76IrhLMYU7K` | item 5, sub-workflow, published |
| n8n | Screener: No Answer | `aZyzUwwNdDWvaCAk` | item 5, `/webhook/screener-no-answer`, inactive |
| n8n | Screener: WAVV Disposition | `QOYHMP5ZGQcnG3ED` | item 5, `/webhook/screener-disposition`, inactive |
| n8n | Screener: Graduate | `M2LD6njhVMO9Ol7w` | item 6, sub-workflow — **publish before go-live** |
| n8n | Screener: Graduate Sweep | `jZAgBUQvffv1NCMC` | item 6, every 10 min, inactive |
| n8n | Screener: Log Retry | `y2oXfZtH4y1mhWQG` | item 7a, every 15 min, replays failed Supabase log writes — inactive |
| n8n | Screener: Daily Sweep | `0GtpCj9xFK4xGZrX` | item 7b, 05:00 PT stale sweep + Slack summary — inactive |
| n8n | Screener: Test Rig | `UvApCCNACHD0uwTu` | manual: read / mark / reset / ungraduate **Dana Happy** only |

Webhooks: `/webhook/screener-call` · `/webhook/screener-outcome` · `/webhook/screener-no-answer` ·
`/webhook/screener-disposition`

**Supabase** (the screener log, item 7a): project **`screener-helper`** `cifgvpqfodglnhywrofy` · org **Waterline**
`nzuqwkcyipyergddujfw` (separate Supabase account; the MCP is signed in there) · table `screener_log`, write path
function `screener_log_upsert` (versioned on `decided_ms`), views `screener_accuracy` + `screener_last_24h` —
definitions in [`supabase/screener_log.sql`](../supabase/screener_log.sql) · n8n credential
`Supabase [ Waterline screener-helper ]` `oUnRFJd1TMI1LmTd`.
**n8n data tables:** `screener_calls` `3WK4mrEYwvDeDUVO` · `screener_attempts` `9V6VL0XiKeadY9Lc` ·
`screener_graduations` `1iX0aTvMYawwyH4H` · `screener_log_pending` `qKv7RxgTDsqb1plo` · `screener_sweep_pending` `J61RThPMfxykZt1N`.
**Slack:** daily summary → `#daily-screener-summary`, posted by `Slack [ Obby bot account ]` `QcTNBiXBrnH5rFkC`.

**Screener log sheet — superseded by Supabase (not written)** (2026-09-23, built and empty): "WaterLine — Screener Log"
`1jw-5hnW2VJEoTpC37brncQBxLUIIx2ANjyauXD4raf8` · tab `screen_log` gid `892532160` · `accuracy` gid
`604528574` · bound script "Screener Log Setup"
`1Z3LfH496my3HBQfctuQf1eBuOJayXfk_X9vmlGELSWn6bgI-P3sny2fB` · source
[`metrics/screener-log-sheet-setup.gs`](../metrics/screener-log-sheet-setup.gs). Columns and the data
contract are in [`AGENTS.md`](../AGENTS.md). Separate from Kevin's metrics workbook on purpose.
⚠️ `setupScreenerLog()` **clears** `screen_log` — after live data, only `rebuildAccuracyOnly()`.

---

## 3. What is left — plain priority order (updated 2026-09-25)

Kevin's order: **the list first, then the screener**; underneath both, **Supabase becomes the source of
truth**; rule no. 1 is **simplicity**. No hard dates — work top to bottom. Meeting notes with
timestamps: [`meeting-2026-09-24.md`](meeting-2026-09-24.md).
Visual map of the plan (private claude.ai artifact, Mohimenul's account):
https://claude.ai/artifact/MosBs7RUNqTG7jTgXotum3

### Mohimenul — finish the screener items first (spec §10.2)
1. ✅ Items 1–5 built and tested on the test contact; ✅ Classify, Compare Step, Attempt Counter published;
   ✅ Dana Happy reset.
2. ✅ **Item 6 Graduate** built (`Screener: Graduate` + `Graduate Sweep`, inactive), Codex fixes in (the close
   is gated on every write succeeding; Manual Review is not a handoff), and ✅ **tested live end to end** on
   Dana (sweep 123631 → Graduate 123632); the Kevin opportunity it made was deleted with the rig's
   `ungraduate` and Dana is back in Attempt 1. Open: publish `Screener: Graduate` before go-live.
3. **Item 7a — the screener log → Supabase only** (decided 2026-09-25). ✅ Built and tested offline:
   table [`supabase/screener_log.sql`](../supabase/screener_log.sql) (+ `screener_accuracy` view), writes from
   the Compare Step and the Attempt Counter. ✅ Supabase project **`screener-helper`**
   (`cifgvpqfodglnhywrofy`, org Waterline) created, table applied, n8n credential made; ✅ **live** — both
   sub-workflows re-published and tested on Dana 2026-09-25 (a no-answer row; a call row that waited with
   `match` empty, then updated to Owner Verified / match true when marked). Codex fixes (2026-09-25): the
   write is versioned (`screener_log_upsert`) and failed writes queue for `Screener: Log Retry`
   (inactive); both sub-workflows re-published and re-tested live on Dana (a late stale write no longer
   erases a decision).
4. ✅ **Item 7b — `Screener: Daily Sweep`** (inactive, 05:00 PT) built and tested live on Dana: 14-day expiry
   drops stale owners from Kevin's hour lists; Gatekeeper / Not Sure / Exhausted / graduated owners whose Kevin opp
   closed go back to Attempt 1 (never with an open Kevin opp); Slack summary with stage counts, last 24 h, sweep
   results and what needs a human. Slack: `#daily-screener-summary` (Obby bot, first post 2026-09-25). 3rd codex review fixed: half-failed re-screens
   are saved and finished next run; the log version is stamped at the contact read; stuck graduations use
   `first_failed_at`. Compare Step re-published with the stamp fix. 4th review: a replayed half-done re-screen
   re-checks the guards (open Kevin opp / DND → stopped, reported for a human; expire-only replays still run). 5th review: each
   sweep write carries its kind, so a blocked replay drops only the re-screen writes and still finishes the expiry. `SCREENER_USER_ID` optional (Topu has normal access).
5. **Item 8 — accuracy report** on the first real calls. The report can be built now on the `screener_accuracy`
   view and tested with test rows; the real numbers need Topu's calls (after go-live).

### Mohimenul — then the new work from the meeting
6. **Design the Supabase tables and columns** (Mohimenul decides; Kevin named only the tables: shops with
   Supabase id ↔ GHL id + tier + set, raw data, transcripts incl. screener calls, call logs).
7. **Screener → Supabase:** ✅ the Compare Step and the Attempt Counter already write `screener_log` (item 7a).
   Left: Graduate marks the shop, and screener transcripts go to the transcripts table — both once those
   tables exist (step 6).
8. **Check the duplicate automations Kevin's Claude reported** — ✅ the GHL connector is set up here
   (`leadconnector` in `.mcp.json`); the check itself is not done.
9. **Sales Advisor** (separate repo): staging login for Kevin · Notion as its context source · a GitHub /
   MCP connector so Kevin's Claude can read the code.
10. **Cleanup:** delete the n8n test rows — `screener_calls` `TEST-screener-0001…0011`, the test-rig rows on
    Dana (`2Z5mwZe5RT4NQdNW85vj`) in `screener_attempts` (2026-09-24/25) and `screener_graduations` (MCP can't
    delete rows; n8n UI); the Supabase test rows are already deleted. Delete the test posts in
    `#daily-screener-summary`. Rotate the exposed Instantly key. Tell the Obby product owner about the Supabase
    RLS warning (AGENTS.md security backlog).
11. **Git:** PRs #4–#6 (`screener-item-6`) are merged and `screener-item-4` is in `main`. `screener-item-6` now carries
    only the pre-compact docs pass, the 4th Codex fix and a merge of Hridoy's guard commits: open a PR to `main`
    (https://github.com/TeamObby/Automation-Plumber/compare/main...screener-item-6; no `gh` CLI here).

### Hridoy (GHL side, and the list)
- **Sample Test 2** (tasks 1–7, the CSV) — Hridoy handles it.
- ✅ **The three guards are live** (2026-09-25, v37 / v11 / v7, verified through the API; Call No Answer
  tested call-free on Dana). Left: one real Google Voice call on Dana to exercise the call-recorded and
  disposition guards.
- ✅ `Screener Outcome Changed` configured, ✅ `Import Contact To Screener` built — both drafts until go-live.
- ✅ Field layout for Topu (see §2). **No Smart Lists** — decided 2026-09-25: Kevin dials from his opportunity
  stages filtered by the hour-block follower (WAVV dials only the filtered cards — confirmed by Hridoy), and
  Topu dials from the **Screener — Plumbers** Attempt stages, which contain only `screening` leads.
  (Five empty lists "Kevin — Owner PT 06-07 … 10-11" were created before this was decided; unused, safe to delete.)
- **Topu's GHL user — normal access** (not *Only Assigned Data*: with one screener it would only hide his
  leads, since nothing assigns contacts to him) · Topu's WAVV seat and numbers (Kevin pays).
- Email-1 timing for screened leads is parked; Graduate sends leads to Kevin exactly as import does today.

### Go-live switches (the guards exist)
First a read-only pre-flight (Mohimenul): published versions = latest drafts, credentials set, webhook paths = the
guards' targets, Dana clean. Then, with an explicit OK and together with Hridoy:
GHL: publish `Import Contact To Screener` + unpublish `Import Contact To New`, publish `Screener Outcome Changed`.
n8n: publish `Screener: Graduate` → activate `Capture Call`, `Mark + Compare`, `No Answer`, `WAVV Disposition`,
`Write-back Retry`, `Graduate Sweep`, `Log Retry`, `Daily Sweep` → one real test call with Hridoy on the test contact.
`SCREENER_USER_ID` in the Daily Sweep is optional now (Topu has normal access): empty leaves re-screened leads unassigned.

**Pre-flight done 2026-09-25 (read-only):** all 13 screener workflows in n8n = the repo snapshots (nodes and wiring);
Classify / Compare Step / Attempt Counter published at their latest draft; every workflow has a successful earlier
run (credentials proven); the guards post to the production `/webhook/screener-call|-disposition|-no-answer` paths,
`Screener Outcome Changed` to `/webhook/screener-outcome` — all four exist; Supabase has `screener_log_upsert` and
both views, 0 rows; retry queues empty; Dana clean (Attempt 1, `screening` only, no fields, no followers).
Before the switches: **delete `TEST-screener-0004`** from `screener_calls` (writeback_ok = false, now past 48 h: the
daily summary would report it as a failing write-back every day), and decide on Graduate's **`assignedTo: null`**
write (below). Check on the real test call: Kevin's Call Recorded payload has no `ghl_user_id` / `contact_name`
keys, so `screener_log.screener_user_id` may stay empty (harmless; the name falls back to the contact's).
**Open decision — Graduate clears the contact owner** (`clear screener as owner`, `graduate_ops.js`): built for the
old plan where the screener owned the lead. With normal access nothing assigns Topu, so this write now wipes
whatever owner the lead had (e.g. from GHL's `Assign User Automatically`, not inspected). Recommended: remove it.

### People
- **Topu** — the **screener** (the caller who makes the screening calls); probably starts soon after the meeting.
- **Tosif** — third helper if needed.

## 4. Decisions that must not drift

- **The screener's mark is the `Screener Outcome` custom field, not a WAVV disposition.** A call
  carries one disposition and we need two facts; the field also needs no WAVV admin.
- **Guards block what reaches the lead, keep what keeps the CRM clean.** `Call No Answer`'s
  *Remove Tag* step and `Capture Wavv Disposition`'s Branch B must keep running for screener
  contacts, or the `wavv-*` tags stick and the next attempt becomes undetectable.
- **The Attempt ladder is driven by the no-answer path**, not the recorded-call path — an
  unanswered dial produces no recording.
- **Block follower and block tag are replaced, never appended** on a re-screen, or a lead appears in
  two of Kevin's hour blocks. 10-follower cap per record; two already used by the TZ and line-type
  workflows.
- **Re-screen only leads with no open opportunity in Kevin's pipelines** — re-adding `screening` to
  a lead mid-cadence would silently switch his automations off for it.
- **Freshness is enforced by the n8n sweep, not a filter** — contact filters on a custom field offer
  only *Is / Is not / Is empty / Is not empty*.
- **Stages mean the call *due*** (same convention as `Day 1 Call A`), so Attempt 1 = never dialled.
- **Mohimenul's entry workflows stay inactive until go-live** (guards live since 2026-09-25; switch on together
  with the GHL intake swap).

---

## 5. Hard-won gotchas

**GHL builder**
- Verify every workflow edit through the API, never the canvas:
  `GET backend.leadconnectorhq.com/workflow/<loc>/trigger?workflowId=<id>` and
  `GET .../workflow/<loc>/<id>?includeScheduledPauseInfo=true`. GHL **silently discards** a filter
  saved without an operator — canvas showed it, API returned an empty trigger list.
- **Contact tag** trigger filters have **no operator** (only which tag fires it) → `Call No Answer`
  needs an in-workflow If/Else. **Contact changed** filters *do* take `Has changed`.
- Field-picker labels are split by the search highlighter (`Screener` + `Outcome`) — match a
  parent's combined text.
- The webhook URL box is rich text; typing opens a merge-field popup that blocks clicks below.
- Custom-data values render as chips: `{{contact.id}}` → `Contact.ID` (correct).
- Unknown: where existing steps land when an If/Else is inserted mid-workflow. Procedure in the plan.

**GHL elsewhere**
- Opportunity board filters: **followers yes, tags no**. Contact Smart Lists: tags, Owner,
  Opportunity pipeline/stage, custom fields.
- Contact search does **not** match partial phone numbers — the duplicate-check on save is what
  revealed the existing contact.
- Duplicate phone numbers are rejected account-wide.
- Smart List filter rows: the box beside the field name is the **operator**; the value picker is the
  separate "Please select" to its right.
- Settings → Custom Fields lives at `/settings/fields?tab=field`; guessing URLs renders blank pages.

**Automation technique**
- Clicking the GHL UI step-by-step is slow (stale refs, portal dropdowns). **Script whole flows
  inside one `browser_evaluate`** with a wait-for-condition loop — ten users took two calls that way.
- Dialogs need a wait-until-closed check between iterations or every second one silently fails.

**Tooling**
- Browser access is the **Playwright Extension** in Chrome; the token lives in `~/.claude.json`
  under the `playwright` MCP server env (`PLAYWRIGHT_MCP_EXTENSION_TOKEN`). It shares the whole
  browser, so keep unrelated tabs in mind.
- The **n8n MCP** connector drops out and needs re-authorising from claude.ai connector settings.
- `git push` may be refused by the permission classifier; the user allows it via `/permissions`.
- Browser scratch output lands in `.playwright-mcp/` (gitignored).

---

## 6. Open questions for Kevin

Recording in CA/WA/NV · whether to screen leads already in his pipelines · team dispositions once
seats exist · male/female + "sounds like an owner" stay dropped unless week one shows owners being
faked.
