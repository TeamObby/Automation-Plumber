# Call Disposition — Dispatcher (Router)  [Automation 2]

- **n8n ID:** `SfI5Hx6mlc4Qh3D1` · **URL:** https://n8n.meetobby.com/workflow/SfI5Hx6mlc4Qh3D1
- **Folder:** call-disposition · **Status:** Inactive ❌ — **repurposed 2026-07-14, not yet pushed**
- **Role:** Automation 2 of the multi-update rebuild.

> **This workflow was rewritten.** It used to be the single call-recorded entry point
> (transcribe → poll → route → handler). That job is now split: **[Capture Call Record](./Capture%20Call%20Record.context.md)**
> (Automation 1) handles the call-recorded event; this workflow is now the **thin Router** for
> **disposition/note updates**, and the **[Cold Handler](./Cold%20Handler.context.md)** (Automation 3)
> does the classify/move/log.

## Purpose
Fires whenever a caller sets or updates **Call Disposition** or **Call Notes** — as many times as
they edit them. It reads the context Capture already stored, decides whether this event should be
processed (the **gate**), and dispatches to the matching handler by the **stored** `route`. It does
**not** transcribe, poll, fetch opps, or re-derive the route — all of that happened in Capture.

## Triggers (two entry points)
1. **Webhook (Disposition/Note Updated)** — path `/webhook/call-disposition-updated`. ⚠️ Needs a
   GHL automation that fires on **Call Disposition OR Call Notes changed**, POSTing `contact_id`.
2. **When Called for Fallback** — Execute Workflow trigger, invoked by Capture after its grace wait
   when nobody dispositioned. Receives `{contact_id, call_id, fallback:true}`.

Both converge on **Normalize** (`contact_id`, `call_id`, `is_fallback`).

## Flow
1. **Normalize** → **GHL: Get Contact** (reads Call Disposition, Call Notes, Call Router Context,
   Last Call Transcript, Call Processing State).
2. **Prep + Gate** (code) — the brain (below). Emits `proceed` + the handler input contract.
3. **IF: proceed?** — `false` → **Stopped (gate)** (NoOp); `true` → the Switch.
4. **Switch: branch on call pipeline** (stored `route`) → `cold` → **Run Cold Call Handler**
   (`toFDNpFhy0ZyxfxN`); else → **Other routes (build later)** (stub).

## 🚦 The gate (Prep + Gate) — verified against 9 scenarios
Two inputs decide everything: `is_fallback` (which trigger fired) and `processed` (from stored
state). `disposition`/`note` come from the live custom fields; `signature = slug(disposition)|note`.

| Situation | Result |
|---|---|
| Webhook, disposition/note present | **proceed** |
| Webhook, both empty (a clear / spurious) | stop `empty-input` |
| Webhook, `processed` & signature == `last_signature` | stop `duplicate` (identical re-fire) |
| Webhook, disposition **or** note changed | **proceed** (re-process; handler is idempotent) |
| **Fallback**, `processed==false` | **proceed**, force disposition/note = `""` → **AI-only** |
| **Fallback**, stale field values present | **proceed**, values **ignored** (forced empty) |
| **Fallback**, `processed==true` | stop `fallback-after-processed` (**downgrade guard**) |

The fallback **forces disposition/note empty** so a stale value from a previous call can't leak in;
the AI classifies from the transcript. The downgrade guard stops a late fallback from overwriting a
real human decision.

## Handler input contract (Router → Cold Handler)
`contact_id, is_fallback, disposition, note, transcript, opp_id, route, caller_N, call_id,
stage_name, signature, last_event_log_entry, last_call_summary_entry, last_signature, company_name,
contact`. (The Cold Handler's voicemail branch needs the raw **`stage_id`** too, but it reads that
straight off the passed-through `contact`'s Call Router Context — the Router doesn't carry it as a
separate field.)

The Cold Handler (Automation 3) consumes this and, after it writes, sets `Call Processing State`
= `{processed:true, last_event_log_entry, last_call_summary_entry, last_signature}` — which this
Router (and Capture's fallback) read next time.

## Sync state
Rewritten locally **2026-07-14**; **not pushed** (n8n MCP disconnected). Same workflow ID reused
(`SfI5Hx6mlc4Qh3D1`). The old nodes (Whisper, poll loop, wavv-tag cleanup, `Route by Opp`,
`GHL: Clear Call Fields`) are **gone** — moved to Capture or deleted. Set `active` only after the
full cutover (§ below).

## ⚠️ Cutover — do these together
1. Create the GHL "Call Disposition OR Call Notes changed → webhook" automation → point at
   `/webhook/call-disposition-updated`.
2. Import **Capture Call Record**, set its `-> Automation 2 (fallback)` node's workflow ID to
   `SfI5Hx6mlc4Qh3D1` (this workflow).
3. Update the **Cold Handler** (Automation 3) to read the new input contract + write the state.
4. Repoint the GHL **Call Recorded** trigger from here to **Capture Call Record**.
5. Activate all three.

Until then this stays **inactive** — its trigger changed from call-recorded to field-change, so the
old call-recorded flow would break if half-migrated.

## TODOs / gotchas
- Only **cold** route wired; conversation/rebooking are stubs (unchanged).
- **Anomaly is handled upstream in [Capture Call Record](./Capture%20Call%20Record.context.md)**, not here — a lead in 2+ call
  pipelines is stopped before any context is stored, so the Router never sees it.
- The whole poll/transcribe/clear apparatus is gone — the destructive `GHL: Clear Call Fields`
  bug is resolved by construction.

## Related
- Upstream: [`Capture Call Record`](./Capture%20Call%20Record.context.md) (Automation 1).
- Downstream: [`Cold Handler.context.md`](./Cold%20Handler.context.md) (Automation 3, `toFDNpFhy0ZyxfxN`).
- Field IDs, pipelines/stages: [`AGENTS.md`](../../AGENTS.md).
