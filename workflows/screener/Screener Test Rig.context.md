# Screener: Test Rig  [test harness for §10.2 item 4]

- **n8n ID:** `UvApCCNACHD0uwTu` · **URL:** https://n8n.meetobby.com/workflow/UvApCCNACHD0uwTu · **File:** `Screener Test Rig.json`
- **Folder:** `workflows/screener/` · built by `build/gen_testrig.js` (+ `src/test_rig_ops.js`, `src/test_rig_state.js`)
- **Status:** manual only — **never activate**. Run with `execute_workflow` (manual, webhook input).

## Purpose
Exercise the real GHL write-back without a WAVV call (which needs the guards). It plays the
screener — sets `Screener Outcome`, which n8n never writes in production — and reads/resets the
state. **Hard-wired to one record:** test contact **Dana Happy** `2Z5mwZe5RT4NQdNW85vj` and its
screener opportunity `FAstcBVvrgbpds2gQIV3`; the ids are constants, not inputs.

## Actions (webhook body)
| `action` | Does |
|---|---|
| `read` | nothing; returns stage, block followers, screener tags, the four screener fields, DND |
| `mark` + `outcome` | sets `Screener Outcome`. `Do Not Call` is **refused** (it would set DND on the receptionist demo record) |
| `reset` | clears the four screener fields, removes the 14 result tags (keeps `screening`), removes the ten block followers, opp back to **Attempt 1** |

Every run ends with a fresh read. ⚠️ The stage comes from opportunity **search**, which lags a write
by a few seconds — read again if it looks stale.

## Typical sequence
`reset` → (mock call into Capture, or `mark` first) → `mark` → POST the Mark webhook with
`{"contact_id": "2Z5mwZe5RT4NQdNW85vj"}` → `read` → … → `reset`.

## Gotcha
Dana Happy is also the AI-receptionist demo record (tags `obby-demo`, `obby-sms`, …). The rig never
touches those tags; leave her `reset` after a session.
