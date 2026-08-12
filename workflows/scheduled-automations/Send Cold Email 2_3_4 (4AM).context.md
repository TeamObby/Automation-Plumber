# Send Cold Email 2/3/4 (4AM)

- **n8n ID:** `0iXr4fHGqptYGJpg` · **URL:** https://n8n.meetobby.com/workflow/0iXr4fHGqptYGJpg
- **Folder:** scheduled-automations · **Status:** **Active ✅** (schedule 4:00AM)

## Purpose
Nightly batch that sends **cold emails 2, 3 and 4**. One workflow covers all three steps: it
pulls each of the three GHL stages in parallel, derives `N` from the stage the opp sits in, and
drives Instantly accordingly. This is the **continuation** of the sequence that
[`Send Cold Email 1`](./Send%20Cold%20Email%201%20%283_30AM%29.context.md) starts.

Unlike step 1, the send is **not** a lead-create — the lead already exists in Instantly. The
email is triggered by **setting an interest code**, which Instantly-side automation maps to the
right subsequence.

## Flow
1. **Schedule 4AM** fans out to **three parallel pulls** (email pipeline `1A1RkYaL93s2rqbQ3Opi`):
   | Node | Stage | ID |
   |---|---|---|
   | Pull Send Cold Email 2 | Cold Email 2 | `e4b13f51-…` |
   | Pull Send Cold Email 3 | Cold Email 3 | `342b193f-…` |
   | Pull Send Cold Email 4 | Cold Email 4 | `f3ea4cd2-…` |
   All three **paginate properly** (see below).
2. **Combine** (merge, 3 inputs) → **Split Out** (`opportunities`).
3. **Detect N** (code) — maps `pipelineStageId` → `N` via `SEND_TO_N`. Emits
   `routable = (2 ≤ N ≤ 4) && contact_id`.
4. **Is routable?** (filter) — drops anything unmapped or missing a contact.
5. **Loop (batch 10)** → **GHL: Get Contact**.
6. **Build** (code) — the brain. Reads custom fields, computes `interest_value`, `step_name`
   (`cold email N`), `already_sent`, plus **`stop_emails`** and **`sent_stage_id`**.
7. **Not sent yet?** (IF on `already_sent === false`) — `false` continues to step 8;
   **`true` → GHL: Move to Cold Email N Sent** → **Wait 2s** (**stuck-lead recovery**, below).
   It used to short-circuit straight to **Wait 2s**, which left stalled leads parked forever.
8. **IF: Stop Emails?** — reads **Stop Emails** `ixRO9dSUHVd6vNTdFa7Q`:
   - `True` → **GHL: Move to Cold Email N Sent** (`sent_stage_id`: CE2→`fdd4f9a4`, CE3→`2f599547`,
     CE4→`39a20e88`) → **Wait 2s**. **No email** — skips Instantly, but 4:30AM still drains it.
   - `False` → the normal send path (step 9).
9. **Instantly: Update hi_firstname** → **Instantly: Remove from Subsequence** →
   **Set interest (cold email N)** → **GHL: Set email_step_name** → **Wait 2s** → loop.

The remove-then-set-interest order matters: the lead is pulled out of whatever subsequence it
was in **before** the new interest code enrolls it in the next one.

## N → interest value
| N | Interest |
|---|---|
| 2 | `-29995` |
| 3 | `-29994` |
| 4 | `-29993` |

_(Compare the missed-call codes in the Cold Handlers: N=1 → `-29996`, N=2 → `-29992`.)_

## GHL custom field IDs
- Email Step Name `WtFfl1nEbMupk2oR4m9e` — read for the `already_sent` guard, written as `cold email N`
- Instantly Lead ID `TWLomDBX0XInU1IKrG8L` — read; used for the PATCH + subsequence-remove calls

## ✅ Pagination — this is the reference implementation
All three pull nodes paginate correctly:
```
startAfterId  = {{ $response.body.meta.startAfterId }}
startAfter    = {{ $response.body.meta.startAfter }}
completeWhen  = {{ $response.body.opportunities.length < 100 }}
```
It **needs** to: nothing moves opps out of Cold Email 2/3/4, so those stages genuinely
accumulate past 100 and a single page would miss leads.

`Send Cold Email 1` deliberately has **no** pagination — its stage is capped at ≤100 by an
upstream drain, so one page always suffices. That's a valid difference, not an oversight. Use
the block above as the reference for any **new** stage-pull that can exceed 100.

## Idempotency
Guarded by `already_sent` (`email_step_name === 'cold email N'`), computed in **Build** and
enforced by **Not sent yet?**. As in step 1, the stamp is written **after** the send, so a
send-succeeds-then-GHL-PUT-fails window can re-send on the next run. The PUT has 4 retries.

## 🔁 Stuck-lead recovery (the already-sent branch)
Instantly's `email_sent` webhook is not perfectly reliable. When it doesn't fire,
[`Email Sent → Move To Sent Stage`](../email-sent/Email%20Sent%20-_%20Move%20To%20Sent%20Stage.context.md)
never runs, so the opp stays in `Cold Email N` **and** the contact already carries
`email_step_name = cold email N`. `already_sent` is then true on every later run: the lead is never
re-emailed and never advances — stuck permanently.

The already-sent branch now **diverts to `sent_stage_id`** instead of looping past. It reuses the
same `GHL: Move to Cold Email N Sent` node as the Stop-Emails path, and needed no expression
changes: **Build** runs upstream of the guard, so `email_opp_id` and `sent_stage_id` resolve
identically on both branches.

This also fixes the unbounded-growth problem this workflow used to have. It previously **never**
moved an opp out of its stage, so Cold Email 2/3/4 accumulated every already-sent lead forever and
burned a `GHL: Get Contact` call on each one every night. Pagination meant that never starved new
leads, but the stages grew without bound. Now each already-sent lead is drained on the first run
that sees it.

**A late webhook is harmless** — `Build Logs + Route` resolves the opp by email-pipeline membership
and gates its move on `email_opp_id notEmpty`, so it either re-moves to the same stage (no-op) or
finds nothing to move. The logging branch still writes its note, event log, email history and
**Instantly Lead ID** regardless.

### ⚠️ The trade-off — enrolled ≠ sent
`email_step_name` records that we **enrolled** the lead, not that Instantly **sent** it. The branch
only fires when a lead is still in `Cold Email N` at the next 4AM run — ~24h after enrollment with
no send confirmation, which normally cannot happen. But when Instantly is genuinely slow (**weekend
send windows, a paused campaign, daily volume caps**), this advances a lead whose email has not gone
out, and 4:30AM hands it to a caller who assumes it landed. Accepted cost: an occasional
call-before-email beats leads stuck forever. If it proves noisy, age-gate the divert on the
opportunity's `updatedAt` instead of firing on first re-sighting.

## Error handling
- `Instantly: Update hi_firstname` and `Instantly: Remove from Subsequence` →
  `onError: continueRegularOutput`. Deliberate: a lead with a blank `instantly_lead_id`
  produces a malformed URL / empty id, and these two steps are best-effort. The send itself
  (`Set interest`) keys off **`lead_email`**, not the lead id, so it still works.
- `Instantly: Remove from Subsequence` is the **only HTTP node without `retryOnFail`**.
- All other HTTP nodes: 4 tries, 2s backoff.

## Credentials / constants
- **GHL:** `httpMultipleHeadersAuth` → `DtotRKnzjDewbSsv` · location `rzaMhqeo2apNI1p6DG5z`
- **Instantly:** ⚠️ **hardcoded bearer token** in three node headers — move to a credential + rotate.

## ⚠️ Operational: the sequence has no entry point
This workflow is **Active**, but **`New to Cold Email 1 Stage (3AM)`** and
**`Send Cold Email 1 (3:30AM)`** are both **Inactive**. So steps 2/3/4 run nightly while
**step 1 never fires** — nothing new enters the sequence, and leads only reach Cold Email 2/3/4
via the call-disposition / missed-call Cold Handlers. Either that's intentional (email 1 paused)
or the two step-1 workflows were never switched on. Worth confirming.

## TODOs / gotchas
- Instantly token is a plaintext secret in three node headers — rotate + move to a credential.
- ~~Stages never drain. Harmless today thanks to pagination; still unbounded growth.~~ **Fixed** —
  the already-sent branch now drains them (see *Stuck-lead recovery*).
- `already_sent` compares lowercased/trimmed — safe against casing drift in the GHL field.

## Related
- Upstream: [`Send Cold Email 1 (3:30AM)`](./Send%20Cold%20Email%201%20%283_30AM%29.context.md) (`6wdNiXnexS3zT5b2`)
  and its feeder [`New to Cold Email 1 Stage (3AM)`](./New%20to%20Cold%20Email%201%20Stage%20%283AM%29.context.md).
- Leads also enter Cold Email 2/3/4 from the call-disposition / missed-call **Cold Handlers**
  (`SEND_NEXT`).
- Pipelines/stages, custom fields, Instantly IDs: [`AGENTS.md`](../../AGENTS.md).
