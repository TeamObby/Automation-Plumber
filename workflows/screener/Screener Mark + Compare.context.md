# Screener: Mark + Compare  [spec §9 event 2 · §10.2 item 4]

- **n8n ID:** `zVCzfADKZqPWV6hk` · **URL:** https://n8n.meetobby.com/workflow/zVCzfADKZqPWV6hk · **File:** `Screener Mark + Compare.json`
- **Folder:** `workflows/screener/` · built by `build/gen_mark.js`
- **Status:** **Still off** ❌ — the three GHL guards are live (2026-09-25) and the rest of the n8n side is on; this one is
  switched on at go-live by Mohimenul (n8n UI), or by Claude once `publish_workflow` is allowed. Switches:
  [`docs/screener-handoff.md`](../../docs/screener-handoff.md) §3. GHL `Screener Outcome Changed` (its trigger) is also still a draft.
- **Trigger:** Webhook POST **`/webhook/screener-outcome`**, fired by a GHL workflow Hridoy builds:
  *Contact Changed → `Screener Outcome` has changed → webhook* (same pattern as `Manual Review Items Changed`).

## Purpose
The screener picked an answer in the `Screener Outcome` dropdown. Hand the contact to the shared
**`Screener: Compare Step`** (`3pwiQXC8etTcKf5Z`, `source: mark`).

## Payload contract (for Hridoy)
Only **`contact_id`** is required, either top-level (GHL's standard body) or in `customData`.
`customData.screener_outcome` is optional and only logged: the Compare Step **re-reads the mark from
the contact**, so a late or out-of-order webhook can never apply a stale value.

## Flow
Webhook → **Normalize Mark** → **Filter: has contact_id** → **Screener: Compare Step** →
**Filter: compare failed** (`ok = false`) → **Find newest call row for contact** → **Record Mark Failure**
(`writeback_ok = false`, `writeback_fail_ms = now`, `writeback_result = "mark: …"`), so **Screener: Write-back Retry** re-runs it
(codex review, round 2: before this, a failed mark-path write left the row saying done).

## Tested
- 2026-09-23 exec 122457: a nonexistent contact → Compare Step `skip: contact not found`, nothing written.
- 2026-09-23 exec 122487: same contact after round-2 fixes → `ok: false` → its newest row (`TEST-screener-0004`)
  set to `writeback_ok = false`, `mark: skip | contact not readable …`.
