# Screener: Write-back Retry  [§10.2 item 4 · recovery]

- **n8n ID:** `IvxTYaChixQOiNzt` · **URL:** https://n8n.meetobby.com/workflow/IvxTYaChixQOiNzt · **File:** `Screener Write-back Retry.json`
- **Folder:** `workflows/screener/` · built by `build/gen_retry.js` (+ `src/pick_retries.js`)
- **Status:** Inactive ❌ — built 2026-09-23. **Keep inactive until the four GHL guard branches exist.**
- **Trigger:** Schedule, every 15 minutes.

## Purpose
The durable retry for the GHL write-back. GHL posts each webhook **once** and n8n answers 200
immediately, so nothing ever replays a failed run. Every path records its outcome on the call's
`screener_calls` row instead (`writeback_ok`), and this sweep re-runs the ones that did not finish.

## Flow
1. **Get rows** where `ai_ok = true` **and** `writeback_ok = false` (newest 200). Written as
   `condition: 'eq'` + `={{ false }}` — the MCP drops `isTrue`/`isFalse`.
2. **Pick newest per contact (48 h)** — one row per contact (its newest call; older calls are
   superseded), and only rows received in the last 48 h.
3. **Verdict For Contact** (same code as Capture) → **Screener: Compare Step** (`source: retry`), which
   saves the verdict first, then reads — so a retry always has the ordering guarantee.
4. **Write-back ok?** → **Record Success (unless a newer failure)** / **Record Failure** on that row, versioned
   like Capture (`writeback_fail_ms`), `writeback_result` = `retry: …`.

## What lands at writeback_ok = false
A GHL request failed · the contact could not be read · the opportunity search failed · the verdict
could not be saved before the read and the run had to wait · a Mark run failed (its contact's newest row).

## Tested
- 2026-09-23 exec 122483: picked only `TEST-screener-0004` (rows 1–3 have `writeback_ok = null` and are
  correctly ignored), Compare Step → `skip`/retry, row updated to `retry: skip | contact not readable …`.
- Offline: `tests/screener.test.js` §8 (picker, filter, wiring, same Verdict For Contact code as Capture).

## TODOs / gotchas
- Rows older than 48 h stay `writeback_ok = false` for a human; the item-7 daily summary should list them.
- A permanently unreadable contact is retried every 15 min for 48 h (cheap: two GHL reads, no AI).
