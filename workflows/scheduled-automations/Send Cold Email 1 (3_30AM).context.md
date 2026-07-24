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
   `cold email 1`. Already-enrolled leads short-circuit to **Wait 2s** and loop on.
5. **IF: Stop Emails?** (added 2026-07-20) — reads **Stop Emails** `ixRO9dSUHVd6vNTdFa7Q`:
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

## ⚠️ The ≤100 invariant this workflow relies on
The pull is unpaginated (`limit=100`), which is safe **only** because the `Cold Email 1` stage
never exceeds 100 opps. This workflow never removes an opp from that stage — the drain is
[`Email Sent → Move To Sent Stage`](../email-sent/Email%20Sent%20-_%20Move%20To%20Sent%20Stage.context.md)
(`CDdLps7wfOjyM9Lx`), an Instantly webhook that moves each opp to `Cold Email 1 Sent` once the
send is confirmed. **That workflow is load-bearing for this one.**

If it stops (or intake grows past 100), the failure here is **silent**: the pull returns 100
already-sent leads, the `email_step_name` guard skips every one, no new lead is emailed, and the
run still reports success. (`Send Cold Email 2/3/4` avoids this class of bug entirely by
paginating — its stages genuinely do accumulate.)

## Instantly payload
Campaign `995a75d0-4325-4b19-aefe-e69c9a4a86d2`. Standard fields from the contact
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
