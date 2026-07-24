# Call Disposition — Cold Handler  [Automation 3]

- **n8n ID:** `toFDNpFhy0ZyxfxN` · **URL:** https://n8n.meetobby.com/workflow/toFDNpFhy0ZyxfxN
- **Folder:** call-disposition · **Status:** Active ✅ (sub-workflow) — **not yet pushed**
- **Role:** Automation 3 of the multi-update rebuild.

> ⚠️ **Has a gatekeeper twin — edit both.** [`Gatekeeper Handler`](./Gatekeeper%20Handler.context.md)
> is a copy of this workflow differing only in `Compute MC`'s `MCE_BY_STAGE` (gatekeeper stage IDs).
> Any logic change here must be mirrored there.

## Gatekeeper lane
This handler also drives the **cold↔gatekeeper** flip via the `gatekeeper` tag, set in
`Parse + Map Outcome` and applied by a non-blocking side branch (`Switch: tag action` →
`GHL: Add Gatekeeper Tag` / `GHL: Remove Gatekeeper Tag`):
- `is_gatekeeper` (gatekeeper-good/bad/on-hold) → **add** tag · `is_cold` (cold-good/bad/on-hold) →
  **remove** tag · everything else (voicemail, …) → **leave** it (Option A).
- `continues_drip` includes **gatekeeper-good** → Cold Email N+1.
- `stop_phone_calls` is true on **cold-bad** and **gatekeeper-bad**.
The tag decides which call pipeline the lead's **next** call uses (read at 4:30AM); this handler
always moves the drip to the **shared** email pipeline regardless of lane.

## Purpose
Handler invoked by the **[Dispatcher/Router](./Dispatcher.context.md)** (Automation 2) for the
**cold** route. Classifies the call outcome (disposition-first, AI fallback), **moves the
opportunity**, then writes logs back to the contact **idempotently** and **records the processing
state** — in that order, so `processed:true` only lands after a real move.

## Invocation & input contract
- Trigger node **Call Input** = Execute Workflow trigger (`inputSource: passthrough`).
- Called by the Router's **Run Cold Call Handler**. Receives (see Router context):
  `contact_id, is_fallback, disposition, note, transcript, opp_id, route, caller_N, call_id,
  stage_name, signature, last_event_log_entry, last_call_summary_entry, last_signature,
  company_name, contact`. (The voicemail branch's `Compute MC` also needs the raw caller
  **`stage_id`** — it reads that off `contact`'s **Call Router Context**, not from a contract field.)
- Reads `disposition`/`note`/`opp_id` (old names `wavv_disposition`/`latest_note`/`active_opp_id`
  still accepted as fallbacks). Disposition is slugified in Build Prompt (`Cold Good` → `cold-good`).

## Flow (move before logs)
1. **Call Input** → **Build Prompt** — SDR classifier prompts (PT, today). Feeds transcript +
   disposition + note to the AI. **The AI re-runs on every update** (disposition/note are inputs).
2. **OpenAI: Classify Call** — `gpt-4o-mini`, temp 0, JSON → `{summary, outcome, resume_call_at}`.
3. **Parse + Map Outcome** — decision brain (below); computes the delta-replaced log strings.
   Fans out to the main chain **and** the **voicemail side branch** (below).
4. **AI: Interaction Summary** — rolling relationship summary.
5. **Build Log Fields** (code) — assembles the GHL `customFields` payload array (logs, resume,
   next-stage, Stop Phone Calls, Processing State). Extracted here so the HTTP node stays trivial.
6. **Can move?** (IF) — **directly after Build Log Fields** (routing is decided inside
   `Parse + Map Outcome`, so no workflow-level branch is needed):
   - `true` → **GHL: Move Opp → Target** → **GHL: Write Logs**
   - `false` (no target/opp) → **Not movable (build later)** stub — **no log write**, so
     `processed` stays `false` and the call is left for later handling.
7. **GHL: Move Opp → Target** (PUT opportunity) — runs **before** logs.
8. **GHL: Write Logs** (PUT contact, terminal) — just serialises `Build Log Fields`' array:
   `{{ JSON.stringify({ customFields: $('Build Log Fields').item.json.custom_fields }) }}`.
   **Only reached after the move**, so a failed/absent move means `processed` is never set →
   the call is retried next time.

### Voicemail side branch (missed-call email)
`Parse + Map Outcome` → **IF: voicemail?** (`is_voicemail`, true only for the `voicemail` outcome):
1. **GHL: Add Missed-Call Tag** — `POST /contacts/{id}/tags` adds `last_call_missed` (always, for
   voicemail).
2. **Compute MC** (code) — derives `mc` (1/2/0) from the raw caller **`stage_id`**, which it reads
   off the **Call Router Context** (`HW0eBfoQPW2mwxX8aY7Q`) on the passed-through `contact` (written
   by Capture) — the Router isn't involved. Uses the **same stage-id `MCE_BY_STAGE` map as the
   missed-call Cold Handler**: `1` = first miss (Day 1 Call A\*/Day 2 first attempt), `2` = second
   miss of Day 2, `0` = none (Day 1 Call B, all of Day 3). Also resolves `interest_value`
   (`-29996`/`-29992`), `email`, `first_name`, `instantly_lead_id`.
3. **IF: sends MCE?** (`sends_email`, i.e. `mc > 0`):
   - `true` → **GHL: Write MCE Field** (writes **only** Email Step Name `WtFfl1nEbMupk2oR4m9e` =
     `missed call email N`) → **Instantly: Remove from Subsequence** → **Instantly: Update
     hi_firstname** → **Gate: emails allowed?** → **Instantly: Set Missed Call Email**
     (`update-interest-status`, dynamic `interest_value` → Missed Call Email 1/2 fires).
   - `false` (`mc 0`) → **No Missed-Call Email** stub (the tag was still added).

   **Gate: emails allowed?** (Filter) sits right before the send: it passes only
   when **Stop Emails** `ixRO9dSUHVd6vNTdFa7Q` is **off**. A `Stop Emails=True` lead still gets the
   tag + Email Step Name write, but the missed-call email itself is **skipped**.

This runs **in parallel** with the main chain (which routes voicemail to the email pipeline, exactly
like cold-good). The two paths touch **different** contact fields — tag + Email Step Name vs
logs/state — so the concurrent partial-PUTs don't clobber each other. No opp move happens here (the
main chain owns the move).

## 🔁 Idempotency — the whole point of the rebuild
A call can be re-processed every time the rep edits the disposition/note. Each write is built to
be **self-correcting**, verified by execution (first run appends, second run replaces in place):

| Field | Rule |
|---|---|
| Opp stage move | self-correcting — each run sets the current outcome's target |
| Interaction Summary `AH3JqyYEPzPX4wXKoX1V` | overwrite (latest wins) |
| **Resume Call At `u5VC5C59UlFZJDYOuw7N`** | **always written** (value **or `''` to clear** a stale on-hold date) |
| **Next Caller Stage `Tj0yopYbErXbwsTYTsCX`** | **always written** (value **or `''`**) |
| **Event Logs `7D9N71mEDfipN90zfV0j`** | **delta-replace** via `upsert(live, last_event_log_entry, new)` — `split(lastEntry).join(newEntry)` replaces THIS call's prior line; else appends with a `\n`. Other automations' lines preserved. |
| **Call Summary `ZVeEoK85i5EOhWt1HO1F`** | same delta-replace via `last_call_summary_entry` |
| **Stop Phone Calls `KFDw66sjfFaszQx5UX6X`** | radio, **always written** — `True` on `cold-bad`/`gatekeeper-bad`, else `False` |
| **Email Step Name `WtFfl1nEbMupk2oR4m9e`** (voicemail branch) | written `missed call email N` only when `mc>0`; re-setting the Instantly interest is idempotent |
| **Call Processing State `BD9TmgEynOEy6bCvZshm`** | set `{processed:true, …}` **last, after the move** — read next time by the Router (dedup/fallback) and Capture (fallback) |

### Log line formats
- **Event Logs:** `[<stamp>] <stage_name> <disposition>` — e.g.
  `[Thu, Jul 16, 2026, 10:00 AM (PT)] Day 2 Call cold-good`. **No resume suffix**.
- **Call Summary:** `[<stamp> | <stage_name>] <AI summary>` (+ ` | resume call at <date>` on on-hold).
  Keeps the rich AI summary.

## Outcome mapping (Parse + Map Outcome)
- **15 valid dispositions (slugs):** `cold-good, cold-bad, cold-on-hold, gatekeeper-good,
  gatekeeper-bad, gatekeeper-on-hold, conversation-active, conversation-active-on-hold,
  appointment-booked, sales-call, not-interested-right-now-good, not-interested-right-now-bad,
  do-not-contact, voicemail, call-center`.
- **Disposition wins**; the AI `outcome` (from transcript) is used only when the disposition
  is missing/unrecognized. **Default = `cold-good`.** _(voicemail / call-center are recognized but
  **not** in the AI classifier enum — AI won't infer them; they only arrive via a provided disposition.)_
- **Email-drip group (`continues_drip` / `DRIP_OUTCOMES`) = `cold-good`, `gatekeeper-good`, `voicemail`.** → email
  pipeline `1A1RkYaL93s2rqbQ3Opi`, stage `SEND_NEXT[caller_N]` (N=1/2/3 → Cold Email 2/3/4). The
  sequence continues.
  - **Stop Emails** `ixRO9dSUHVd6vNTdFa7Q` = `True`: the cold branch targets
    **`SEND_NEXT_SENT[caller_N]`** (Cold Email N **Sent**: `fdd4f9a4`/`2f599547`/`39a20e88`) instead
    of the unsent stage — so **no cold email is sent** but 4:30AM still drains it to the next call.
    (Belt-and-suspenders with the sender-side check in `Send Cold Email 2/3/4`.)
  - **`voicemail`** is treated as a **missed call** (side branch, runs in parallel with the move):
    1. **adds the GHL tag `last_call_missed`** (`GHL: Add Missed-Call Tag`, `POST /contacts/{id}/tags`)
       so it routes to a **`(missed call)` caller stage** later (read by
       [`Sent Cold Email to Caller Stages`](../scheduled-automations/Sent%20Cold%20Email%20to%20Caller%20Stages%20%284_30AM%29.context.md)).
       The tag is otherwise **owned by GHL-side automations** (add for genuine misses + clear) —
       this node only adds it for voicemail; GHL handles removal.
    2. **fires a missed-call email** when `mc > 0` — see the *Voicemail side branch* in Flow above
       (`Compute MC` → Email Step Name `WtFfl1nEbMupk2oR4m9e` + Instantly interest `-29996`/`-29992`).
       `mc` is derived from the caller stage exactly like the dedicated
       [`missed-call Cold Handler`](../missed-call/Cold%20Handler.context.md). Day 1 Call B / Day 3
       voicemails add the tag but send **no** email (`mc 0`).
- **Stop Phone Calls** (`KFDw66sjfFaszQx5UX6X`, radio) always written: **`True` on `cold-bad` and
  `gatekeeper-bad`**, `False` otherwise.
- **Everything else (13 outcomes)** → Client Acquisition pipeline `O7LMZpDOFM2SYO65twC5`, same-named
  stage. Moving them out of the call/email pipelines takes them **out of sequential calling and
  emails**:

| Outcome | Client Acq stage ID |
|---|---|
| `cold-bad` | `8ecc2327-779f-4250-8d54-4554b49087f9` |
| `gatekeeper-good` | `fd52ae00-d4df-4008-8c8f-0dae62ca58e7` |
| `gatekeeper-bad` | `d5670151-b316-448b-8b13-c4f804fdd696` |
| `gatekeeper-on-hold` | `e921913e-1530-4186-8ce8-bb3dab47d301` |
| **`call-center`** | `04546ed9-e0d9-47dc-b61e-c0cd820849d7` |
| `cold-on-hold` | `54994e3f-1643-46f4-8eeb-ade43712ae2d` |
| `conversation-active` | `edca2ee6-569d-4486-9ecd-4110e9c32882` |
| `conversation-active-on-hold` | `175c5765-fd68-48d5-a319-8bcc77487703` |
| `appointment-booked` | `5344bfb7-9370-401e-8767-32bbdcc73778` |
| `sales-call` | `64251edf-6f9f-4b3e-b36b-3059814c2787` |
| `not-interested-right-now-good` | `8c76b904-fa25-4a73-9ac2-e17fb8323e2b` |
| `not-interested-right-now-bad` | `865a3d8d-045d-4b5d-b421-4115b876bb25` |
| `do-not-contact` | `cfc46631-06a5-4ef3-9788-1f15f35f052b` |

### resume_call_at (on-hold only)
- Set **only** for `cold-on-hold`, `gatekeeper-on-hold`, `conversation-active-on-hold`.
  "On hold" = the lead asked to be contacted again after a date/time.
- The **AI** produces it: parse from `latest_note` first (human-written, any format),
  falling back to the transcript. Relative phrases resolved against today (PT).
- Format: **`YYYY-MM-DD`**, or **`YYYY-MM-DD HH:mm`** if a time is present (always carries a
  date; if the time is later *today*, it uses today's date). Written as text to the
  **Resume Call At** custom field. A format guard rejects anything that isn't a date/date-time.

### next_caller_stage (on-hold only)
- Saves **where to resume the lead** once the hold passes (Next Caller Stage field
  `Tj0yopYbErXbwsTYTsCX`, text).
- **`cold-on-hold` & `gatekeeper-on-hold`** → `cold_call_{N}` where N = `caller_N` (1-3;
  N=0 → **defaults to `cold_call_1`**). Keep cold-calling — DM not yet reached.
- **`conversation-active-on-hold`** → `day_1_attempt_1` — resume the Active Conversation
  Call cadence at Day 1, 1st Attempt.
- Empty for all non-on-hold outcomes.

## GHL custom field IDs
- Event Logs `7D9N71mEDfipN90zfV0j` · Call Summary `ZVeEoK85i5EOhWt1HO1F`
- Interaction Summary `AH3JqyYEPzPX4wXKoX1V` · Instantly Lead ID `TWLomDBX0XInU1IKrG8L`
- Email History `TcdjZt3fwFSZTgY6ngeE` · **Resume Call At `u5VC5C59UlFZJDYOuw7N`** (text field)
- **Email Step Name `WtFfl1nEbMupk2oR4m9e`** (text) — voicemail branch writes `missed call email N`

## Credentials / constants
- **GHL:** `httpMultipleHeadersAuth` → `DtotRKnzjDewbSsv` (Waterline Growth subaccount)
- **OpenAI:** `openAiApi` → `B4xA6dDfoOhHJMOo` (classify + summary nodes)
- **Instantly:** ⚠️ **hardcoded bearer token in the node header** (present in the real
  export). **Action: move to an n8n credential / HTTP Header Auth credential and rotate.**

## TODOs / gotchas
- Instantly token is a plaintext secret — rotate + move to a credential.
- Stage IDs are hardcoded — if a pipeline/stage is renamed in GHL, update `Parse + Map Outcome`.
- The `OpenAI: Classify Call` node still carries a stale "transcript-only input" comment (cosmetic).

## Related
- Upstream: [`Dispatcher.context.md`](./Dispatcher.context.md) (Automation 2, `SfI5Hx6mlc4Qh3D1`) ·
  [`Capture Call Record`](./Capture%20Call%20Record.context.md) (Automation 1).
- Pipelines/stages, field IDs: [`AGENTS.md`](../../AGENTS.md).
