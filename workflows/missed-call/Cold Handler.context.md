# Missed Call — Cold Handler

- **n8n ID:** `MKj1ck6WAwvPZWFz` · **URL:** https://n8n.meetobby.com/workflow/MKj1ck6WAwvPZWFz
- **Folder:** missed-call · **Status:** Active ✅ (no trigger — sub-workflow)

## Purpose
Handles a **missed cold call**. Moves the lead's caller opportunity to its next stage — either a
**same-day redial** inside the call pipeline, or a **handoff to the email pipeline** at
Send Cold Email N+1 (see [Routing](#routing)) —
then logs the no-answer, sets the Instantly missed-call interest code (if this stage sends one),
removes the lead from its Instantly subsequence, and refreshes the `hi_firstname` variable.

## Invocation
- Trigger **When Called by Dispatcher** (Execute Workflow trigger). Receives the Missed Call
  Dispatcher's Route output — reads `opp_id`/`matched_opp_id`, `stage_id`/`matched_stage_id`,
  `contact_id`, `instantly_lead_id`, `email`. **Does not use Cached Values.**

## Flow
1. **When Called by Dispatcher** → **Normalize** → **GHL: Get Contact**.
2. **Build Logs** — the brain: decides **redial vs. email handoff**, the target stage, the
   missed-call-email number, the Instantly interest code, and the event-log entry.
3. **Can move (opp found)?** (filter) → **GHL: Move Opp → Next Stage**
   (PUT; **`pipelineId` is dynamic** — call *or* email pipeline).
4. **GHL: Write Logs** (PUT contact) — updates Event Logs (+ Email Step Name if it sends).
5. **Instantly: Remove from Subsequence** → **Instantly: Update hi_firstname**.
6. **Gate: emails allowed?** (Filter) → **Switch** on `mc` → **Instantly: Set
   Missed Call Email 1 / 2** (sets the Instantly interest code that triggers the email). `mc=''` →
   Switch fallback, **not connected** → no email. The gate passes only when **Stop Emails**
   `ixRO9dSUHVd6vNTdFa7Q` is **off** — a `Stop Emails=True` lead is still moved + logged, but the
   missed-call email is **skipped**. `Build Logs` computes `stop_emails = field==='True' || (contact
   has no email)`, so a **no-email lead** is also gated here (never a blank-email Instantly call) and
   its move still targets `SEND_NEXT_SENT[N]` → it keeps advancing through the caller stages.

## Routing 🎯
**Two independent decisions.**

### A. Where does the opp go?
**Same-day redial** — a missed **Day 1 Call A** stays in the **call** pipeline
(`9E6y34DlG1Imr8FV42RV`) and re-dials as Call B:

| Missed at | → moves to |
|---|---|
| Day 1 Call A `060f44a8` | **Day 1 Call B** `4cb90aaa` |
| Day 1 Call A (from on hold) `cb2dc70f` | **Day 1 Call B** `4cb90aaa` |
| Day 1 Call A (MGR) `04ccf8e0` | **Day 1 Call B (MGR)** `648c4952` |

**Otherwise** — hand off to the **email** pipeline (`1A1RkYaL93s2rqbQ3Opi`) at `SEND_NEXT[N]`
(or **`SEND_NEXT_SENT[N]`** — Cold Email N **Sent** — when **Stop Emails** `ixRO9dSUHVd6vNTdFa7Q` is
`True`, so no cold email is sent but 4:30AM still drains it. Redial is unaffected):

| `STAGE_TO_N` | Stages | → |
|---|---|---|
| **1** | Day 1 Call B, Day 1 Call B (MGR) | Cold Email 2 `e4b13f51` |
| **2** | Day 2 Call · (MGR) · (from on hold) · (missed call) · MGR (missed call) | Cold Email 3 `342b193f` |
| **3** | Day 3 Call · (MGR) · (from on hold) · (missed call) · MGR (missed call) | Cold Email 4 `f3ea4cd2` |

### B. Which missed-call email (if any)?
**`MCE_BY_STAGE` — independent of `N`.** MCE1 = *first* miss of Day 1 or Day 2. MCE2 = *second*
miss of Day 2 (the lead is already parked in a Day 2 `missed call` stage).

| MCE | Interest | Stages |
|---|---|---|
| **1** | `-29996` | Day 1 Call A · A (MGR) · A (from on hold) · Day 2 Call · (MGR) · (from on hold) |
| **2** | `-29992` | Day 2 Call (missed call) · Day 2 Call MGR (missed call) |
| **none** | `0` | **Day 1 Call B / B (MGR)** and **all Day 3 stages** — move only |

⚠️ **Note the asymmetry:** a missed *Day 1 Call A* both **redials** *and* **sends MCE1**. A missed
*Day 1 Call B* does the opposite — hands off to email but sends **no** missed-call email.

**All 15 call stages are mapped** — every one lands in either `REDIAL_TO` (3) or `STAGE_TO_N` (12);
none fall through. A stage id outside the cold-call pipeline yields `can_move=false` → silent
no-op (see gotchas).

## Event log
Format: `[timestamp] <current stage name> no answer`:
```
[Tue, Jul 14, 2026, 09:12 AM (PT)] Day 1 Call A no answer
[Tue, Jul 14, 2026, 09:12 AM (PT)] Day 2 Call (missed call) no answer
[Tue, Jul 14, 2026, 09:12 AM (PT)] Day 3 Call (MGR) no answer
```
Append-only (newline-joined onto the existing Event Logs value).

## GHL custom field IDs
- Event Logs `7D9N71mEDfipN90zfV0j` — appended
- Email Step Name `WtFfl1nEbMupk2oR4m9e` — written `missed call email N` **only when `sends_email`**
- Instantly Lead ID `TWLomDBX0XInU1IKrG8L` — read

## Metrics logging (call_log)
A leaf **`Sheet: Log Call`** node hangs off **`GHL: Write Logs`** and **appends** one row to the
**`call_log`** tab (*Plumber Campaign Metrics* `1RuupHeSo8-…`, gid `412127457`).
- **Op `append`** (no dedup key — a missed call fires once; `call_id` is left blank, unlike the
  disposition handler's `appendOrUpdate`).
- `picked_up` is the literal **`FALSE`** (missed call). Populated columns come from `Build Logs`:
  `timestamp_pt, date_pt, contact_id, company, city, pipeline` (`cold`), `stage_name, attempt_no,
  is_mgr, is_missed_variant`. All disposition/outcome columns (`disposition_source, disposition_slug,
  ai_outcome, final_outcome, resume_call_at`) plus `from_number, duration_sec, recording_url, call_id`
  are left **blank** — a missed call has no human disposition.
- **`call_transcript` is not mapped at all here** (the disposition handlers do map it): a missed call
  was never picked up, so there is nothing to transcribe. `append` simply leaves the column empty.
  The test asserts this asymmetry — `MISSED_CALL_HEADERS` in
  [`tests/metrics-logging.test.js`](../../tests/metrics-logging.test.js) is `CALL_HEADERS` minus
  `call_transcript`.
- `USER_ENTERED`; `onError: continueRegularOutput`, leaf (no downstream) → never blocks the move.
- ⚠️ **Twin:** the [Gatekeeper Handler](./Gatekeeper%20Handler.context.md) has the identical node
  (`pipeline` = `gatekeeper`).
- Credential `googleSheetsOAuth2Api` → `nVa0UTFYjGo1apqU`. Schema:
  [`AGENTS.md` → Metrics workbook](../../AGENTS.md).

## Credentials / constants
- **GHL:** `httpMultipleHeadersAuth` → `DtotRKnzjDewbSsv` · timezone PT (America/Los_Angeles)
- **Google Sheets:** `googleSheetsOAuth2Api` → `nVa0UTFYjGo1apqU` (`Sheet: Log Call` → `call_log`)
- **Instantly:** ⚠️ **hardcoded bearer token** in the node headers — move to a credential + rotate.

## TODOs / gotchas
- Instantly token is a plaintext secret across several nodes — rotate + move to a credential.
- **An unmapped stage is a silent no-op.** `can_move=false` gates the *entire* downstream chain
  (move → logs → Instantly), so nothing is logged either.
- `Switch` fallback output (`extra`, i.e. `mc=''`) is **not connected** — correct: those stages
  send no missed-call email.

## Related
- Upstream: [`Dispatcher.context.md`](./Dispatcher.context.md) (`WRvTiZWThJTQAU8P`).
- Pipelines/stages: [`AGENTS.md`](../../AGENTS.md).
