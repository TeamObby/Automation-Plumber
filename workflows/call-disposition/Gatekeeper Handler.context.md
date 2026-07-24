# Gatekeeper Handler  [Automation 3 — gatekeeper twin]

- **n8n ID:** _pending import_ · **Status:** Inactive ❌ (sub-workflow) — **not yet pushed**
- **Folder:** call-disposition · **Role:** the **gatekeeper-lane twin** of the
  [Cold Handler](./Cold%20Handler.context.md).

> ⚠️ **This is a near-verbatim copy of [`Cold Handler`](./Cold%20Handler.context.md).** They differ in
> **exactly one node** — `Compute MC`'s `MCE_BY_STAGE` uses the **gatekeeper** pipeline's stage IDs
> instead of the cold ones. **Any logic change to one must be applied to the other.**

## Why it exists
Gatekeeper is run like cold (same disposition logic, same shared email pipeline), but calls happen
in the **Gatekeeper Outbound Call Pipeline** (`3onA8GkJnSwgzIGTGSpI`). The lane a lead is in is
decided by the **`gatekeeper` tag** (see [`Cold Handler`](./Cold%20Handler.context.md) → *tag flip*).
A lead **currently in the gatekeeper pipeline** is captured with `route='gatekeeper'` and dispatched
here; a lead in the cold pipeline goes to the Cold Handler. Both handlers carry the **full** tag
logic, because a disposition can flip a lead's lane either way.

## The one difference
`Compute MC` (voicemail branch) reads the caller `stage_id` off Call Router Context and maps it to
the missed-call-email `mc`. This copy uses the **gatekeeper** `MCE_BY_STAGE` (6 entries: `Day 1 Call
A (from on hold)`, `Day 2 Call`/`(MGR)`/`(from on hold)` → mc 1; `Day 2 Call (missed call)` /
`Day 2 Call MGR (missed call)` → mc 2). It has **no plain `Day 1 Call A`** — the gatekeeper pipeline
has none (a lead is never fresh-first-call in the gatekeeper lane).

Everything else — tag add/remove, `continues_drip` (incl. gatekeeper-good), `stop_phone_calls` (incl.
gatekeeper-bad), the move to the **shared** email pipeline / Client Acquisition, logs, idempotency —
is identical to the Cold Handler.

## Metrics logging (call_log)
Carries the **identical** `Sheet: Log Call` node as the [Cold Handler](./Cold%20Handler.context.md)
(off `GHL: Write Logs`, `appendOrUpdate` on `call_id`, `USER_ENTERED`, `onError: continueRegularOutput`
leaf) — `Parse + Map Outcome` is byte-for-byte the same across both twins. The only practical
difference: the `pipeline` column resolves to **`gatekeeper`** here (it echoes the stored `route`).
See [Cold Handler → Metrics logging](./Cold%20Handler.context.md) and
[`AGENTS.md` → Metrics workbook](../../AGENTS.md). Credential `googleSheetsOAuth2Api` → `nVa0UTFYjGo1apqU`.

## ⚠️ Cutover
- Import this workflow; n8n assigns a new ID. Then **set that ID** on the Dispatcher's
  **`Run Gatekeeper Call Handler`** node (it ships with a placeholder `workflowId`).

## Related
- Twin: [`Cold Handler`](./Cold%20Handler.context.md) (Automation 3, cold lane) — read that for the full logic.
- Upstream: [`Dispatcher`](./Dispatcher.context.md) (`route='gatekeeper'` branch) ·
  [`Capture Call Record`](./Capture%20Call%20Record.context.md) (detects the gatekeeper pipeline).
- Pipelines/stages, tag rules: [`AGENTS.md`](../../AGENTS.md).
