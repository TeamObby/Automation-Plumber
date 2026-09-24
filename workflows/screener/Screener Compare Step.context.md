# Screener: Compare Step  [spec §4.1 cross-check · §10.2 item 4]

- **n8n ID:** `3pwiQXC8etTcKf5Z` · **URL:** https://n8n.meetobby.com/workflow/3pwiQXC8etTcKf5Z · **File:** `Screener Compare Step.json`
- **Folder:** `workflows/screener/` · built from `build/src/decide.js` (+ `split_ops.js`, `report.js`) by `build/gen_compare.js`
- **Status:** sub-workflow (no trigger of its own) — built 2026-09-23.
- **Called by:** `Screener: Capture Call` (`source: call`, with the new AI verdict) and
  `Screener: Mark + Compare` (`source: mark`). Inputs: `contact_id`, `verdict_json`, `source`, `force`.

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

## TODOs / gotchas
- **`BLOCK_USER`** holds the ten block label-users `PT 06-07` … `PT 15-16` (Hridoy, 2026-09-23;
  deployed 2026-09-24). A block missing from the map still gets its tag; the follower is skipped and noted.
- **Not yet live-tested against a real contact** — it needs Hridoy's `screening`-tagged test contact
  with an open Attempt-1 opportunity. Proven so far: GHL credentials and the not-found guard
  (exec 122457/122458), and Capture → Compare wiring (exec 122459). Offline: `tests/screener.test.js` §7.
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
