# Screener: Capture Call  [spec §9 event 1 · §10.2 items 1 + 3]

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

**It writes nothing to GHL.** Writing `Screen AI Verdict`, comparing with the screener's mark,
moving the stage and tagging the hour block are **item 4** (`Screener: Classify + Mark`).

## Flow
1. **Webhook** → **Normalize Call** — reads WAVV's fields from `customData` (`call_id`,
   `ghl_user_id`, `wavv_caller_id`, `call_answered_at_timestamp`, `call_transcript`,
   `call_recording_url`, `call_duration_seconds`) and computes the **Pacific hour block**.
2. **Filter: answered call with id** — needs a `call_id` (dedupe key) and an answered timestamp.
3. **Dedupe: no successful row for call_id** — data table `rowNotExists` on
   `call_id = X AND ai_ok = true`. A replay of a call that was classified cleanly stops here,
   **before** the AI call; a call whose row was stored after a failure (`ai_ok = false`: API error,
   no transcript) is **processed again** and its row overwritten. Verified live 2026-09-23 on
   `TEST-screener-0002`: empty transcript → stored `ai_ok=false` (exec 122380) → replay with a
   transcript re-classified and overwrote the same row id (122382) → replay again stopped at the
   dedupe (122384).
4. **IF: transcript missing?** — WAVV normally sends `call_transcript` itself. Only when it is
   empty and a recording exists: Download MP3 → Whisper → **Set Transcript (from audio)**.
   (This branch is copied from `Capture Call Record` and has **not** been exercised with a real
   recording yet.)
5. **Transcript Ready** → **Screener: Classify Transcript** (sub-workflow `LbGY5ptzldJjnTZJ`).
6. **Build Row** → **Store** — upsert on `call_id` into `screener_calls`.

## Hour block (item 3)
`answered_at` (UTC) → hour in `America/Los_Angeles` → `PT HH-HH+1`, **only** for the ten blocks
`PT 06-07` … `PT 15-16`; any other hour gets `''`. Always Pacific, even for an Eastern lead
(spec §6). Uses `Intl` (DST-correct; tested on both 2026 transitions).
Tag spelling is part of the Hridoy/Mohimenul contract: `PT 10-11` → **`screened-pt-10-11`**.

## Data table `screener_calls` — `3WK4mrEYwvDeDUVO`
`call_id` · `contact_id` · `contact_name` · `ghl_user_id` · `wavv_caller_id` · `answered_at` ·
`pt_block` · `pt_block_tag` · `duration_sec` · `recording_url` · `transcript` · `transcript_source`
(`wavv`/`whisper`) · `ai_call_outcome` · `ai_owner_reached` · `ai_confidence` · `ai_evidence_quote` ·
`ai_quote_verified` · `ai_owner_name` · `ai_model` · `ai_error` · **`ai_ok`** (verdict came back clean;
the dedupe key) · `received_at`.
Timestamps are ISO strings (same convention as the account's other data tables).

## TODOs / gotchas
- ⚠️ **Rows 1–3 (`TEST-screener-0001` … `0003`, contact `TEST-SCREENER-CONTACT`) are test rows**
  from the 2026-09-23 end-to-end runs (0003 = the live Chinese-transcript check, exec 122440).
  Delete them before real calls flow.
- **n8n MCP gotcha:** a data-table filter written with `condition: 'isTrue'` was silently saved
  without its condition (it became `eq ''` and the boolean column rejected it). Write it as
  `condition: 'eq', keyValue: '={{ true }}'` — and re-check any data-table filter after an MCP push.
- A row with `ai_ok = false` is retried on **every** replay of its call_id. That is the point, but
  a call that can never be classified (no recording at all) will be re-attempted each time GHL
  re-fires; cheap today (no model call without a transcript), worth a look if replays get noisy.
- **Dedupe is check-then-write.** Two webhooks for one call arriving within ~1s could both pass
  the check; the upsert still leaves one row, the cost is one extra AI call.
- The `owner_name` field is weak: on the test call gpt-4o-mini returned the business name
  ("Ramirez") as the owner's first name. The eval does not score `owner_name` yet.
- `Filter: answered call with id` drops unanswered calls on purpose — the Attempt ladder is fed by
  the no-answer path (events 3/4, item 5), not by this workflow.
