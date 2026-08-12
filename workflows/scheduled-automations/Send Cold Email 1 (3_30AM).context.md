# Send Cold Email 1 (3:30AM)

- **n8n ID:** `6wdNiXnexS3zT5b2` · **URL:** https://n8n.meetobby.com/workflow/6wdNiXnexS3zT5b2
- **Folder:** scheduled-automations · **Status:** Inactive ❌ (schedule-triggered, 3:30AM)

## Purpose
Nightly batch that takes every lead parked in the **Cold Email 1** stage of the email pipeline,
pushes it into the Instantly cold-email campaign, and stamps `email_step_name = cold email 1`
on the GHL contact so it isn't enrolled twice.

## Flow
1. **Schedule 3:30AM** → **Pull Send Cold Email 1 (max 100)** — GHL opportunity search,
   pipeline `1A1RkYaL93s2rqbQ3Opi`, stage Cold Email 1 `f9bcbefb-aa83-44d4-ad8b-59a758993045`.
2. **Split Out** (`opportunities`) → **Loop (batch 10)**.
3. **GHL: Get Contact** — fetches the full contact (needed for the custom fields; the
   opportunity payload doesn't carry them).
4. **Not sent yet?** (IF guard) — reads Email Step Name; proceeds only if it is **not**
   `cold email 1`.
   - **already `cold email 1` → GHL: Move to Cold Email 1 Sent** → **Wait 2s**
     (**stuck-lead recovery**, see below). It used to short-circuit straight to **Wait 2s**,
     which is what let stalled leads accumulate.
5. **IF: Stop Emails?** — reads **Stop Emails** `ixRO9dSUHVd6vNTdFa7Q`:
   - `True` → **GHL: Move to Cold Email 1 Sent** (`41849471-…`) → **Wait 2s**. **No email** — the
     lead skips Instantly but still advances (4:30AM drains `Cold Email 1 Sent` → Day 1 Call A).
   - `False` → the normal send path (step 6).
6. **Instantly: Add to Cold Email 1** — POST `/api/v2/leads` into the campaign.
7. **GHL: Set email_step_name** — PUT contact, writes `cold email 1`.
8. **Wait 2s** → back to **Loop (batch 10)**.

## Idempotency (important)
The **only** thing preventing double-enrollment is the `email_step_name` guard in step 4,
which is written in step 6 — *after* the Instantly POST. If the GHL PUT fails but the
Instantly POST succeeded, the next run re-enrolls that lead. The opp is **not** moved out of
the Cold Email 1 stage by this workflow, so leads stay in scope until the field is stamped.

## 🔁 Stuck-lead recovery (the already-stamped branch)
Instantly's `email_sent` webhook is not perfectly reliable. When it doesn't fire,
[`Email Sent → Move To Sent Stage`](../email-sent/Email%20Sent%20-_%20Move%20To%20Sent%20Stage.context.md)
never runs, so the opp stays in `Cold Email 1` **and** the contact already carries
`email_step_name = cold email 1`. The guard then skips it on every subsequent run: the lead is
never re-emailed and never advances. It is stuck permanently.

The already-stamped branch now **diverts to `Cold Email 1 Sent`** instead of looping past, so
4:30AM can drain it to the call pipeline as normal. This reuses the same
`GHL: Move to Cold Email 1 Sent` node the Stop-Emails path uses — the opp id and target stage
resolve identically on both branches, so it needed no expression changes, only a rewire.

**A late webhook is harmless.** `Build Logs + Route` in the Email-Sent workflow finds the opp with
`oppList.find(o => o.pipelineId === EMAIL_PIPELINE_ID)` and its move is gated on
`email_opp_id notEmpty`. So a webhook arriving after we advanced either re-moves the opp to the
stage it is already in (idempotent no-op) or, if 4:30AM has since moved it into the call pipeline,
finds no email-pipeline opp and skips the move. The logging branch still writes its note, event log,
email history and **Instantly Lead ID** either way.

### ⚠️ The trade-off — enrolled ≠ sent
`email_step_name` records that we **enrolled** the lead, not that Instantly **sent** it. The branch
only fires when a lead is still sitting in `Cold Email 1` at the next 3:30AM run, i.e. ~24h after
enrollment with no send confirmation — normally impossible, since the webhook would have moved it.
But when Instantly is genuinely slow (**weekend send windows, a paused campaign, daily volume
caps**), this advances a lead whose email has not gone out yet, and 4:30AM will hand it to a caller
who assumes the email landed.

That is the accepted cost: an occasional call-before-email is far cheaper than the previous
behaviour, where stuck leads accumulated forever and silently strangled the whole workflow (below).
If it proves noisy, the fix is to age-gate the divert on the opportunity's `updatedAt` rather than
firing on first re-sighting.

## ⚠️ The ≤100 invariant this workflow relies on
The pull is unpaginated (`limit=100`), which is safe **only** because the `Cold Email 1` stage
never exceeds 100 opps. The main drain is
[`Email Sent → Move To Sent Stage`](../email-sent/Email%20Sent%20-_%20Move%20To%20Sent%20Stage.context.md)
(`CDdLps7wfOjyM9Lx`) on send confirmation; the recovery branch above is now a **second** drain, so a
dropped webhook no longer parks an opp in the stage permanently.

Before that branch existed the failure was **silent and compounding**: every lead whose webhook was
missed stayed in the stage forever, the pull filled up with 100 already-sent leads, the guard skipped
every one, no new lead was emailed, and the run still reported success. Intake growth past 100 can
still cause this — the recovery branch bounds the stuck-lead contribution, not the volume one.
(`Send Cold Email 2/3/4` avoids the volume class of bug entirely by paginating.)

## Instantly payload
**Campaign is chosen by the lead's `TZ` custom field** (`Q8NyGdyiYyeaakqmPjNT`) — this is the
lead-*create* point, so it sets which timezone campaign the lead lives in for the whole sequence.
Map (in the `Instantly: Add to Cold Email 1` node's `campaign:` expression; case/whitespace-tolerant,
empty/unknown ⇒ **PT default**): `PT`→`995a75d0-4325-4b19-aefe-e69c9a4a86d2` (California) ·
`CT`→`c2d3708e-de7f-4b06-81d5-db065e174b66` (Texas) · `AKST`→`4905a02f-791b-4dde-baa2-a2eb52a30472`
(Alaska) · `HST`→`ac7941aa-a3c7-4849-8140-222b55d94cb2` (Hawaii). Downstream steps (Cold Email 2/3/4,
missed-call emails) don't repeat the campaign — they key off the existing lead by email/lead_id. Standard fields from the contact
(email, first/last name, company, phone, website) plus `custom_variables`:

| Variable | Source |
|---|---|
| `ghl_contact_id` | contact `id` |
| `city` | contact `city` |
| `hi_firstname` | `"Hi {firstName}\n\n"` if a first name exists, else `""` (blank-safe greeting) |
| `google_stars` | custom field `E7XjZUePJBrJ99LnCD6e` |
| `google_reviews` | custom field `kDel5db3cRFrNjqOwdNp` |

## GHL custom field IDs
- Email Step Name `WtFfl1nEbMupk2oR4m9e` — read by the guard, written as `cold email 1`
- **TZ `Q8NyGdyiYyeaakqmPjNT`** — read; selects the Instantly campaign (`PT`/`CT`/`AKST`/`HST`, default PT)
- Google Stars `E7XjZUePJBrJ99LnCD6e` — read-only
- Google Reviews `kDel5db3cRFrNjqOwdNp` — read-only

## Credentials / constants
- **GHL:** `httpMultipleHeadersAuth` → `DtotRKnzjDewbSsv` · location `rzaMhqeo2apNI1p6DG5z`
- **Instantly:** ⚠️ **hardcoded bearer token** in the node header — move to a credential + rotate.
- All HTTP nodes: `retryOnFail`, 4 tries, 2s backoff.

## TODOs / gotchas
- Instantly token is a plaintext secret in the node header — rotate + move to a credential.
- `lifecycle_status` is retired. Confirm no workflow outside this repo still reads it before
  deleting the field in GHL — the local mirror doesn't cover every workflow on the instance.
- **No pagination — by design.** Pull is `limit=100` with no paging. Confirmed by the operator
  (2026-07-14): the `Cold Email 1` stage never holds more than 100 opps, so one page always sees
  everything. **This is an invariant that depends on something draining the stage** (see below) —
  do not raise intake volume without re-checking it.
- Inactive — the 3:30AM schedule does not fire until the workflow is activated.

## Related
- Upstream feeder: [`New to Cold Email 1 Stage (3AM)`](./New%20to%20Cold%20Email%201%20Stage%20%283AM%29.context.md)
  (`WYYQ7p3wJ3QhBTrQ`) — moves `New` → `Cold Email 1` at 3:00AM, 30 min before this runs.
- Pipelines/stages, custom fields, Instantly subsequence IDs: [`AGENTS.md`](../../AGENTS.md).
- Leads also land in the Cold Email 1 stage via the call-disposition / missed-call Cold Handlers.
