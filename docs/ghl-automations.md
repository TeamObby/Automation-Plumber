# GHL-side automations — the half that lives outside n8n

> Read alongside [`AGENTS.md`](../AGENTS.md). That file maps the **n8n** workflows;
> this one maps the **GoHighLevel** workflows that trigger them, and the GHL-side
> side effects (tags, opportunity creation) that no n8n JSON records.
>
> **Captured:** 2026-09-22, read live from the **Waterline Growth** sub-account
> (`rzaMhqeo2apNI1p6DG5z`) by browsing the GHL UI. Nothing was modified.
> GHL workflow IDs below are stable — open one at
> `https://app.gohighlevel.com/v2/location/rzaMhqeo2apNI1p6DG5z/automation/workflow/<id>`.

## The join: GHL → n8n

Every n8n entry point in this repo is fired by a GHL workflow in the
**Call Campaign** folder (`592c9b32-cac5-460c-8b47-af01550d81b2`). All webhook paths
match the n8n `path` values in `workflows/*/*.json`.

| GHL workflow (id) | Trigger | GHL-side actions, in order | Posts to | n8n workflow |
|---|---|---|---|---|
| **Call Recorded Trigger** `120588ca-915c-4a87-9f7e-ab6ca8b273fc` ✅ | WAVV **Call Recorded** (`wavv_trigger_call_recorded`) | **If/Else `Screener lead?`** (since 2026-09-25) → **Kevin** (no `screening`): 1. **remove** tag `last_call_missed` · 2. wait **2s** · 3. webhook · **Screener**: webhook `/webhook/screener-call` (same 19 fields) | `/webhook/call-recorded-capture` | [Capture Call Record](../workflows/call-disposition/) (Automation 1) |
| **Capture Wavv Disposition** `d5e8da04-4b4b-4eef-87c3-189cfbba34bd` ✅ | **Note Added** (any note) | 1. wait **7s** · 2. **If/Else `Screener lead?`** → **Kevin**: webhook, `note = {{note.body}}` · **Screener**: webhook `/webhook/screener-disposition`, same note | `/webhook/capture-wavv-disposition` | [Capture Wavv Disposition](../workflows/call-disposition/) |
| **Call Disposition OR Note Updated** `a5605203-107e-42d1-935a-0a3805a7fe51` ✅ | **Contact Changed** ×2 — `Call Disposition` has-changed, `Call Notes` has-changed | webhook (no custom fields — relies on GHL's default contact payload) | `/webhook/call-disposition-updated` | [Dispatcher](../workflows/call-disposition/) (Automation 2) |
| **Call No Answer** `0092952f-83d2-44aa-bd9c-829d350c08ce` ✅ | **Tag added** `wavv-no-answer` **or** `wavv-canceled` | 1. **remove** tags `wavv-no-answer`,`wavv-canceled` · 2. **If/Else `Screener lead?`** → **Kevin**: **add** tag `last_call_missed` · webhook · **Screener**: webhook `/webhook/screener-no-answer` | `/webhook/call_no_answer` | [Missed Call - Dispatcher](../workflows/missed-call/) |
| **Manual Review Items Changed** `f2119238-3160-4959-8af9-38ea4c599fa5` ✅ | **Contact Changed** — `Manual Review Items` (`tYhhupx5TalZqdNsiwCs`) has-changed | webhook, `contact_id = {{contact.id}}` | `/webhook/manual-review-opp` | [Create Manual Review Opp](../workflows/manual-review/) |
| **Move Leads Into Cadence** `571b33ab-2e83-4b72-8688-7a24f8c67b3b` ✅ (root folder) | **Scheduler** cron `38 7 * * *` **+** lead enters Client Acq → **New** | webhook: `opportunity_id`, `pipeline_name`, `stage_name`, `opportunity_name` | ⚠️ `/webhook-**test**/move-leads-into-**candence**` | **none — not in this repo** |

✅ = Published (live in GHL).

### The `last_call_missed` tag is owned here, not in n8n
`AGENTS.md` says "added & removed by GHL-side automations" — this is them:
- **added** by `Call No Answer` (plus by the n8n Cold/Gatekeeper Handler on a `voicemail` outcome),
- **removed** by `Call Recorded Trigger`, i.e. the next time a call is actually recorded.

That pairing is what makes the `(missed call)` caller-stage variants self-clearing.

### Contact intake (GHL side)
| GHL workflow (id) | Trigger | Does |
|---|---|---|
| **Import Contact To New** `475c6d9a-b7a2-43dd-ade0-de610a2f5021` ✅ | **Contact Created** with tag `plumber` | **no email** → creates opp in **Cold Outbound Call Pipeline → Day 1 Call A** (`060f44a8`, call-first). **has email** → creates opp in **Client Acquisition → New** (`f6aa7e0f`) |
| **Hawaii Temp** `c335f0fb-386d-4467-85a0-c9461285bc97` ✅ | **no trigger** — manual/bulk add only | sets **Stop Emails = True**, removes tag `plumber_new` |

`Import Contact To New` is the real front door of the campaign, and it is the no-email
path the Cold Handler's `stop_emails` guard was written for: a no-email lead lands
**straight in `Day 1 Call A`**, skipping the `No Email Cold Call 1` stage that would
otherwise set `Stop Emails`.

### Assignment / cosmetics (no n8n involvement)
| GHL workflow (id) | Trigger | Does |
|---|---|---|
| **Final - Add Timezone Followers** `377657ca-5813-43f9-921c-70d5313fb6a0` ✅ | Opportunity created / changed / stage changed | Branches on **TZ** (`Q8NyGdyiYyeaakqmPjNT`) and adds a follower to the contact **and** the opportunity. Branch order: `PT → ovYLZfmjUYAN38sRatRe`, `HST → ONV5oibl0pg8LYxNitk4`, `AKST → pJ7b5CDJtLwTXdD2oXGY`, `CT → XRQzyBSHtKLDGfRpVaJL`, `EST → sJPV6fWNDU8X4v1NQKrY` |
| **Copy - Final - Add Timezone Followers** `478e2e17-dfc1-4493-8317-f8fe08cce719` ✅ | same three triggers | **Despite the name, not timezone** — branches on the **line-type** field `m27zFzsoLzVd36aeHUPk` (`mobile` / `fixed_line_or_mobile`) and adds followers `d8NViz2uVk9LkL384L9B` / `dAdjCMrIGhiLEnds6AY3` |
| **Opportunity Name Routing - Mohimenul** `5499599c-fecd-40f5-ad55-8c94366b92f5` ✅ | Opportunity created in Client Acquisition | renames the opp to `{{contact.company_name}}`, or `{{contact.first_name}}` when there is no company |

`Add Timezone Followers` (`e6ac26a1`) and `Copy - Opportunity Name Routing`
(`933efd61`) are older published duplicates of these two — not inspected in detail.

### Drafts in the Call Campaign folder (not running)
`Call Ended Trigger` · `Call Recorded Trigger old` (the pre-rebuild hookup) ·
`Contact Changed -> Dedicated GHL Stage` · `Copy - Add Timezone Followers` ·
`GHL Call Status` · `New Workflow : 1784834956574` · `Voicemail test`
— plus `WAVV Dialer Call Disposition` (`42d012f2`) at root.

## Pipelines — verified against `AGENTS.md`
All **7 live pipelines and every stage ID match the repo exactly** (2026-09-22):
Client Acquisition 25 · Cold Email 9 · Cold Call 15 · Gatekeeper Call 13 ·
Active Conversation 10 · Rebooking 10 · Manual Review 2. Three `[TEST]` pipelines
exist and are correctly ignored by the repo. **No drift.**

## ⚠️ Findings

1. **`Move Leads Into Cadence` posts to a TEST webhook.** The URL is
   `https://n8n.meetobby.com/webhook-test/move-leads-into-candence`. An n8n
   `webhook-test` URL only answers while that workflow sits open in the n8n editor
   with "Listen for test event" active — the rest of the time it 404s. The path is
   also misspelled (**candence**), and no such workflow is mirrored in this repo.
   It runs on a daily cron (`07:38`) **and** on every lead entering Client Acq → New,
   so it is firing regularly into nothing. Decide: point it at a real
   `/webhook/...` path, or unpublish it.
2. **`AGENTS.md` is stale on the Call Recorded trigger.** The Capture Call Record
   context says "⚠️ Repoint the GHL Call Recorded trigger here (it currently hits the
   old `Dispatcher`)". It is **already repointed** to `/webhook/call-recorded-capture`,
   and `Call Recorded Trigger old` is a draft. Cutover step 4 is done.
3. **The GHL half of the rebuild is fully live, the n8n half is not.** GHL is already
   firing `call-recorded-capture` and `call-disposition-updated`, but the repo marks
   **Capture Call Record** as "built, not imported" and the **Dispatcher** as inactive.
   If that is still true on the n8n side, those two webhooks are posting to nothing.
   Worth confirming in n8n (the n8n MCP connection was logged out during this pass).
4. **`Booked to Create Opportunity`** (`beadaba1`, published, root) creates an
   opportunity in pipeline `ioAr6wATYq0gCmd2rTia`, which **does not exist** in this
   sub-account's 10 pipelines. It cannot be working.
5. **A second n8n instance is in play.** The root-level intake workflows
   (`Adding new contact based on Google Sheet Row`, ×4 variants) post to
   **`teamobby.app.n8n.cloud`**, not `n8n.meetobby.com`, and drive a review/reputation
   flow (`review_active` / `review_completed` tags). Unrelated to the plumber campaign,
   but worth knowing before assuming "n8n" means one instance.
6. **Webhook timing is deliberate.** `Capture Wavv Disposition` waits **7s** after the
   note is added and `Call Recorded Trigger` waits **2s** — GHL needs that long to
   finish writing the note/recording before n8n reads the contact back.

## What was not inspected
This sub-account has **81 workflows**. This pass covered all 16 in the **Call Campaign**
folder plus the campaign-relevant root workflows. Not opened: the AI-receptionist
inbound set (`AI Receptionist Lead SMS Alerts`, `AI SMS - Mahir`, the `Inbound …
SMS Webhook` and `Missed Inbound … Call Webhook` families), `Show Up Rate`,
`Assign User Automatically`, and the ~6 workflows under the **Waterline Growth**
folder (`Waterline V1`, `Agentic Workflow`, `Manage Contacts`, `Test`). None of them
are named for the plumber campaign, but none were ruled out by reading them either.
