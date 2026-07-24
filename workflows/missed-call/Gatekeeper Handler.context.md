# Missed Call — Gatekeeper Handler  [gatekeeper twin]

- **n8n ID:** _pending import_ · **Status:** Inactive ❌ (sub-workflow) — **not yet pushed**
- **Folder:** missed-call · **Role:** the **gatekeeper-lane twin** of the
  [missed-call Cold Handler](./Cold%20Handler.context.md).

> ⚠️ **Copy of [`Cold Handler`](./Cold%20Handler.context.md) — edit both.** They differ **only** in
> the `Build Logs` node: `CALL_PIPELINE` = the gatekeeper pipeline `3onA8GkJnSwgzIGTGSpI`, and the
> `STAGE_NAME` / `REDIAL_TO` / `STAGE_TO_N` / `MCE_BY_STAGE` maps use the **gatekeeper** stage IDs.

## Why it exists
When a lead **in the gatekeeper call pipeline** misses a call, it must redial / hand off **within
the gatekeeper lane** (not cold). The missed-call [Dispatcher](./Dispatcher.context.md) detects the
lead's pipeline (`route='gatekeeper'`) and calls this handler; a cold-pipeline lead goes to the Cold
Handler. Missed calls don't change the `gatekeeper` tag (no human contact), so the lane is stable.

## The differences (all in `Build Logs`)
- **Same-day redial** stays in gatekeeper: `Day 1 Call A (from on hold)` → `Day 1 Call B`
  (`b9ce3091` → `09efdb09`). The gatekeeper pipeline has **no plain `Day 1 Call A`**, so that's the
  only redial source.
- **Handoff** to the **shared** email pipeline (`SEND_NEXT` → Cold Email N+1) is unchanged — email
  is shared.
- **Missed-call email** `mc` uses the gatekeeper `MCE_BY_STAGE` (Day 1 A-from-hold / Day 2 first
  attempts → mc 1; Day 2 missed → mc 2).
- Everything else (Instantly interest codes, hi_firstname, logs, Stop Emails divert) is identical to
  the cold twin.

## ⚠️ Cutover
- Import this workflow; n8n assigns an ID. Then **set that ID** on the missed-call Dispatcher's
  **`-> Missed Call Gatekeeper Handler`** node (ships with an empty placeholder `workflowId`).

## Related
- Twin: [`Cold Handler`](./Cold%20Handler.context.md) — read that for the full logic.
- Upstream: [`Dispatcher`](./Dispatcher.context.md) (`route='gatekeeper'` branch).
- Pipelines/stages: [`AGENTS.md`](../../AGENTS.md).
