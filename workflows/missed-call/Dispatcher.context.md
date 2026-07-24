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
   **rebooking > conversation > cold > gatekeeper**); emits `route`,
   `matched_opp_id`, `matched_pipeline_id`, `matched_stage_id`, `anomaly`, + passthrough ids.
4. **Switch: route** → cold / conversation / rebooking / **gatekeeper** (fallback `none`).
   **Filter: anomaly?** (parallel) — surfaces `none`/`multiple` anomalies.
5. Handlers:
   - `cold` → **-> Missed Call Cold Handler** (`MKj1ck6WAwvPZWFz`).
   - **`gatekeeper` → -> Missed Call Gatekeeper Handler** (`rcrCVXDZp8ix9pKp`).
   - `conversation` / `rebooking` → **disabled stubs** (handlers not built yet — set the
     sub-workflow id when built).

## Routing rules
- Matches an opp by `pipelineId` **or** `pipeline_id` (both spellings tolerated).
- `route` = **highest-priority** call pipeline the lead holds an opp in:
  **rebooking > conversation > cold > gatekeeper**. Non-call pipelines (e.g. the email pipeline) are ignored.
- `anomaly` = `none` when the lead is in **zero** call pipelines · `multiple` when in **2+**
  (it still routes, by priority) · empty string when exactly one.

## Call pipeline IDs (hardcoded)
- rebooking `smoNRUaagZYOElKFLwtp` > conversation `TwW6o0JdPXUlcwvX0EvI` > cold `9E6y34DlG1Imr8FV42RV` > gatekeeper `3onA8GkJnSwgzIGTGSpI`
- Inlined in `Route: Determine Call Pipeline`; matches the Call Disposition Dispatcher's values.

## Credentials / constants
- **GHL:** `httpMultipleHeadersAuth` → `DtotRKnzjDewbSsv` · location `rzaMhqeo2apNI1p6DG5z`

## TODOs / gotchas
- **Conversation** & **rebooking** handlers are disabled stubs. A `conversation` or `rebooking`
  lead therefore hits a **disabled node — it is silently dropped.**
- The Route output is what the Cold Handler consumes (`matched_opp_id`/`_pipeline_id`/`_stage_id`).

## Related
- Downstream: [`Cold Handler.context.md`](./Cold%20Handler.context.md) (`MKj1ck6WAwvPZWFz`).
- Pipelines/stages: [`AGENTS.md`](../../AGENTS.md).
