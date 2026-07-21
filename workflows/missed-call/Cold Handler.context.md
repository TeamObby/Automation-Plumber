# Missed Call — Cold Handler

- **n8n ID:** `MKj1ck6WAwvPZWFz` · **URL:** https://n8n.meetobby.com/workflow/MKj1ck6WAwvPZWFz
- **Folder:** missed-call · **Status:** Active ✅ (no trigger — sub-workflow)

## Purpose
Handles a **missed cold call**. Moves the lead's caller opportunity to its next stage — either a
**same-day redial** inside the call pipeline, or a **handoff to the email pipeline** at
Send Cold Email N+1 (see [Routing](#routing-rewritten-2026-07-14-for-the-restructured-call-pipeline)) —
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
6. **Switch** on `mc` → **Instantly: Set Missed Call Email 1 / 2** (sets the Instantly interest
   code that triggers the email). `mc=''` → Switch fallback, **not connected** → no email.

## Routing (rewritten 2026-07-14 for the restructured call pipeline) 🎯
**Two independent decisions.** They used to be one (`N` drove both the move and the email);
they are now decoupled.

### A. Where does the opp go?
**Same-day redial** — a missed **Day 1 Call A** stays in the **call** pipeline
(`9E6y34DlG1Imr8FV42RV`) and re-dials as Call B:

| Missed at | → moves to |
|---|---|
| Day 1 Call A `060f44a8` | **Day 1 Call B** `4cb90aaa` |
| Day 1 Call A (from on hold) `cb2dc70f` | **Day 1 Call B** `4cb90aaa` |
| Day 1 Call A (MGR) `04ccf8e0` | **Day 1 Call B (MGR)** `648c4952` |

**Otherwise** — hand off to the **email** pipeline (`1A1RkYaL93s2rqbQ3Opi`) at `SEND_NEXT[N]`:

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
Format: `[timestamp] <current stage name> no answer` — same shape as before, but naming the
**actual stage** instead of `call N`:
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

## Credentials / constants
- **GHL:** `httpMultipleHeadersAuth` → `DtotRKnzjDewbSsv` · timezone PT (America/Los_Angeles)
- **Instantly:** ⚠️ **hardcoded bearer token** in the node headers — move to a credential + rotate.

## Sync state
Edited locally on **2026-07-14**; **not pushed** (n8n MCP disconnected). Changes vs. live:
- **Rewrote `Build Logs`** for the restructured cold-call pipeline: added the same-day
  **redial** path, rebuilt `STAGE_TO_N` over the new Day 1/2/3 stages, and split the
  missed-call-email choice into its own `MCE_BY_STAGE` table (previously `mc` was just `N`).
- **`GHL: Move Opp → Send Cold Email N+1` renamed → `GHL: Move Opp → Next Stage`**, and its
  `pipelineId` is now **dynamic** (`target_pipeline_id`) — it was hardcoded to the email
  pipeline, which the redial path would have broken.
- **Removed `NOTE_ID` (`4Ysr9E6CKC2vZK9m6MNm`)** and the `updated_note` field it produced, plus
  the corresponding entry in the `GHL: Write Logs` PUT.
- **Removed `LIFECYCLE_ID` (`9T7lODjinSThOnAzAI0G`)** — it was declared but never used.
- **Renamed the interest-code nodes** — `Set Call 1/2 No Answer` →
  **`Instantly: Set Missed Call Email 1/2`**. The old names implied they tracked the *call*
  number; they set the *missed-call-email* interest code, which since the migration is a
  separate axis (`MCE_BY_STAGE`, not `N`). Behavior unchanged: `-29996` / `-29992`, same
  Switch wiring.

## TODOs / gotchas
- Instantly token is a plaintext secret across several nodes — rotate + move to a credential.
- **An unmapped stage is a silent no-op.** `can_move=false` gates the *entire* downstream chain
  (move → logs → Instantly), so nothing is logged either. Pre-existing behavior, unchanged.
- `Switch` fallback output (`extra`, i.e. `mc=''`) is **not connected** — correct: those stages
  send no missed-call email.

## Related
- Upstream: [`Dispatcher.context.md`](./Dispatcher.context.md) (`WRvTiZWThJTQAU8P`).
- Pipelines/stages: [`AGENTS.md`](../../AGENTS.md).
