# automation-plumber — Agent Guide (master context)

> Read this first. It's the map for any AI (or human) working in this repo.
> It records **which n8n instance**, **which workflows**, and **how to edit them**.

## What this repo is
Local mirror + documentation for the n8n automations in the **Call Campaign - Plumbers**
folder — the outbound campaign selling an AI receptionist ("**WaterLine**") to US
plumbing companies. Each workflow is stored as a JSON snapshot plus a `context.md`
that captures intent/why/gotchas the code alone can't.

## n8n environment
- **Instance:** https://n8n.meetobby.com
- **Project:** `Obby LLC <team@meetobby.com>` — id `GyTFr8xmUVNQbsod` (personal)
- **Target folder:** Products → **Call Campaign - Plumbers** — id `gUcE8vB9KWuBkKSP`
  (subfolders exist in n8n but are ignored here — the flat Registry below is the map)

## How Claude works here (important)
- The **n8n MCP is the live link** — it's configured at the Claude connector level, NOT
  in any single chat, so it stays connected across sessions. Nothing about the "link"
  is stored in this repo; this repo stores **which workflows to point it at**.
- To re-orient in a fresh chat: read this file → open the relevant `context.md` → use the
  **workflow ID** with the MCP (`get_workflow_details`, `update_workflow`, …).
- **Editing live workflows is real.** Validate first; confirm destructive/outward-facing
  changes before pushing. After any change, re-pull the JSON + update the `context.md`.
- Conventions: `*.json` = faithful n8n snapshot (source of truth for structure);
  `*.context.md` = intent/gotchas; secrets are **redacted** in local `.json`.

## How to add a workflow (the simple flow)
1. User drops an n8n workflow URL (e.g. `https://n8n.meetobby.com/workflow/<ID>`).
2. Claude extracts `<ID>`, pulls it via the n8n MCP (`get_workflow_details`).
3. Claude saves `workflow.json` + `context.md` under `workflows/<slug>/`.
4. Claude adds a row to the **Registry** below (Name · ID · URL · Local).

## Registry
Every workflow we track. The URL/ID is the pointer any future chat uses to pull or edit
it via the MCP. (Subfolders in n8n are ignored on purpose — this flat list is the map.)

| Workflow | ID | URL | Active | Local |
|---|---|---|---|---|
| Call Disposition - Capture Call Record (Automation 1) | _pending import_ | — | 🆕 built, not imported | ✓ [json+ctx](workflows/call-disposition/) |
| Call Disposition - Capture Wavv Disposition | `zSOjEBiz3e7gbeBp` | [open](https://n8n.meetobby.com/workflow/zSOjEBiz3e7gbeBp) | ✅ | ✓ [json+ctx](workflows/call-disposition/) — WAVV note → Call Disposition/Notes fields |
| Call Disposition - Dispatcher/Router (Automation 2) | `SfI5Hx6mlc4Qh3D1` | [open](https://n8n.meetobby.com/workflow/SfI5Hx6mlc4Qh3D1) | ❌ | ✓ [json+ctx](workflows/call-disposition/) — repurposed for disposition/note updates; not yet pushed |
| Call Disposition - Cold Handler (Automation 3) | `toFDNpFhy0ZyxfxN` | [open](https://n8n.meetobby.com/workflow/toFDNpFhy0ZyxfxN) | ✅ | ✓ [json+ctx](workflows/call-disposition/) — rebuild + gatekeeper tag; not yet pushed |
| Call Disposition - Gatekeeper Handler (Automation 3, gk twin) | `WhSS3Awo5K8XuRbQ` | [open](https://n8n.meetobby.com/workflow/WhSS3Awo5K8XuRbQ) | ✅ | ✓ [json+ctx](workflows/call-disposition/) — copy of Cold Handler, gatekeeper `MCE_BY_STAGE` |
| GHL Pipeline Stages (Cached) | `ny7jwqGX1Du9aXNC` | [open](https://n8n.meetobby.com/workflow/ny7jwqGX1Du9aXNC) | ✅ | ⏳ not pulled — **no longer called by any mirrored workflow** (see below) |
| Resume On Hold Leads | _pending import_ | — | 🆕 built, not imported | ✓ [json+ctx](workflows/scheduled-automations/) |
| New to Cold Email 1 Stage (3AM) | `WYYQ7p3wJ3QhBTrQ` | [open](https://n8n.meetobby.com/workflow/WYYQ7p3wJ3QhBTrQ) | ❌ | ✓ [json+ctx](workflows/scheduled-automations/) |
| Send Cold Email 2/3/4 (4AM) | `0iXr4fHGqptYGJpg` | [open](https://n8n.meetobby.com/workflow/0iXr4fHGqptYGJpg) | ✅ | ✓ [json+ctx](workflows/scheduled-automations/) |
| Sent Cold Email to Caller Stages (4:30AM) | `IIyYJxvDyeCmYdur` | [open](https://n8n.meetobby.com/workflow/IIyYJxvDyeCmYdur) | ✅ | ✓ [json+ctx](workflows/scheduled-automations/) |
| Personalize Call Context (SUB) | `T4Mz1k2fYwCwzp7D` | [open](https://n8n.meetobby.com/workflow/T4Mz1k2fYwCwzp7D) | — (sub-workflow) | ⏳ not pulled |
| Email Sent → Move To Sent Stage | `CDdLps7wfOjyM9Lx` | [open](https://n8n.meetobby.com/workflow/CDdLps7wfOjyM9Lx) | ✅ (webhook) | ✓ [json+ctx](workflows/email-sent/) — local edits **not yet pushed** |
| Create Manual Review Opp | _pending import_ | — | 🆕 built, not imported | ✓ [json+ctx](workflows/manual-review/) |
| Missed Call - Dispatcher | `WRvTiZWThJTQAU8P` | [open](https://n8n.meetobby.com/workflow/WRvTiZWThJTQAU8P) | ✅ | ✓ [json+ctx](workflows/missed-call/) |
| Missed Call - Cold Handler | `MKj1ck6WAwvPZWFz` | [open](https://n8n.meetobby.com/workflow/MKj1ck6WAwvPZWFz) | ✅ | ✓ [json+ctx](workflows/missed-call/) |
| Missed Call - Gatekeeper Handler (gk twin) | `rcrCVXDZp8ix9pKp` | [open](https://n8n.meetobby.com/workflow/rcrCVXDZp8ix9pKp) | ✅ | ✓ [json+ctx](workflows/missed-call/) — copy of Cold Handler, gatekeeper `CALL_PIPELINE` + maps |
| Send Cold Email 1 (3:30AM) | `6wdNiXnexS3zT5b2` | [open](https://n8n.meetobby.com/workflow/6wdNiXnexS3zT5b2) | ❌ | ✓ [json+ctx](workflows/scheduled-automations/) |

---

## Shared references (GHL / GoHighLevel)
- **location_id:** `rzaMhqeo2apNI1p6DG5z`
- **Call pipelines** (dispatcher routing, priority order):
  rebooking `smoNRUaagZYOElKFLwtp` > conversation `TwW6o0JdPXUlcwvX0EvI` > cold `9E6y34DlG1Imr8FV42RV`
  > **gatekeeper** `3onA8GkJnSwgzIGTGSpI` _(gatekeeper runs like cold, its own call pipeline; lane chosen by the `gatekeeper` tag — see pipeline table)_
- **Email pipeline:** `1A1RkYaL93s2rqbQ3Opi`
- **Contact custom fields:** Event Logs `7D9N71mEDfipN90zfV0j` · Call Summary `ZVeEoK85i5EOhWt1HO1F` ·
  Interaction Summary `AH3JqyYEPzPX4wXKoX1V` · Instantly Lead ID `TWLomDBX0XInU1IKrG8L` ·
  Email History `TcdjZt3fwFSZTgY6ngeE` · Resume Call At `u5VC5C59UlFZJDYOuw7N` (text) ·
  Next Caller Stage `Tj0yopYbErXbwsTYTsCX` (text — where to resume a held lead, e.g. `cold_call_2`, `day_1_attempt_1`) ·
  Manual Review Items `tYhhupx5TalZqdNsiwCs` (text — caller notes needing manual intervention; non-empty → create a Manual Review opp) ·
  Email Step Name `WtFfl1nEbMupk2oR4m9e` (text — last email step, e.g. `cold email 2`, `missed call email 1`) ·
  Call Disposition `YxGIrvPl5tfLeYoc7Ldr` (text — the caller's disposition, e.g. "Cold On Hold" → `cold-on-hold`.
  In the rebuild it is the **primary input and the trigger** for Call-Disposition Automation 2; **no longer cleared** — dedup via `last_signature`) ·
  Call Notes `kVU8T6Swsh9sF4TWC81U` (text — the caller's note; also triggers Automation 2; **no longer cleared**) ·
  Google Stars `E7XjZUePJBrJ99LnCD6e` (text — Google rating; read-only, passed to Instantly as a merge tag) ·
  Google Reviews `kDel5db3cRFrNjqOwdNp` (text — Google review count; read-only, passed to Instantly as a merge tag) ·
  **Missed Call Review** `u9UymBEMP3f7IZqDTwVd` (text — **non-empty ⇒ the lead is an `MGR` lead**; see below) ·
  Call Context `sLGmbbrcmzdlGONFYDSC` (text — per-call personalized context, written by `Personalize Call Context (SUB)`) ·
  Note `4Ysr9E6CKC2vZK9m6MNm` (text — append-only activity note, e.g. `[… | EMAIL_SENT] Cold Email`.
  **Only `Email Sent → Move To Sent Stage` writes it.**) ·
  **Call Router Context** `HW0eBfoQPW2mwxX8aY7Q` (JSON, write-once per call by Call-Disposition Automation 1 — `{opp_id, route, caller_N, call_id, stage_name, stage_id, call_duration, call_recording_url}`; `stage_id` is the raw caller-stage id the Cold Handler's voicemail branch needs for its missed-call-email `mc` lookup. `call_duration`/`call_recording_url` are **metrics passengers** — nothing routes on them; they live here because the call-recorded webhook is the only place they ever appear, and the handlers need them for the `call_log` row) ·
  **Call Processing State** `BD9TmgEynOEy6bCvZshm` (JSON — `{processed, last_event_log_entry, last_call_summary_entry, last_signature}`; Auto 1 resets, Auto 2 updates each run) ·
  **Last Call Transcript** `2j4uCLLeAbtj8sDTS84o` (multiline text — Whisper transcript, static input the disposition AI re-reads per update) ·
  **Call Transcripts** `RoCuJYeWhST2NJG4p0US` (multiline text — **all** call transcripts accumulated, one per line `[<stamp> <caller stage name>] <transcript>`; appended once per call by **Capture Call Record**, additive alongside Last Call Transcript. Not read by any automation — an archive.) ·
  **Stop Phone Calls** `KFDw66sjfFaszQx5UX6X` (**radio**, options `True`/`False` — the Cold/Gatekeeper Handler **always writes it**: `True` on a `cold-bad` **or `gatekeeper-bad`** outcome to halt future calls, `False` otherwise.) ·
  **Stop Emails** `ixRO9dSUHVd6vNTdFa7Q` (**radio**, `True`/`False` — `True` ⇒ **no email is sent**: the scheduled senders (`Send Cold Email 1`, `Send Cold Email 2/3/4`) and both Cold Handlers move the opp **straight to `Cold Email N Sent`** instead of enrolling in Instantly, and the missed-call/voicemail email is skipped. Keyed on this field **alone** — every no-email lead **must** carry `Stop Emails=True`, or it stalls in `Cold Email N` before the first call.)
- **`MGR` = "Missed call Google Review".** A lead is MGR **iff the `Missed Call Review` custom
  field (`u9UymBEMP3f7IZqDTwVd`) is non-empty.** It is an **axis independent of "missed call"** —
  the cold-call pipeline has both `(MGR)` and `MGR (missed call)` stage variants, so a lead can
  be MGR *and* have a missed last call. Do not conflate the two.
- **`last_call_missed`** — contact **tag** (not a custom field). **Added & removed by GHL-side
  automations** (set when a call goes unanswered, cleared when appropriate). Read by
  `Sent Cold Email to Caller Stages` to pick the `(missed call)` stage variants. Also **added by
  the call-disposition Cold Handler on a `voicemail` outcome** (voicemail = treated like a missed
  call); GHL still owns clearing it.
- **Retired — do not reintroduce:** `lifecycle_status` · `JuNrjuwlZXMkJZ9R7qsi` (was `cold call N`) ·
  **`lifecycle` `9T7lODjinSThOnAzAI0G`** (routing now derives from `email_step_name`). None are
  referenced by any mirrored workflow — safe to delete in GHL once unmirrored automations are clear.
- **`email_step_name` is the routing key for the email path.** Senders stamp it
  (`cold email 1`..`4`); `Email Sent → Move To Sent Stage` reads it to pick the target
  `Cold Email N Sent` stage. Values outside `^cold email (\d+)$` (e.g. `missed call email N`)
  log normally but trigger **no** cold-stage move.
- **Credentials in use:** GHL `httpMultipleHeadersAuth` → `DtotRKnzjDewbSsv`
  ("GHL [ Waterline Growth subaccount ]") · OpenAI `openAiApi` → `B4xA6dDfoOhHJMOo`

## Metrics workbook (Google Sheets)
Reporting layer, fed by the handlers. Setup script: [`metrics/metrics-sheet-setup.gs`](metrics/metrics-sheet-setup.gs)
(builds `call_log`, `email_log`, and a 100%-formula `daily` tab).
- **Spreadsheet:** "Plumber Campaign Metrics" `1RuupHeSo8-oUKzl1QjVzLYoGXj6Br-d-1tTJsuDTM3g` ·
  `call_log` gid `412127457` · `email_log` gid **unknown** (re-select the tab in that one node).
- **Credential:** `googleSheetsOAuth2Api` → `nVa0UTFYjGo1apqU` ("Google Sheets account [ team@meetobby.com ]")
- **Who writes what** (each a single `n8n-nodes-base.googleSheets` v4.7 node, `cellFormat: USER_ENTERED`,
  `onError: continueRegularOutput`, hung off the terminal so a Sheets hiccup never breaks processing):
  | Workflow | Sheet | Op | Node |
  |---|---|---|---|
  | Call-Disposition Cold Handler | `call_log` | **appendOrUpdate** on `call_id` | `Sheet: Log Call` (off `GHL: Write Logs`) |
  | Call-Disposition Gatekeeper Handler | `call_log` | appendOrUpdate on `call_id` | `Sheet: Log Call` |
  | Missed-Call Cold Handler | `call_log` | append | `Sheet: Log Call` (off `GHL: Write Logs`) |
  | Missed-Call Gatekeeper Handler | `call_log` | append | `Sheet: Log Call` |
  | Email Sent → Move To Sent Stage | `email_log` | append | `Sheet: Log Email` (off `GHL: Write Logs + Lead ID`) |
- **`call_id` is the dedup key** for dispositioned calls (the handler re-runs on every disposition/note
  edit — appendOrUpdate keeps one row per dial and reflects the latest outcome). Row fields are emitted
  by the existing brain code node (`Parse + Map Outcome` / `Build Logs` / `Build Logs + Route`).
- **`duration_sec` / `recording_url` / `call_transcript`** are fed by the **disposition** handlers only.
  They exist just once, on the call-recorded webhook, so **Capture Call Record** stows duration +
  recording URL in **Call Router Context** and the transcript in **Last Call Transcript**; the
  Dispatcher's `Prep + Gate` puts all three on the handler contract. Missed-call handlers leave them
  blank (`call_transcript` isn't even mapped there — no pickup, no transcript). `duration_sec` is what
  makes `avg_call_duration_sec` on `daily` non-empty, so it must stay a bare number-as-text.
  ⚠️ `call_transcript` is free text into a `USER_ENTERED` cell: `Parse + Map Outcome`'s `sheetSafe()`
  prefixes `'` when it starts with `=`/`+`/`@`/`-` and truncates at 45k (50k cell cap). **Keep that
  guard on any new free-text column.**
- **Not yet fed:** `from_number` (GHL never sends it), and email engagement events
  (`opened`/`bounced`/`replied` → those `daily` columns stay 0 until a separate Instantly-events
  webhook workflow appends them to `email_log`).
- **Test:** [`tests/metrics-logging.test.js`](tests/metrics-logging.test.js) — runs the brain code nodes
  out of the workflow JSON, reconstructs the exact row each Sheets node writes, and asserts the `.gs`
  contract (incl. 3 scrubbed real-execution fixtures). Run `node tests/metrics-logging.test.js` after any edit.

## Instantly (reference)
Campaign + subsequence IDs for the cold email sequence. Inline these directly in
workflows — do **not** fetch them via the `GHL Pipeline Stages (Cached)` sub-workflow.

- **Campaign (Cold Email 1) — one per timezone.** The lead is **created** in the campaign matching
  its **TZ** custom field (`Q8NyGdyiYyeaakqmPjNT`, values `PT`/`CT`/`AKST`/`HST`). Only `Send Cold
  Email 1` picks the campaign (the lead-create point); every later step (Cold Email 2/3/4, missed-call
  emails) keys off the existing lead by **email/lead_id**, so no campaign id is needed there. All four
  campaigns share the **same subsequences + interest-value mapping**. Empty/unknown TZ ⇒ **default PT**.
  | TZ | State | Campaign ID |
  |---|---|---|
  | `PT` (default) | California | `995a75d0-4325-4b19-aefe-e69c9a4a86d2` |
  | `CT` | Texas | `c2d3708e-de7f-4b06-81d5-db065e174b66` |
  | `AKST` | Alaska | `4905a02f-791b-4dde-baa2-a2eb52a30472` |
  | `HST` | Hawaii | `ac7941aa-a3c7-4849-8140-222b55d94cb2` |
- **Test campaign:** `b1f723b8-5cc4-45ab-be45-b8f9f39d7cb5` — _not used; listed for completeness_

| Subsequence | ID |
|---|---|
| Cold Email 2 | `0afb59d9-caf1-4d55-a699-d5b39957fec5` |
| Cold Email 3 | `b6ac14a0-5179-45d2-b16d-6e2652295af7` |
| Cold Email 4 | `39ae2a07-9dc5-49dc-af16-4cffc1068f5a` |
| Missed Call Email 1 | `f411eea1-eee6-4012-b5a8-0b93b11484a1` |
| Missed Call Email 2 | `cb3efb1f-75d2-4658-9d78-a9d26dd3ea36` |

## GHL Pipelines & Stages (reference)
Full pipeline + stage IDs for the WaterLine plumbers campaign. Used across workflows for
opportunity moves. (The 2 `[TEST]` pipelines are intentionally omitted.)

### Client Acquisition – Plumbing Shops — `O7LMZpDOFM2SYO65twC5`
_All non-cold call outcomes land here (see Cold Handler `STAGE_SLUG`)._
| Stage | ID |
|---|---|
| New | `f6aa7e0f-6b83-4a7b-b8b9-620753554b3a` |
| Got New Email | `1eba8b0e-955b-4693-8e59-6e59197f5b84` |
| Replied To New Email | `d4803845-4722-49b3-8ea1-0fe3f66f39c0` |
| Gatekeeper Bad | `d5670151-b316-448b-8b13-c4f804fdd696` |
| Gatekeeper On Hold | `e921913e-1530-4186-8ce8-bb3dab47d301` |
| Call Center | `04546ed9-e0d9-47dc-b61e-c0cd820849d7` |
| Cold Bad | `8ecc2327-779f-4250-8d54-4554b49087f9` |
| Cold On Hold | `54994e3f-1643-46f4-8eeb-ade43712ae2d` |
| Conversation Active | `edca2ee6-569d-4486-9ecd-4110e9c32882` |
| Conversation Active On Hold | `175c5765-fd68-48d5-a319-8bcc77487703` |
| Appointment Booked | `5344bfb7-9370-401e-8767-32bbdcc73778` |
| Appointment In 1 Day | `c80eabc7-94d3-480c-8d64-84367643e002` |
| Today's Appointment | `781c84e2-4a76-4ea1-a0ee-70a9fc91c6c5` |
| Gift Sent | `37aeed26-acbb-4716-afaa-e6e7311295ef` |
| Rebooking | `0d256c7c-0f59-476f-b23e-8f4fcf02d8de` |
| Rebooking - On Hold | `02a09f5c-5578-4d1c-8764-6f478efabc43` |
| Sales Call | `64251edf-6f9f-4b3e-b36b-3059814c2787` |
| Paid Start | `f0d42d46-a9c8-4a82-b3dc-cdfa95d708ab` |
| Closed Lost | `8d4d078a-bbaf-4708-ba50-c66f9775348f` |
| Not Interested Right Now Good | `8c76b904-fa25-4a73-9ac2-e17fb8323e2b` |
| Not Interested Right Now Bad | `865a3d8d-045d-4b5d-b421-4115b876bb25` |
| Do Not Contact | `cfc46631-06a5-4ef3-9788-1f15f35f052b` |
| Bad Number | `298c5fad-72da-4628-b254-0c4df89c72e1` |
| Not A Fit | `1d34796e-811a-4bb3-afcb-61b59446a31e` |

### Cold Outbound Email Pipeline — `1A1RkYaL93s2rqbQ3Opi`
_Cold call outcomes move here to "Cold Email N+1" via Cold Handler `SEND_NEXT`._
| Stage | ID |
|---|---|
| Cold Email 1 | `f9bcbefb-aa83-44d4-ad8b-59a758993045` |
| Cold Email 1 Sent | `41849471-6f42-4f40-9692-bbd4d3713d17` |
| Cold Email 2 | `e4b13f51-2229-4d47-aa3e-12381a31a8c1` |
| Cold Email 2 Sent | `fdd4f9a4-a626-4866-a904-5053e626306f` |
| Cold Email 3 | `342b193f-9456-4bcc-a2a7-cb81973500c9` |
| Cold Email 3 Sent | `2f599547-4a2b-4ba4-850d-0feb7fcc976c` |
| Cold Email 4 | `f3ea4cd2-daf2-4ca2-baaa-301f807d697c` |
| Cold Email 4 Sent | `39a20e88-ce88-46c6-9e95-8134aa9f269d` |

### Cold Outbound Call Pipeline — `9E6y34DlG1Imr8FV42RV`
_Dispatcher route `cold`. 15 stages._

**Stage axes:**
- **`(MGR)`** = *Missed call Google Review* lead → `Missed Call Review` field `u9UymBEMP3f7IZqDTwVd`
  is non-empty.
- **`(missed call)`** = the lead's **last call went unanswered** → contact tag `last_call_missed`.
- These are **independent** — hence the `MGR (missed call)` variants (MGR lead *and* last call missed).
- **`(from on hold)`** = resumed from an on-hold state (targeted by `Resume On Hold Leads`).

`MGR` is a **separate axis from `missed call`** — a lead can be both. Do not conflate them.

| Stage | ID |
|---|---|
| Day 1 Call A | `060f44a8-4cd8-4561-8c84-7150bfd57498` |
| Day 1 Call A (MGR) | `04ccf8e0-383f-4c17-9268-51020233d08b` |
| Day 1 Call A (from on hold) | `cb2dc70f-c44e-48fd-b9cc-438901e292ac` |
| Day 1 Call B | `4cb90aaa-b8c3-40a8-b1e6-6585213b258c` |
| Day 1 Call B (MGR) | `648c4952-1ac0-4c8c-9e52-b93efa5ec39e` |
| Day 2 Call | `4b1d7a88-87c0-422b-90e4-b48d16430900` |
| Day 2 Call (MGR) | `4b3023aa-515b-40f8-ad82-292ca685562e` |
| Day 2 Call (from on hold) | `ab6ae288-8886-4d4e-ba61-2d6134f585bd` |
| Day 2 Call (missed call) | `40bdc040-8e97-4654-ae52-51e458c7f882` |
| Day 2 Call MGR (missed call) | `59069dd4-8071-45e2-820c-df565ab17132` |
| Day 3 Call | `f8407fb8-f94c-4443-baf9-b7d1c6f50d34` |
| Day 3 Call (MGR) | `5bfcb041-6abb-48d2-a60d-511af1af807f` |
| Day 3 Call (from on hold) | `1bd6fb3c-b7bb-40bd-af31-f1c62065c7bb` |
| Day 3 Call (missed call) | `b50e0792-a88c-4d0a-9e44-2d5cebfdef18` |
| Day 3 Call MGR (missed call) | `21b772e5-385d-47b7-8234-3138bd312a26` |

### Gatekeeper Outbound Call Pipeline — `3onA8GkJnSwgzIGTGSpI`
_**The gatekeeper lane runs exactly like cold** (shared email pipeline; a parallel call pipeline).
Which lane a lead is in is decided by the **`gatekeeper` contact tag**._

**Tag rules (set on every call-disposition process, Option A):**
- **any `gatekeeper-*` disposition** (good/bad/on-hold) → **add** `gatekeeper` tag
- **any `cold-*` disposition** (good/bad/on-hold) → **remove** `gatekeeper` tag
- **anything else** (voicemail, Client-Acq dispositions) → **leave the tag untouched**

The tag is what the **4:30AM `Sent Cold Email to Caller Stages`** reads to move a lead into the cold
**or** gatekeeper Day-N stage (same stage *name*, pipeline chosen by tag). So a lead flips cold↔
gatekeeper freely across calls; the tag just reflects the last cold/gatekeeper disposition.
`gatekeeper-good` **continues the drip** (like cold-good → Cold Email N+1); `gatekeeper-bad` →
Client Acq + **Stop Phone Calls=True**; `gatekeeper-on-hold` → Client Acq (resumed later by tag).

**Runtime split:** the **Cold Handler** processes leads in the cold pipeline; a **separate
`Gatekeeper Handler`** (a copy differing only in the voicemail `MCE_BY_STAGE`) processes leads in the
gatekeeper pipeline. `Capture` detects the pipeline (`route='cold'|'gatekeeper'`); the Dispatcher
routes to the matching handler. The missed-call side has the same cold/gatekeeper split.

Mirrors the **Cold Outbound Call Pipeline** day/attempt structure — same `(MGR)` / `(missed call)` /
`(from on hold)` axes — **but only 13 stages, not 15**: it has **no plain `Day 1 Call A` or
`Day 1 Call A (MGR)`**; the pipeline begins at `Day 1 Call A (from on hold)`, then `Day 1 Call B`.
(All 13 IDs are brand-new — no ID is shared with the cold pipeline. A lead is only gatekeeper *after*
a prior disposition, so it never needs a fresh Day-1-A in this lane.)

| Stage | ID |
|---|---|
| Day 1 Call A (from on hold) | `b9ce3091-acad-4067-abb5-49dc19ec4314` |
| Day 1 Call B | `09efdb09-af96-40b9-a96c-8a80c333e6ab` |
| Day 1 Call B (MGR) | `d31cf0e2-ed61-4f0b-815b-ef3ee8e6e474` |
| Day 2 Call | `042d9b81-1cb4-4265-a3c0-086b7d9d149d` |
| Day 2 Call (MGR) | `cee93f24-aedb-45d1-a613-0bd4d3d326d7` |
| Day 2 Call (from on hold) | `efda07de-f15a-48c1-b0dd-a84ad1f52899` |
| Day 2 Call (missed call) | `a1d2058e-6fcf-4be5-8046-85fd1aff1fbc` |
| Day 2 Call MGR (missed call) | `b7a81325-f410-4fa4-b5c7-a65fe6e3b284` |
| Day 3 Call | `0f9041ab-677d-4320-a10d-3f24900b586a` |
| Day 3 Call (MGR) | `54df4784-5d51-4924-965f-ca4a59b3535f` |
| Day 3 Call (from on hold) | `29d698ed-b6ab-45c2-884a-fa011cfa60fe` |
| Day 3 Call (missed call) | `27b684ee-1cdd-44b4-b38b-f789c77d6514` |
| Day 3 Call MGR (missed call) | `23b44136-bc3e-4302-a6bd-23bc566d76e0` |

### `STAGE_TO_N` — `N` = the day
The Cold/Gatekeeper Handlers, the call Dispatcher, and Capture map each caller stage → `N` = **the
day** (Day 1 → 1, Day 2 → 2, Day 3 → 3). `N` feeds `SEND_NEXT` (→ Cold Email N+1) and the on-hold
resume label `cold_call_N`, which `Resume On Hold Leads` resolves to the matching
**`(from on hold)`** stage (cold or gatekeeper by the `gatekeeper` tag).

### Missed-call semantics
A missed call has **two independent outcomes** — they used to be fused into one `N`:
1. **Where the opp goes.** A missed **Day 1 Call A** *stays in the call pipeline* and re-dials as
   **Day 1 Call B** (same-day second attempt). Every other stage hands off to the **email**
   pipeline at `Send Cold Email N+1`.
2. **Which missed-call email fires.** **MCE1** (`-29996`) = first miss of Day 1 or Day 2.
   **MCE2** (`-29992`) = second miss of Day 2. **Day 1 Call B and all of Day 3 send none.**

So a missed Day 1 Call A both redials **and** emails; a missed Day 1 Call B hands off **without**
emailing. Full tables in
[`missed-call/Cold Handler.context.md`](workflows/missed-call/Cold%20Handler.context.md).

### Active Conversation Call Pipeline — `TwW6o0JdPXUlcwvX0EvI`
_Dispatcher route `conversation`._
| Stage | ID |
|---|---|
| Day 1 - 1st Attempt | `74c3e036-2d2f-4138-8806-b337973ccad5` |
| Day 1 - 2nd Attempt | `6a45d8cf-58ca-4507-a233-dcd0edcf9832` |
| Day 2 - 1st Attempt | `12f34302-d85d-4a8e-84e8-65388385baee` |
| Day 2- 2nd Attempt | `007c0fbd-5596-4c92-baa0-56b0266bcf43` |
| Day 3- 1st Attempt | `354be9c0-e9b2-4afb-9225-696e5b8bae03` |
| Day 3- 2nd Attempt | `75227184-15cf-48ae-bf24-389048af762f` |
| Day 4 Attempt | `3bb24146-c959-408a-bdc3-4c36249d5697` |
| Day 5 Attempt | `5a0de618-2186-49cb-8bbd-d643d40ad4ef` |
| Day 6 Attempt | `6cd5b25d-d0e3-4cfd-8080-453086d5098f` |
| Day 7 Attempt | `1c1070f6-04ef-4e97-8ac6-e10ac6f52040` |

### Rebooking Call — `smoNRUaagZYOElKFLwtp`
_Dispatcher route `rebooking` (highest priority)._
| Stage | ID |
|---|---|
| Day 1 - 1st Attempt | `34c0df53-8c91-4433-b16e-bb493dbae5c1` |
| Day 1 - 2nd Attempt | `6bfbf4b2-fecc-4e9a-b27c-fba25b396200` |
| Day 2 - 1st Attempt | `fbe84162-daba-4f24-9208-1455b4f1bd9c` |
| Day 2- 2nd Attempt | `6981a559-3f9a-4950-9922-3e429f76c89b` |
| Day 3- 1st Attempt | `76a15d86-e271-407a-853b-3e0f531db558` |
| Day 3- 2nd Attempt | `024f898e-2e63-412a-80c6-17ea1411ee04` |
| Day 4 Attempt | `573dc301-91f7-48af-81d8-0188ea397be7` |
| Day 5 Attempt | `0a6b1536-8180-44c8-91f1-e8856cef7563` |
| Day 6 Attempt | `653e5f6f-5422-4047-875a-348ad3523e6c` |
| Day 7 Attempt | `8b40c26f-9f0f-4f36-b277-ad1541b4217f` |

### Manual Review Needed — `OOu5TjgalfGZElEIoSbq`
_Caller flags a lead (Manual Review Items field non-empty) → one opp created here for a human to action._
| Stage | ID |
|---|---|
| Pending Review | `d800d3ec-5263-42e7-b383-f66e5e187bed` |
| Review Done | `a19eaf0b-7ea1-4b4f-8469-c8b13d828d8a` |

## Cold email path (how a lead flows)
| When | Workflow | Does | Active |
|---|---|---|---|
| 3:00 AM | **New to Cold Email 1 Stage** | `New` (Client Acq.) → `Cold Email 1` stage | ❌ |
| 3:30 AM | **Send Cold Email 1** | `Cold Email 1` → Instantly **campaign** (lead create) | ❌ |
| 4:00 AM | **Send Cold Email 2/3/4** | `Cold Email 2/3/4` → Instantly **interest code** | ✅ |
| **webhook** | **Email Sent → Move To Sent Stage** | Instantly confirms send → `Cold Email N` **→ `Cold Email N Sent`** + logs | ✅ |
| 4:30 AM | **Sent Cold Email to Caller Stages** | `Cold Email N Sent` → **call pipeline** (Day 1/2/3) | ✅ |

**The senders only *enroll*. `Email Sent → Move To Sent Stage` is what records that an email was
*actually sent*** — it is the hinge of the whole path, and it is **load-bearing in two directions**:
- It **drains** the `Cold Email N` stages → which is why `Send Cold Email 1` can use an
  unpaginated `limit=100` pull (see [Pagination](#pagination-who-needs-it-and-who-doesnt)).
- It **fills** the `Cold Email N Sent` stages → which is what the 4AM call handoff sweeps.

If it stops, both failures are **silent**: new leads quietly stop being emailed, and the call
handoff quietly dries up. Worth alerting on.

Other notes:
- The 3:00/3:30 pair is an **implicit contract** — the feeder must finish before the sender runs.
- **Step 1 creates the Instantly lead; steps 2/3/4 do not.** They set an *interest code* on the
  existing lead (N=2 `-29995`, N=3 `-29994`, N=4 `-29993`), which Instantly-side automation maps
  to the right subsequence. Each first removes the lead from its current subsequence.
- Leads also enter `Cold Email 2/3/4` directly from the call-disposition / missed-call **Cold
  Handlers** (`SEND_NEXT`) — that path does not depend on step 1.
- ⚠️ **Steps 2/3/4 are live while step 1 is not.** See Open questions.

## Pagination: who needs it and who doesn't
> The repo mirrors only *some* of the workflows on the instance. An absence here ("nothing
> writes X") proves nothing about the live system.

- **`Send Cold Email 1` / `New to Cold Email 1 Stage`: no pagination, and that's fine.**
  Confirmed by the operator (2026-07-14): these stages **never exceed 100 opportunities**, so a
  single `limit=100` pull always sees everything.
  ⚠️ **This is an invariant, not a coincidence — it holds because
  [`Email Sent → Move To Sent Stage`](workflows/email-sent/) drains the `Cold Email 1` stage**
  (moving each opp to `Cold Email 1 Sent` once Instantly confirms the send). **If that workflow
  stops, or New-stage intake grows past 100, the invariant breaks — and because the pull is
  unpaginated the failure is silent:** the pull returns 100 already-sent leads, the
  `email_step_name` guard skips them all, new leads are never emailed, and the run still reports
  success. Re-check before raising volume.
- **`Send Cold Email 2/3/4`: paginates properly.** Its stages *do* accumulate (nothing moves opps
  out of Cold Email 2/3/4), so it must page. Use its pull-node `options.pagination` block
  (`startAfterId` / `startAfter`, complete when `opportunities.length < 100`) as the reference
  for any new stage-pull that can exceed 100.

## `GHL Pipeline Stages (Cached)` — retired from mirrored workflows
The `ny7jwqGX1Du9aXNC` sub-workflow supplied pipeline/stage/custom-field IDs at runtime; mirrored
workflows now use **inlined literals** (take IDs from the reference tables in this file). No mirrored
workflow calls it, but it's still Active in n8n — **confirm no unmirrored workflow depends on it
before archiving.**

## ⚠️ Open questions
- **The email sequence has no entry point right now.** `Send Cold Email 2/3/4` is **Active**, but
  both step-1 workflows (`New to Cold Email 1 Stage`, `Send Cold Email 1`) are **Inactive** — steps
  2/3/4 run nightly while step 1 never fires. Confirm whether email 1 is intentionally paused.

## ⚠️ Security backlog
- **Cold Handler** has a hardcoded **Instantly** bearer token in a node header — move to
  an n8n credential and rotate. (Redacted in local `cold-handler.json`.)
- **Send Cold Email 1** has the same hardcoded Instantly bearer token in the
  "Instantly: Add to Cold Email 1" node header — same fix, same rotation.
- **Send Cold Email 2/3/4** has the same token in **three** node headers (hi_firstname PATCH,
  subsequence-remove, set-interest).
- **Email Sent → Move To Sent Stage** has it in **two** node headers (get-email, subsequence-remove).
- ⚠️ **It is the same token value in all four workflows** — **one rotation invalidates every one
  of them**, so move them all to a shared credential together, in one pass.
