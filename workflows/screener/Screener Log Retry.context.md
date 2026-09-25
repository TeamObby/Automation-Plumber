# Screener: Log Retry  [§10.2 item 7a · codex review 2026-09-25]

- **n8n ID:** `y2oXfZtH4y1mhWQG` · **URL:** https://n8n.meetobby.com/workflow/y2oXfZtH4y1mhWQG · **File:** `Screener Log Retry.json`
- **Folder:** `workflows/screener/` · built by `build/gen_logretry.js` (+ `src/log_retry_pick.js`; shared `build/log_supabase.js`)
- **Status:** created 2026-09-25, **active ✅ since 2026-09-25** (published at go-live, n8n side).
- **Data table:** `screener_log_pending` `qKv7RxgTDsqb1plo` (`pending_key`, `event_key`, `row_json`, `error`, `queued_at`).

## Purpose
The recovery path for the Supabase screener log. The Compare Step and the Attempt Counter never fail a
run because the log write failed: after its HTTP retries, a failed write stores the exact payload in
`screener_log_pending` (key `event_key@decided_ms`, one row per payload version). This sweep replays
those payloads **into Supabase only** — it never repeats a GHL write, and it does not depend on the
original event being delivered again (a WAVV replay stops at dedupe once its attempt row is `ok`).

## Flow
Every 15 minutes → **Get pending log rows** (oldest first, 100) → **Pick replays** (unreadable JSON is
left for a human) → **Supabase: replay screener_log** (POST `/rest/v1/rpc/screener_log_upsert`,
batch 1, `onError: continue`) → **Replayed OK** (pairs results with rows) → **Delete replayed row**.

## Why a replay is safe
`screener_log_upsert` is versioned on `decided_ms` (the time the writing run read GHL): a decision is
replaced only by one read at the same time or later, and call facts are only filled in, never blanked.
So an old pending payload replayed after a newer successful write changes nothing it should not.

## Tested
- Offline: `tests/screener.test.js` §13 (wiring, never calls GHL, bad JSON skipped, only successes deleted).
- Live 2026-09-25 (exec 123682): a hand-queued TEST payload was replayed through the credential, landed
  in Supabase with its version, and its pending row was deleted by the sweep. The Supabase test row
  was then deleted.

## TODOs
- Item 7b's daily summary: list pending rows older than a few hours (the queue should be empty).
