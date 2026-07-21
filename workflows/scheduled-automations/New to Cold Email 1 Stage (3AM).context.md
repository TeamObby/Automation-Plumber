# New to Cold Email 1 Stage (3AM)

- **n8n ID:** `WYYQ7p3wJ3QhBTrQ` · **URL:** https://n8n.meetobby.com/workflow/WYYQ7p3wJ3QhBTrQ
- **Folder:** scheduled-automations · **Status:** Inactive ❌ (schedule-triggered)

## Purpose
The **feeder** for the cold email sequence. Every night it sweeps opportunities sitting in
**New** (Client Acquisition pipeline) and moves them into **Cold Email 1** (email pipeline),
where [`Send Cold Email 1`](./Send%20Cold%20Email%201%20%283_30AM%29.context.md) picks
them up 30 minutes later.

This workflow **only moves opportunities**. It touches no contact custom fields and calls no
external service — the actual Instantly enrollment is entirely `Send Cold Email 1`'s job.

## Flow
1. **Schedule 3:00AM** → **Pull New (max 100)** — GHL opportunity search,
   pipeline `O7LMZpDOFM2SYO65twC5` (Client Acquisition), stage **New**
   `f6aa7e0f-6b83-4a7b-b8b9-620753554b3a`.
2. **Split Out** (`opportunities`) → **Loop (batch 10)**.
3. **GHL: Move Opp → Send Cold Email 1** — PUT `/opportunities/{id}`, setting
   `pipelineId: 1A1RkYaL93s2rqbQ3Opi` + `pipelineStageId: f9bcbefb-…` (Cold Email 1).
   Note this is a **cross-pipeline move**, not just a stage change.
4. **Wait 2s** → back to **Loop (batch 10)**.

## Timing — the 30-minute handoff
| Time | Workflow | Does |
|---|---|---|
| 3:00 AM | **this** | New → Cold Email 1 |
| 3:30 AM | `Send Cold Email 1` | Cold Email 1 → Instantly campaign |

The 30-minute gap is the coupling. At the 100-lead cap with a 2s wait per lead, this run takes
~3.5 min, so the margin is comfortable — but the two schedules are an **implicit contract**.
If you widen the cap or lengthen the wait here, re-check that it still finishes before 3:30.

## Idempotency
Self-limiting, unlike its downstream. Moving an opp **out of** the New stage means the next
run's pull won't see it again. No guard field is needed, and none is used.

## Credentials / constants
- **GHL:** `httpMultipleHeadersAuth` → `DtotRKnzjDewbSsv` · location `rzaMhqeo2apNI1p6DG5z`
- Pull node: `retryOnFail`, 4 tries, 2s backoff. Move node: **5** tries, 2s backoff.

## TODOs / gotchas
- **No pagination — by design.** Pull is `limit=100` with no paging; the `New` stage is not
  expected to exceed 100. See the invariant below.
- Inactive — the 3:00AM schedule does not fire until the workflow is activated. It is the
  feeder, so activating `Send Cold Email 1` alone accomplishes nothing.

## The ≤100 invariant
Confirmed by the operator (2026-07-14): the relevant stages never exceed 100 opps, so the
unpaginated `limit=100` pull here (and in `Send Cold Email 1`) always sees everything.

Worth knowing **why** that holds: this workflow pushes up to 100 leads/night **into**
`Cold Email 1`, and `Send Cold Email 1` never moves them **out**. The drain is
[`Email Sent → Move To Sent Stage`](../email-sent/Email%20Sent%20-_%20Move%20To%20Sent%20Stage.context.md)
(`CDdLps7wfOjyM9Lx`) — an Instantly webhook that moves each opp to `Cold Email 1 Sent`
(`41849471-…`) once the send is confirmed.

**Why it's worth being careful:** if that drain ever stops, or intake grows past 100, the
unpaginated pull in `Send Cold Email 1` starts returning a full page of already-sent leads that
its guard skips — new leads silently stop being emailed while both workflows report success.
Re-check before raising volume. (`Send Cold Email 2/3/4` is immune: it paginates.)

## Related
- Downstream: [`Send Cold Email 1 (3:30AM)`](./Send%20Cold%20Email%201%20%283_30AM%29.context.md) (`6wdNiXnexS3zT5b2`).
- Pipelines/stages, custom fields, Instantly IDs: [`AGENTS.md`](../../AGENTS.md).
