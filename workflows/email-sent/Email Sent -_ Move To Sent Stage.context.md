# Email Sent → Move To Sent Stage

- **n8n ID:** `CDdLps7wfOjyM9Lx` · **URL:** https://n8n.meetobby.com/workflow/CDdLps7wfOjyM9Lx
- **Folder:** email-sent · **Status:** **Active ✅** (webhook — no schedule)
- ⚠️ **Local edits not yet pushed** — see [Sync state](#sync-state).

## Purpose
**The missing link between "enrolled in Instantly" and "actually emailed."** Fires when Instantly
reports an email was really sent, then:
1. **Moves the opp `Cold Email N` → `Cold Email N Sent`** (email pipeline `1A1RkYaL93s2rqbQ3Opi`).
2. Logs the send (note, event log, AI-summarised email history, rolling interaction summary).
3. Removes the lead from its Instantly subsequence.

This is the workflow that **drains the `Cold Email N` stages** — the piece every other cold-email
workflow silently depends on:
- It's why `Send Cold Email 1` can get away with an **unpaginated `limit=100` pull** (the stage
  stays ≤100 because this empties it).
- It's what **populates the `Cold Email N Sent` stages** that
  [`Sent Cold Email to Caller Stages`](../scheduled-automations/Sent%20Cold%20Email%20to%20Caller%20Stages%20%284_30AM%29.context.md)
  sweeps into the call pipeline.

**The senders enroll; this workflow records reality.** A lead only advances once Instantly
confirms the send — not merely because it was added to a campaign.

## Trigger
**Webhook (Email Sent)** — `POST /webhook/email_sent`, called by Instantly. `Normalize` accepts
several payload shapes: `lead_email|email`, `campaign_id`, `campaign_name|campaign`,
`lead_id|leadId|instantly_lead_id`.

## Flow
1. **Webhook** → **Normalize** → **GHL: Search Contact by Email** (`/contacts/search`, `pageLimit 1`).
2. **Instantly: Get Email** — newest email for that lead in that campaign (`limit=10`, desc).
   `onError: continueRegularOutput` — a miss must not block the stage move.
3. **Build Logs + Route** (code) — the brain. Picks the email, strips HTML → `body_clean`,
   derives the **target Sent stage** (below), finds the email-pipeline opp, and builds the
   note/event-log entries.
4. Fans out **three ways in parallel**:
   - **AI: Summarize Email** → **Build email_history** → **AI: Interaction Summary** →
     **Build customFields** → **GHL: Write Logs + Lead ID** _(logging branch)_
   - **Is cold email (move stage)** (filter) → **GHL: Move Opp → Sent Cold Email N** _(the move)_
   - **Instantly: Remove from Subsequence** _(best-effort, `onError: continue`)_

The **move does not wait on the AI branch** — a slow or failed summariser cannot stop the
pipeline advance. Deliberate and correct.

## 🎯 Routing — `email_step_name` decides the target stage
`Build Logs + Route` reads **Email Step Name** (`WtFfl1nEbMupk2oR4m9e`), which the senders
already stamp, and maps it:

| `email_step_name` | → target stage |
|---|---|
| `cold email 1` | **Cold Email 1 Sent** `41849471-…` |
| `cold email 2` | **Cold Email 2 Sent** `fdd4f9a4-…` |
| `cold email 3` | **Cold Email 3 Sent** `2f599547-…` |
| `cold email 4` | **Cold Email 4 Sent** `39a20e88-…` |
| `missed call email N`, empty, or anything else | _no stage_ → **filter drops it, no move** |

Match is `^cold email (\d+)$`, lowercased — so casing drift in GHL is tolerated, and a
`missed call email N` send logs normally but triggers **no** cold-stage move.

**Guard:** `Is cold email (move stage)` requires **both** `target_sent_stage_id` **and**
`email_opp_id` to be non-empty. The opp is located by scanning the contact's opportunities for
`pipelineId === '1A1RkYaL93s2rqbQ3Opi'`, so a contact with both a call opp and an email opp
resolves correctly.

## GHL custom field IDs
- **Email Step Name** `WtFfl1nEbMupk2oR4m9e` — **read** (drives the route)
- Note `4Ysr9E6CKC2vZK9m6MNm` — appended
- Event Logs `7D9N71mEDfipN90zfV0j` — appended
- Email History `TcdjZt3fwFSZTgY6ngeE` — appended (AI summary per email)
- Interaction Summary `AH3JqyYEPzPX4wXKoX1V` — **overwritten** (rolling snapshot), and only when
  the AI returned something — a model hiccup never blanks an existing summary
- Instantly Lead ID `TWLomDBX0XInU1IKrG8L` — written when present
- Call Summary `ZVeEoK85i5EOhWt1HO1F` — read (input to the interaction summary)

## Metrics logging (email_log)
A leaf **`Sheet: Log Email`** node hangs off **`GHL: Write Logs + Lead ID`** (the logging branch's
terminal write) and **appends** one row to the **`email_log`** tab (*Plumber Campaign Metrics*
`1RuupHeSo8-…`).
- All columns come from `Build Logs + Route`: `timestamp_pt, date_pt, contact_id, company, city,
  campaign_id, step` (`1`–`4` for `cold email N`, blank for `missed call email N`), `event_type`
  (always **`sent`** here), `reply_classification, instantly_lead_id, email_id` (blank when
  `Instantly: Get Email` failed — e.g. a 429; the send still logs).
- `USER_ENTERED`; `onError: continueRegularOutput`, leaf → a Sheets miss never blocks the stage move.
- Only **`sent`** events are written here; engagement events (`opened/bounced/replied`) would come from
  a separate Instantly-events webhook (not built).
- ⚠️ **Tab gid:** the node currently points at gid `0`; **re-select the `email_log` tab** in the node
  after import if that isn't the real tab (AGENTS.md flags this gid as unconfirmed).
- Credential `googleSheetsOAuth2Api` → `nVa0UTFYjGo1apqU`. Full schema:
  [`AGENTS.md` → Metrics workbook](../../AGENTS.md).

## Credentials / constants
- **GHL:** `httpMultipleHeadersAuth` → `DtotRKnzjDewbSsv` · location `rzaMhqeo2apNI1p6DG5z`
- **Google Sheets:** `googleSheetsOAuth2Api` → `nVa0UTFYjGo1apqU` (`Sheet: Log Email` → `email_log`)
- **OpenAI:** `openAiApi` → `B4xA6dDfoOhHJMOo` · `gpt-4o-mini`, both AI nodes `onError: continue`
- **Instantly:** ⚠️ **hardcoded bearer token** in two node headers — move to a credential + rotate.

## Sync state
Local `.json` has edits **not yet pushed** to the live n8n instance — needs re-import.

## TODOs / gotchas
- Instantly token is a plaintext secret in two node headers — rotate + move to a credential.
- **Load-bearing.** If this workflow stops, `Cold Email N` stages stop draining → they grow past
  100 → `Send Cold Email 1`'s unpaginated pull silently stops reaching new leads, **and** the
  `Cold Email N Sent` stages stop filling, so the call handoff dries up too. Two failures, both
  silent. Worth alerting on.
- `email_step_name` is stamped by the sender **after** the Instantly POST. If that stamp failed
  but the send happened, this webhook sees an empty/stale step name and won't move the opp.

## Related
- Populated by: [`Send Cold Email 1`](../scheduled-automations/Send%20Cold%20Email%201%20%283_30AM%29.context.md) ·
  [`Send Cold Email 2/3/4`](../scheduled-automations/Send%20Cold%20Email%202_3_4%20%284AM%29.context.md)
  (they stamp `email_step_name`).
- Feeds: [`Sent Cold Email to Caller Stages (4:30AM)`](../scheduled-automations/Sent%20Cold%20Email%20to%20Caller%20Stages%20%284_30AM%29.context.md)
  — sweeps the `Sent` stages this workflow fills.
- Pipelines/stages, custom fields: [`AGENTS.md`](../../AGENTS.md).
