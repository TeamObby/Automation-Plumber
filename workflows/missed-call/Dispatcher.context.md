# Missed Call — Dispatcher

- **n8n ID:** `WRvTiZWThJTQAU8P` · **URL:** https://n8n.meetobby.com/workflow/WRvTiZWThJTQAU8P
- **Folder:** missed-call · **Status:** Active ✅ (webhook trigger)

## Purpose
Entry point for a **missed / no-answer** call. Figures out which **call pipeline** the
lead's opportunity currently sits in and routes to the matching handler. Analogous to the
Call Disposition Dispatcher but for the "no answer" outcome (no transcript/note involved).

## Trigger
- **Webhook POST** — path `/webhook/call_no_answer`.
- Payload → `contact_id`, `Instantly Lead Id` / `instantly_lead_id`, `email`; `outcome='no answer'`.

## Flow
1. **Webhook (Missed Call)** → **Normalize** — extract `contact_id`, `instantly_lead_id`, `email`.
2. **GHL: Fetch Opps** — `/opportunities/search` by `contact_id` (all opps).
   `onError: continueRegularOutput` — a failed fetch still routes (as `none`).
3. **Route: Determine Call Pipeline** — which CALL pipeline holds an opp (priority
   **rebooking > conversation > cold**); emits `route`, `matched_opp_id`,
   `matched_pipeline_id`, `matched_stage_id`, `anomaly`, + passthrough ids.
4. **Switch: route** → cold / conversation / rebooking (fallback `none`).
   **Filter: anomaly?** (parallel) — surfaces `none`/`multiple` anomalies.
5. Handlers:
   - `cold` → **-> Missed Call Cold Handler** (`MKj1ck6WAwvPZWFz`).
   - `conversation` / `rebooking` → **disabled stubs** (handlers not built yet — set the
     sub-workflow id when built).

## Routing rules (unchanged by the 2026-07-14 edit)
- Matches an opp by `pipelineId` **or** `pipeline_id` (both spellings tolerated).
- `route` = **highest-priority** call pipeline the lead holds an opp in:
  **rebooking > conversation > cold**. Non-call pipelines (e.g. the email pipeline) are ignored.
- `anomaly` = `none` when the lead is in **zero** call pipelines · `multiple` when in **2+**
  (it still routes, by priority) · empty string when exactly one.

## Call pipeline IDs (hardcoded)
- rebooking `smoNRUaagZYOElKFLwtp` > conversation `TwW6o0JdPXUlcwvX0EvI` > cold `9E6y34DlG1Imr8FV42RV`
- Inlined in `Route: Determine Call Pipeline`; matches the Call Disposition Dispatcher's values.

## Credentials / constants
- **GHL:** `httpMultipleHeadersAuth` → `DtotRKnzjDewbSsv` · location `rzaMhqeo2apNI1p6DG5z`

## Sync state
Edited locally on **2026-07-14**; **not pushed** (n8n MCP disconnected). Change vs. live:
- **Removed the `Cached Values` node** (`executeWorkflow` → `GHL Pipeline Stages (Cached)`
  `ny7jwqGX1Du9aXNC`). `Normalize` now feeds `GHL: Fetch Opps` directly, and the three call
  pipeline IDs — previously read from `pipelinesByName` — are inlined in
  `Route: Determine Call Pipeline`. **All routing conditions, the priority order, and the
  anomaly logic are unchanged**; verified identical across 9 opp combinations.

> ⚠️ **Doc drift, now resolved:** this file previously claimed "Cached Values removed 2026-07-07",
> but the node was still present in the JSON. It is genuinely gone as of 2026-07-14.

## TODOs / gotchas
- Only the **cold** route is wired; conversation & rebooking handlers are disabled stubs.
  A `conversation` or `rebooking` lead therefore hits a **disabled node — it is silently dropped.**
- The Route output is what the Cold Handler consumes (`matched_opp_id`/`_pipeline_id`/`_stage_id`).
- ⚠️ **Not yet migrated to the restructured cold-call pipeline** — see
  [`AGENTS.md`](../../AGENTS.md) → Migration impact.

## Related
- Downstream: [`Cold Handler.context.md`](./Cold%20Handler.context.md) (`MKj1ck6WAwvPZWFz`).
- Pipelines/stages: [`AGENTS.md`](../../AGENTS.md).
