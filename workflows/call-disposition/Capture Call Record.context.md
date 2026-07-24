# Capture Call Record  [Automation 1]

- **n8n ID:** _pending import_ · **URL:** — · **Status:** Inactive ❌ (webhook) — **not yet pushed**
- **Folder:** call-disposition · **Role:** Automation 1 of the multi-update call-disposition rebuild.

This workflow is the
**capture** half: it runs **once per call** (call-recorded), snapshots the caller context while the
opp is still in the call pipeline, stores it, and arranges the fallback. It does **not** move the
opp, run the classify AI, or clear any fields — that is Automation 2's job.

## Trigger
**Webhook (Call Recorded)** — path `/webhook/call-recorded-capture`. ⚠️ **Repoint the GHL "Call
Recorded" trigger here** (it currently hits the old `Dispatcher`).

## Flow
1. **Normalize Call** → **Filter: call was picked up** → **IF: transcript missing?**
   - true → **Download Recording (MP3)** → **Transcribe (Whisper)** → **Set Transcript (from audio)** → **Transcript Ready**
   - false → **Transcript Ready**
2. **GHL: Fetch Opps** (search by contact) → **Determine Caller Context** (code) — the brain:
   picks the call pipeline (rebooking > conversation > cold > **gatekeeper**),
   derives `caller_N` (the day) and `stage_name` (the map covers both the 15 cold **and** 13
   gatekeeper stages), captures `opp_id`/`stage_id`, and computes `anomaly`. `route` is `cold` or
   **`gatekeeper`** → the Dispatcher sends each to its matching handler.
3. **IF: anomaly?** — the gate:
   - **anomaly non-empty** (`'none'` = no call opp, or `'multiple'` = 2+ call pipelines) →
     **Anomaly (capture for later)** stub, and **stop** — nothing is stored, no fallback fires.
   - **anomaly empty** (clean single call-pipeline match) → **GHL: Store Context** and continue.
4. **GHL: Store Context** (PUT contact) — writes, **once** (only on the clean path):
   - **Call Router Context** `HW0eBfoQPW2mwxX8aY7Q` = `{opp_id, route, caller_N, call_id, stage_name, stage_id}`
     (`stage_id` — the Cold Handler's voicemail branch keys its missed-call-email
     `mc` off the raw stage id, so it must be captured here while the opp is still in the call pipeline)
   - **Last Call Transcript** `2j4uCLLeAbtj8sDTS84o` = transcript
   - **Call Processing State** `BD9TmgEynOEy6bCvZshm` = `{processed:false, last_event_log_entry:"", last_call_summary_entry:"", last_signature:""}` ← **reset**
4b. **Call Transcripts archive** (side branch off **Determine Caller Context**, **before** the
   anomaly gate — runs for **every** call, non-blocking, additive): **GHL: Get Contact (for transcripts)** → **Build Call Transcripts** →
   **Gate: append transcript?** → **GHL: Append Call Transcripts**. Reads the contact's current
   **Call Transcripts** `RoCuJYeWhST2NJG4p0US`, appends `[<stamp> <stage_name>] <transcript>` on a
   **new line**, and writes it back. **Skips (no write)** when the transcript is empty or the read
   failed — so it **never clobbers** the accumulated history. Purely additive: **Last Call
   Transcript** and everything downstream are unchanged.
5. **Wait 5m (fallback grace)** → **GHL: Get Contact (re-read State)** → **Check Processed** →
   **IF: not processed?**
   - true (still `processed:false`) → **-> Automation 2 (fallback)** — Automation 1 owns this
     decision; fires only if nobody dispositioned in the grace window.
   - false → **Done (already processed)**.

## Anomaly handling — blocking gate (lives here, not in the Router)
`Determine Caller Context` computes `anomaly`: `''` (one call pipeline, normal) · `'none'` (no call
opp) · `'multiple'` (2+ call pipelines). **IF: anomaly?** then gates the whole flow:
- **anomaly non-empty** (`'none'` **or** `'multiple'`) → **Anomaly (capture for later)** stub, and
  the flow **stops**: no context stored, no grace-wait, no fallback. A placeholder to expand later
  (alert / manual-review); `$json.anomaly` distinguishes the two cases.
- **anomaly empty** (clean single call-pipeline match) → **GHL: Store Context** → … the normal path.

Rationale: a lead in **0 or 2+ call pipelines** can't be safely attributed to one caller stage, so
we **don't** want to store a guessed context or fire the fallback for it — better to hold it for
review. `anomaly` is used only here; it is **not** written to Call Router Context, and the Router
has no anomaly logic (it never sees these leads).

## Key points
- **Captures context while the opp is still in the call pipeline** — `caller_N`, `stage_name`, and
  `opp_id` cannot be recomputed once the first disposition moves the opp out. That's the whole
  reason for the split.
- **`route='none'` / no call opp** → `anomaly='none'` → **blocked at the gate** (captured for
  later, **not** stored). Same for a lead in 2+ call pipelines (`'multiple'`). Only a clean single
  call-pipeline match proceeds.
- **No polling, no field-clear, no wavv-tags.**

## ⚠️ Before this runs
- **`-> Automation 2 (fallback)` targets the Dispatcher** (`SfI5Hx6mlc4Qh3D1`, Automation 2). It
  passes `{contact_id, call_id, fallback:true}` (passed through) so Auto 2 classifies AI-only.
- Whisper node uses OpenAI cred `B4xA6dDfoOhHJMOo`; GHL calls use `DtotRKnzjDewbSsv`.

## Not built yet
- The GHL "field changed → webhook" automation for Automation 2's trigger.

## Related
- Custom fields, pipelines/stages: [`AGENTS.md`](../../AGENTS.md).
- Custom fields, pipelines, `STAGE_TO_N`: [`AGENTS.md`](../../AGENTS.md).
