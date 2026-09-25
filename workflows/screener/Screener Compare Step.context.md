# Screener: Compare Step  [spec §4.1 cross-check · §10.2 item 4]

- **n8n ID:** `3pwiQXC8etTcKf5Z` · **URL:** https://n8n.meetobby.com/workflow/3pwiQXC8etTcKf5Z · **File:** `Screener Compare Step.json`
- **Folder:** `workflows/screener/` · built from `build/src/decide.js` (+ `split_ops.js`, `report.js`, `log_call_row.js`) by `build/gen_compare.js` (+ `build/log_supabase.js`)
- **Status:** sub-workflow (no trigger of its own) — built 2026-09-23. **Published** 2026-09-24 — re-publish after every `update_workflow`.
- **Called by:** `Screener: Capture Call` (`source: call`, with the new AI verdict) and
  `Screener: Mark + Compare` (`source: mark`). Inputs: `contact_id`, `verdict_json`, `source`, `force`.
- **⚠️ Sync state (2026-09-25, 3rd codex review):** snapshot = the n8n **draft** with **Stamp Read** (below); the
  published version still stamps `read_ms` inside Decide until it is re-published (needs OK).

## Purpose
The one place where the screener's mark (`Screener Outcome`) meets the AI verdict
(`Screen AI Verdict`) and the result is written to GHL. Both paths call it, so they cannot drift
(spec §9: "build it once").

## Flow
1. **GHL: Guard Read** → **Plan Save** → **Save verdict first?** — on the call/retry path, and only
   for a contact tagged `screening`, only if it changed, and **never over a newer call's verdict**:
   **GHL: Save Verdict** writes the new `Screen AI Verdict` **before** anything is decided.
2. **GHL: Get Contact** (a fresh read, after the save) → **GHL: Find Screener Opp** (search limited to
   pipeline `Screener — Plumbers` `CvDwpavqkHSRhg5Bn3L4`; Kevin's opportunities are never read or written).
3. **Decide** — all the logic. Emits `action` (`skip` / `wait` / `apply`), `result`, `mismatch`,
   `retry`, `notes`, and `ops`: the exact list of GHL requests.
4. **Anything to write?** → **Split Ops** → **GHL: Apply** (one generic HTTP node, batch size 1,
   `onError: continue`) → **Report**. Report runs on both branches and always returns
   `ok` = no failed request **and** no `retry`; Capture stores it as `writeback_ok`.
5. **Screener log (item 7a):** **Find call row** (`screener_calls` by call id, for duration, recording,
   transcript) → **Build Log Row** → *Log it?* → **Supabase: screener_log** (POST to the function
   `screener_log_upsert`, `onError: continue`) → *Log write failed?* → (**Queue Pending Log** →
   **Store: screener_log_pending**) → **Return**, which hands back Report's output unchanged — callers
   read `ok` / `result` from it. **Versioned (codex review 2026-09-25):** **Stamp Read** stamps `read_ms` the moment the contact read
   returns — before the opportunity search, which can be slow (3rd codex review: stamping in Decide let an older
   snapshot delayed by that search look newer); the row carries it as `decided_ms`, and the function replaces the decision only
   for a same-or-later read — a late waiting run can no longer erase a decided row (reproduced and
   verified in SQL: stale wait kept Owner Verified / match true; a newer correction replaced it). One row per answered call (`call:<call_id>`),
   updated by every run for that call. Decision fields are always sent (`match` / `result_stage` are
   NULL while waiting, so a wait never counts as a miss; a dead-end mark has no `match`); call facts are
   sent only when known, so a later run never blanks them. Not logged: skipped runs, and a mark that
   arrives before the call is captured (the call's own run logs it).

## Why persist-then-read (codex review, 2026-09-23)
The first version decided on a read taken *before* saving the verdict. If the Capture run read
before the screener marked, and the Mark run read before Capture saved, **both waited and nothing
ever re-ran** — the lead stayed in its Attempt stage. Now the verdict is saved before the read, and
GHL saves the mark before firing its webhook, so whichever run reads second sees both.
`tests/screener.test.js` §8 runs all 6 interleavings (and shows the old order has a stuck one).
Assumes GHL's contact read reflects a write that has already returned — true in every test so far,
not a documented guarantee.

**If the save-first request fails** (codex review, round 2), that run has no ordering guarantee:
Decide still writes the verdict with its other ops, but a `wait` is then reported as `retry`
(never `ok`), so the row stays `writeback_ok = false` and **Screener: Write-back Retry** re-runs it
save-first. §8 of the tests replays Codex's exact sequence (`RC,W,RM,F`) and all 6 orders.

**Old calls never rewind the contact:** Plan Save and Decide both ignore an incoming verdict whose
`answered_at` is older than the one on the contact (a retry of an old call); the newer verdict decides.

## Decision rules
- **Guard:** `skip` unless the contact exists **and is tagged `screening`**. An unreadable contact is
  `skip` + `retry` (may be transient); a failed opportunity search sets `retry` too.
- **Waiting:** until both a known mark and a verdict exist → `wait`. The new verdict (call path) or
  `Screen Noise` (mark path) is still written, so the other side finds it.
- **Dead ends** (`Wrong Number`, `Not A Plumber`, `Do Not Call`) → **Disqualified** straight away, no
  AI needed. `Do Not Call` also sets GHL **DND** on the contact.
- **"The AI confirms owner"** = no `ai_error`, `call_outcome: owner`, `owner_reached: yes`,
  `confidence ≥ 0.6`, **and** `quote_verified` (evidence really is in the transcript).
- The spec §4 table then applies: owner + confirmed → **Owner Verified**; owner + not confirmed →
  **Not Sure** + `screen-mismatch`; Gatekeeper → **Gatekeeper**, unless the AI confirms owner
  (→ Not Sure + mismatch); Not Sure → **Not Sure** (+ mismatch if the AI confirms owner).
- **`force: true`** (for item 5, when the next dial starts): a missing mark → Not Sure + mismatch; a
  missing verdict counts as "AI did not confirm".
- An unknown dropdown value (a spelling drift) counts as unmarked and is listed in `notes`.

## What an `apply` writes
| Result | Stage | Tags added | Tags removed (if present) | Fields |
|---|---|---|---|---|
| Owner Verified | Owner Verified | `owner-confirmed`, `screen-busy`/`quiet`, block tag | other block tags, the other noise tag, `screen-mismatch` | Date Screened, Screen Noise |
| Gatekeeper / Not Sure / Disqualified | that stage | `screen-mismatch` if mismatch | `owner-confirmed`, all block + noise tags (and `screen-mismatch` if not a mismatch) | Date Screened, Screen Noise (cleared unless an Owner mark) |

- **Replace, never append** (spec §6), so a later correction by the screener re-runs cleanly.
- `Date Screened` = the Pacific date the call was answered (today if unknown).
- **Block follower** on the screener opportunity: the block user is added and any other block user
  removed; other followers (TZ, line type) are never touched.
- n8n never writes `Screener Outcome` (the screener's own field).

## Live test on the test rig — 2026-09-24 (Dana Happy `2Z5mwZe5RT4NQdNW85vj`, opp `FAstcBVvrgbpds2gQIV3`)
Driven with `Screener: Test Rig` (`UvApCCNACHD0uwTu`) playing the screener and mock call webhooks into Capture.

| # | Scenario | Result in GHL (read back through the rig) |
|---|---|---|
| B | AI first: owner transcript, PT 10-11 (`TEST-screener-0005`) | verdict saved **before** the read (Decide saw it, sent no re-save) → `wait`, `writeback_ok = true` (exec 123079/123081) |
| C | screener marks `Owner - Busy` second | **Owner Verified**; tags `owner-confirmed`, `screen-busy`, `screened-pt-10-11`; follower = PT 10-11 user; noise `busy`; Date Screened 2026-09-24 (123083, read 123085) |
| D | correction → `Gatekeeper` (AI said owner) | **Not Sure** + `screen-mismatch`; owner tags, block tag, follower and noise removed (123087, read 123089) |
| E | mark first (`Owner - Quiet`), then a gatekeeper transcript (`TEST-screener-0006`) | mark run `wait` + noise `quiet`; call run → **Not Sure** + mismatch (123095, 123097) |
| F | fast correction Gatekeeper → Owner - Quiet | Gatekeeper, then **Not Sure** (123101, 123104, read 123106) |
| — | reset (rig) | fields and result tags cleared, followers removed, opp back to **Attempt 1** |

**Found live: GHL's opportunity *search* lags writes by a few seconds** — right after the reset moved the
opp to Attempt 1, search still returned Not Sure; a read seconds later returned Attempt 1. A direct
contact read is current immediately (test B). So Decide no longer skips a stage move or follower change
because search says it is "already there": both are idempotent and always sent (2 extra requests/run).
Test F did not itself catch search stale (14 s had passed); the fix rests on the reset observation.

## Screener log live test — 2026-09-25 (Dana Happy, after re-publishing)
| Step | Exec | Supabase `screener_log` |
|---|---|---|
| no-answer (`Screener: No Answer`) | 123666 | `na:…` row: attempt 1 → Attempt 2, company, `match` NULL — **the credential works** |
| answered owner call, AI first (`Capture Call`, `TEST-screener-0010`, 10:30 PT) | 123668 | `call:TEST-screener-0010`: PT 10-11, 48 s, recording, transcript, AI owner / yes / 0.95 / quote verified; `match` + `result_stage` NULL (waiting) |
| rig marks `Owner - Busy` → `Mark + Compare` | 123671, 123672 | **same row updated**: mark, noise busy, `match` true, Owner Verified; duration + transcript kept (the mark run does not blank them) |
| `screener_accuracy` | — | TEST-user 1 / 1 / 1 = 100 %; view then limited to calls (migration `screener_accuracy_calls_only`) |
| rig reset | 123674 | Dana back to Attempt 1 (checked with a direct GET) |

Both test rows were then deleted from Supabase. Left behind in n8n tables: `screener_calls`
`TEST-screener-0010` and one `screener_attempts` row on Dana (listed with the other test rows).

### Re-test after the codex fixes — 2026-09-25 (re-published)
No-answer (123685) → `na:` row with `decided_ms`; call `TEST-screener-0011` (123687) → waiting row;
mark `Owner - Busy` + Mark + Compare (123690, 123691) → same row Owner Verified / match true with a newer
`decided_ms`, transcript kept. Then the earlier **waiting payload was replayed late** straight into
`screener_log_upsert` with its older version: the row **stayed** Owner Verified / match true (codex's
scenario, closed). Reset (123693, Dana back in Attempt 1 by a direct GET); both Supabase rows deleted.

## Versioned outcome (codex review, round 4 — 2026-09-24)
Every caller records the run's outcome on the call's `screener_calls` row. A run that started
*before* a later failure must not clear it (Capture waits → a Mark run fails and records `false` →
Capture's late `ok` would overwrite it with `true`, and the retry sweep would never see the failure).
- **Plan Save** stamps `run_started_ms` before the save and the decision read; **Report** returns it.
- **Record Failure** (Capture, Retry) and **Record Mark Failure** always land and stamp
  `writeback_fail_ms = Date.now()`.
- **Record Success** updates only `WHERE call_id = X AND writeback_fail_ms < run_started_ms` — the
  version check is inside the data-table update, so there is no check-then-write gap.
- New rows start at `writeback_fail_ms = 0` (Build Row); `NULL` would never match `lt`.
- Proof: `tests/screener.test.js` §8b runs the real Record nodes' filters on a simulated row
  (Codex's exact sequence + every order); removing the `lt` condition fails 4 checks. Live: a fresh row
  (`TEST-screener-0007`, exec 123113) recorded `writeback_ok = true` through the `lt` filter.

## TODOs / gotchas
- **`BLOCK_USER`** holds the ten block label-users `PT 06-07` … `PT 15-16` (Hridoy, 2026-09-23;
  deployed 2026-09-24). A block missing from the map still gets its tag; the follower is skipped and noted.
- The spec's acceptance (20 role-played **WAVV** calls) still needs the guards; the n8n side is proven
  on the test rig above. Offline: `tests/screener.test.js` §7–§9.
- **Recovery:** GHL never re-sends a webhook, so recovery is **`Screener: Write-back Retry`**
  (`IvxTYaChixQOiNzt`): every 15 min it re-runs this step for rows with `writeback_ok = false`.
  Every caller feeds it: Capture records `ok` on its row; a failed **Mark** run sets the contact's
  newest call row to `writeback_ok = false`. Not covered: a Mark failure on a contact with **no** call
  row yet — harmless, because that Capture run has not happened and will apply both values.
- Only the **first open** screener opportunity is moved; a contact with two open screener opps is
  a data problem for the import (item 6) to prevent.
- `Owner Verified` does **not** graduate the lead into Kevin's pipeline — that is item 6
  (`Screener: Graduate`), which should also copy the block follower onto Kevin's new opportunity
  (Kevin's board filter reads followers there).
- A new cycle (stale sweep, item 7) must clear `Screener Outcome` **and** `Screen AI Verdict`,
  or the old mark pairs with the next call's verdict.
