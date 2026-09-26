# Screener: Graduate Sweep  [spec §8 · §10.2 item 6]

- **n8n ID:** `jZAgBUQvffv1NCMC` · **URL:** https://n8n.meetobby.com/workflow/jZAgBUQvffv1NCMC · **File:** `Screener Graduate Sweep.json`
- **Folder:** `workflows/screener/` · built by `build/gen_graduate.js` (+ `src/graduate_pick.js`)
- **Status:** **Active ✅ since 2026-09-25** (published by Claude at go-live, n8n side; the GHL guards route only
  `screening` leads here).
- **Trigger:** Schedule, every 10 minutes.

## Purpose
Finds screener opportunities that have been in **Owner Verified for at least 10 minutes** and hands
each to **`Screener: Graduate`** (`M2LD6njhVMO9Ol7w`), one at a time.

## Why a sweep, not a trigger
- **Grace window:** a screener who corrects the mark within 10 minutes never sends the lead to Kevin.
- **No races:** one sweep run processes leads one at a time, so two runs can never both create
  Kevin's opportunity (overlapping Compare Step runs could, if Graduate were called from there).
- **Retries for free:** a lead whose graduation failed stays in Owner Verified and is picked again.

## Tested
- 2026-09-24 exec 123593: the Owner Verified search (with `pipeline_stage_id` + `status=open`) works and
  returned 0 — the test contact had just been reset — so nothing was graduated.
- 2026-09-24 exec 123631: end to end. The test contact, 11 min in Owner Verified, was picked (and nothing
  else was there) and handed to Graduate (123632), which graduated it (`ok: true`). See the Graduate context.
