# Screener: Test Rig  [test harness for §10.2 item 4]

- **n8n ID:** `UvApCCNACHD0uwTu` · **URL:** https://n8n.meetobby.com/workflow/UvApCCNACHD0uwTu · **File:** `Screener Test Rig.json`
- **Folder:** `workflows/screener/` · built by `build/gen_testrig.js` (+ `src/test_rig_ops.js`, `src/test_rig_state.js`)
- **Reads:** `screener_graduations` `1iX0aTvMYawwyH4H`, only the test contact row (for `ungraduate`).
- **Status:** manual only — **never activate**. Run with `execute_workflow` (manual, webhook input).

## Purpose
Exercise the real GHL write-back without a WAVV call (which needs go-live). It plays the
screener — sets `Screener Outcome`, which n8n never writes in production — and reads/resets the
state. **Hard-wired to one record:** test contact **Dana Happy** `2Z5mwZe5RT4NQdNW85vj` and its
screener opportunity `FAstcBVvrgbpds2gQIV3`; the ids are constants, not inputs. The one exception is
`ungraduate`, which deletes the Kevin opportunity `Screener: Graduate` logged as **created** for Dana
(never a reused one, never an id from the request).

## Actions (webhook body)
| `action` | Does |
|---|---|
| `read` | nothing; returns stage, status, block followers, screener tags, the five screener fields (incl. Screen Attempts), DND |
| `mark` + `outcome` | sets `Screener Outcome`. `Do Not Call` is **refused** (it would set DND on the receptionist demo record) |
| `reset` | clears the five screener fields (incl. Screen Attempts), removes the 14 result tags, adds `screening` back, removes the ten block followers, opp **open** again in **Attempt 1** |
| `ungraduate` | undoes a Graduate test: deletes the Kevin opp from Dana's `screener_graduations` row (refused unless `created_new`), then a full `reset`. Live 2026-09-24 (123635) |

Every run ends with a fresh read. ⚠️ The stage comes from opportunity **search**, which lags a write
by a few seconds — read again if it looks stale.

## Typical sequence
`reset` → (mock call into Capture, or `mark` first) → `mark` → POST the Mark webhook with
`{"contact_id": "2Z5mwZe5RT4NQdNW85vj"}` → `read` → … → `reset`.

Graduate test: tags `owner-confirmed` + `screened-pt-10-11` and the screener opp in **Owner Verified**
→ wait the 10-min grace → run `Screener: Graduate Sweep` manually → check GHL → `ungraduate`.

## Gotcha
Dana Happy is also the AI-receptionist demo record (tags `obby-demo`, `obby-sms`, …). The rig never
touches those tags; leave her `reset` after a session.
