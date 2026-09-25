# Screener: Attempt Counter  [spec §9 events 3 + 4 · §10.2 item 5]

- **n8n ID:** `Wwx2R76IrhLMYU7K` · **URL:** https://n8n.meetobby.com/workflow/Wwx2R76IrhLMYU7K · **File:** `Screener Attempt Counter.json`
- **Folder:** `workflows/screener/` · built by `build/gen_counter.js` (+ `src/attempt_event.js`, `attempt_dedupe.js`, `ladder.js`, `ladder_report.js`, `attempt_log_row.js`, `log_attempt_row.js`) + `build/log_supabase.js`
- **Status:** sub-workflow (no trigger of its own). Called by **`Screener: No Answer`** (`aZyzUwwNdDWvaCAk`,
  `POST /webhook/screener-no-answer`) and **`Screener: WAVV Disposition`** (`QOYHMP5ZGQcnG3ED`,
  `POST /webhook/screener-disposition`) — both **inactive until go-live** (GHL guards live 2026-09-25).
- **Data table:** `screener_attempts` `9V6VL0XiKeadY9Lc` — one row per dial event.
- **Sync state (2026-09-25):** snapshot = live. **Re-published** after the codex review: the log write goes
  through the versioned Supabase function `screener_log_upsert`, and a failed write is queued in
  `screener_log_pending` for `Screener: Log Retry`.

## Purpose
The Attempt ladder. A stage is the call that is **due** (spec §2.1): after unanswered dial *n* the
lead sits in **Attempt n+1**; after the 4th it leaves the queue as **Exhausted**; a Bad Number goes to
**Disqualified**. The recorded-call path cannot do this — an unanswered dial produces no recording.

## What counts, and from where
| Source | Event | Counts as |
|---|---|---|
| `Call No Answer` screener branch (tag `wavv-no-answer` / `wavv-canceled`) → No Answer | `no-answer` | one attempt |
| `Capture Wavv Disposition` screener branch (WAVV note) → WAVV Disposition | `Voicemail` | one attempt |
| same | `Bad Number` | one attempt, stage **Disqualified** |
| same | `No Answer`, `Canceled`, answered dispositions | **ignored** — WAVV writes a note for every dial, so counting No Answer here would double-count; answered calls belong to the Compare Step |

## Flow
When Called → **Event** (drops anything uncountable) → **Recent attempts for contact** → **Attempt Dedupe**
→ Filter: not a duplicate → GHL: Get Contact → GHL: Find Screener Opp → **Ladder** → *Skip?* →
Split Ladder Ops → GHL: Ladder Apply → Ladder Report → *Unmarked answered call?* → (Compare Step, force)
→ **Log Row** → Store (upsert on `event_key`) → **Build Log Row** → *Log it?* → **Supabase: screener_log**
(item 7a: the same `event_key`, only for a readable `screening` lead; the versioned function
`screener_log_upsert`; a failed write is queued for `Screener: Log Retry`) → **Return** (Store's output, unchanged).

## Rules (all in `Ladder` / `Attempt Dedupe`)
- **Screen Attempts is SET** to the event's attempt number, never `+1` on the stored value.
- **Dedupe:** a WAVV note is keyed `wavv:<call id>` — a replay stops if the row is `ok`, or retries with
  the **stored** attempt number if it failed. A no-answer has no id: a second one for the contact within
  **30 s** is the same dial delivered twice.
- **Guards:** contact must be tagged `screening`; a lead with **Date Screened** set (an answered call
  decided it) or an opportunity in a terminal stage is skipped. Unreadable contact / failed opp search →
  skip with `ok = false`.
- **Retry of a half-failed event** (codex review): a WAVV-note replay whose row is `ok = false` still
  **repairs Screen Attempts** (action `repair`) when the lead is terminal or already screened — but
  never moves the stage, since whatever put the lead there may be newer. A retry never logs
  `attempt_no = null`.
- **Bad Number wins** (codex review): it goes to Disqualified even when an unmarked answered call is
  pending — a dead number is a dead end whatever happened before.
- **Unmarked answered call** (spec §4.1): if the contact holds an AI verdict for an answered **human**
  (not `voicemail` / `no_conversation`) and no `Screener Outcome`, this dial is "the next call": Screen
  Attempts is written and the **Compare Step runs with `force: true`** → Not Sure + `screen-mismatch`.
- The stage is always written (never skipped on search, which lags — see the Compare Step context file).

## Live test on the test rig — 2026-09-24 (Dana Happy)
| Event | Result (read back from GHL) |
|---|---|
| no-answer #1 | Screen Attempts 1 → **Attempt 2** (exec 123131) |
| same no-answer 20 s later | **dropped as duplicate** (123132) |
| Voicemail note `TEST-vm-1` | attempt 2 → **Attempt 3** (123135) |
| same note again | **duplicate** — "this WAVV call was already counted" (123137) |
| no-answer #3 | → **Attempt 4**; GHL read: Attempt 4, attempts 3 (123139, 123141) |
| no-answer 28 s later | **duplicate** (window edge, 123142) |
| no-answer #4 | → **Exhausted** (123144) |
| Voicemail `TEST-vm-2` after Exhausted | **skip** — "opportunity already in Exhausted" (123146) |
| Bad Number `TEST-bn-1` on a fresh lead | → **Disqualified**, attempt 1 (123149, read 123151) |
| Bad Number with an unmarked gatekeeper call pending (`TEST-bn-2`, after the codex fix) | → **Disqualified**, attempt 2 — not the forced compare (123172) |
| same case after publishing (`TEST-screener-0009`) | → forced compare → **Not Sure**, "previous answered call was never marked \| compare: nothing marked" (123587) |
| no-answer after an unmarked gatekeeper call (`TEST-screener-0008`), before publishing | ⚠️ **failed**: the counter could not call the Compare Step — *"Workflow is not active and cannot be executed"* (123157). See gotcha 1. Logic proven offline. |

## Screener log live test — 2026-09-25
No-answer on Dana (exec 123666) → Supabase row `na:…` (attempt 1 → Attempt 2, `match` NULL). Full
run in the Compare Step context file.

## TODOs / gotchas
1. **Sub-workflows must be published.** n8n runs an unpublished sub-workflow only when the *top-level*
   execution is manual; a sub-workflow calling another (Counter → Compare Step), and every call from an
   active workflow, needs the target published. Classify, Compare Step and this counter were published
   on 2026-09-24 (the forced compare then passed, 123587). Publishing snapshots the current draft:
   **after every `update_workflow`, publish again.**
2. Ladder rows with `ok = false` are **not** retried automatically (no call id on a no-answer); they are
   visible in `screener_attempts` for the daily summary (item 7). A WAVV-note event retries on replay.
3. The 30 s no-answer window assumes a real redial takes longer than one ring cycle.
4. Test rows: `screener_attempts` rows 1–8 (and later) from the 2026-09-24 run are **test data** — delete
   with the `screener_calls` test rows.
