# Screener: Capture Call  [spec §9 event 1 · §10.2 items 1, 3 + 4]

- **n8n ID:** `jQaCWO08lddHg9fN` · **URL:** https://n8n.meetobby.com/workflow/jQaCWO08lddHg9fN · **File:** `Screener Capture Call.json`
- **Folder:** `workflows/screener/`
- **Status:** Inactive ❌ — built 2026-09-23. **Keep inactive until Hridoy's four GHL guard branches exist**
  (spec §1): until then a screener call would still reach Kevin's automations.
- **Trigger:** Webhook POST `/webhook/screener-call` — to be fired by the screener branch of GHL's
  `Call Recorded Trigger` with **the same payload it already builds** (spec §1 table).

## Purpose
Record every answered screener call once, with who answered according to the AI, in the data
table **`screener_calls`**. It is the "AI half" of the cross-check (spec §4.1): the verdict waits
in the table for the screener's own mark (`Screener Outcome`), which arrives later on a separate
webhook.

Since item 4 (2026-09-23) it also hands the verdict to **`Screener: Compare Step`**
(`3pwiQXC8etTcKf5Z`), which writes it to the contact's `Screen AI Verdict` field and, if the
screener has already marked, applies the stage/tags/follower. That GHL write only happens for a
contact tagged `screening` — see the Compare Step's context file.

## Flow
1. **Webhook** → **Normalize Call** — reads WAVV's fields from `customData` (`call_id`,
   `ghl_user_id`, `wavv_caller_id`, `call_answered_at_timestamp`, `call_transcript`,
   `call_recording_url`, `call_duration_seconds`) and computes the **Pacific hour block**.
2. **Filter: answered call with id** — needs a `call_id` (dedupe key) and an answered timestamp.
3. **Find Row** (by `call_id`, always outputs) → **Route Replay** — a three-way dedupe:
   - `done` (`ai_ok` **and** `writeback_ok`): stop — the replay is a true duplicate.
   - `writeback` (`ai_ok`, but the GHL write-back failed or never ran): skip the AI, send the **stored**
     verdict to the Compare Step again (codex review, 2026-09-23 — before this, a failed GHL write was
     locked in by the dedupe).
   - `classify` (new call, or `ai_ok = false`): the full path; the row is overwritten.
   Verified 2026-09-23 for the AI half on `TEST-screener-0002` (execs 122380 → 122382 → 122384).
4. **IF: transcript missing?** — WAVV normally sends `call_transcript` itself. Only when it is
   empty and a recording exists: Download MP3 → Whisper → **Set Transcript (from audio)**.
   (This branch is copied from `Capture Call Record` and has **not** been exercised with a real
   recording yet.)
5. **Transcript Ready** → **Screener: Classify Transcript** (sub-workflow `LbGY5ptzldJjnTZJ`).
6. **Build Row** → **Store** — upsert on `call_id` into `screener_calls`.
7. **Verdict For Contact** → **Screener: Compare Step** (`source: call`) — the verdict JSON
   (call_id, answered_at, block, AI fields) that meets the screener's mark (spec §4.1).
8. **Record Write-back** — `writeback_ok` = the Compare Step's `ok`, plus a one-line
   `writeback_result` (action | result | reason | failed requests).

## Hour block (item 3)
`answered_at` (UTC) → hour in `America/Los_Angeles` → `PT HH-HH+1`, **only** for the ten blocks
`PT 06-07` … `PT 15-16`; any other hour gets `''`. Always Pacific, even for an Eastern lead
(spec §6). Uses `Intl` (DST-correct; tested on both 2026 transitions).
Tag spelling is part of the Hridoy/Mohimenul contract: `PT 10-11` → **`screened-pt-10-11`**.

## Data table `screener_calls` — `3WK4mrEYwvDeDUVO`
`call_id` · `contact_id` · `contact_name` · `ghl_user_id` · `wavv_caller_id` · `answered_at` ·
`pt_block` · `pt_block_tag` · `duration_sec` · `recording_url` · `transcript` · `transcript_source`
(`wavv`/`whisper`) · `ai_call_outcome` · `ai_owner_reached` · `ai_confidence` · `ai_evidence_quote` ·
`ai_quote_verified` · `ai_owner_name` · `ai_model` · `ai_error` · **`ai_ok`** (verdict came back clean) ·
**`writeback_ok`** / `writeback_result` (the GHL write-back finished; set only by Record Write-back) ·
`received_at`. A replay stops only when `ai_ok` **and** `writeback_ok` are true.
Timestamps are ISO strings (same convention as the account's other data tables).

## TODOs / gotchas
- ⚠️ **Rows `TEST-screener-0001` … `0006` are test rows** (0005/0006 = the 2026-09-24 test-rig run on Dana Happy) from the 2026-09-23 end-to-end runs
  (0003 = the live Chinese-transcript check, exec 122440; 0004 = the item-4 wiring check on the
  nonexistent contact `TEST-screener-nonexistent`, exec 122459).
  Delete them before real calls flow.
- **n8n MCP gotcha:** a data-table filter written with `condition: 'isTrue'` was silently saved
  without its condition (it became `eq ''` and the boolean column rejected it). Write it as
  `condition: 'eq', keyValue: '={{ true }}'` — and re-check any data-table filter after an MCP push.
- A row with `ai_ok = false` is retried on **every** replay of its call_id. That is the point, but
  a call that can never be classified (no recording at all) will be re-attempted each time GHL
  re-fires; cheap today (no model call without a transcript), worth a look if replays get noisy.
- **Dedupe is check-then-write.** Two webhooks for one call arriving within ~1s could both pass
  the check; the upsert still leaves one row, the cost is one extra AI call (the compare is idempotent).
- A call whose contact is unreadable keeps `writeback_ok = false` and is retried on every replay
  (no AI cost). Test row `TEST-screener-0004` is exactly this case (exec 122472).
- The `owner_name` field is weak: on the test call gpt-4o-mini returned the business name
  ("Ramirez") as the owner's first name. The eval does not score `owner_name` yet.
- `Filter: answered call with id` drops unanswered calls on purpose — the Attempt ladder is fed by
  the no-answer path (events 3/4, item 5), not by this workflow.
