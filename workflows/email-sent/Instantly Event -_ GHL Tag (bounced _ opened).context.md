# Instantly Event → GHL Tag (bounced / opened)

- **n8n ID:** `LivoJrl0ot4luBdT` · **URL:** https://n8n.meetobby.com/workflow/LivoJrl0ot4luBdT
- **Folder:** email-sent · **Status:** **Active ✅** (webhook — no schedule)
- ⚠️ **Local edits not yet pushed** — the bounce branch below exists only in this repo.

## Purpose
The **engagement-event** counterpart to
[`Email Sent → Move To Sent Stage`](Email%20Sent%20-_%20Move%20To%20Sent%20Stage.context.md).
That workflow records *"the email left the building"*; this one records what happened **after**.

Two responsibilities:
1. **Always** — stamp a GHL contact tag for the event (`email_bounced` / `email_opened`).
2. **On a bounce only** — treat the address as dead: force **`Stop Emails=True`** and push the
   email opp into **`Cold Email N Sent`**, which hands the lead to the **call** path instead.

A bounce is the one email event that changes routing. Everything else is just a tag.

## Trigger
**Webhook (Instantly Event)** — `POST /webhook/instantly_event`, called by Instantly.
`Normalize` accepts `event_type` plus `lead_email|email`, and maps the event → tag:

| Instantly `event_type` | tag added | bounce branch |
|---|---|---|
| `email_bounced` | `email_bounced` | ✅ |
| `email_opened` | `email_opened` | — |
| anything else | _(none)_ → **`Known event?` drops it** | — |

**`MAP` in `Normalize` is the allow-list.** An unmapped event produces an empty tag and the run
ends at `Known event?` — so pointing more Instantly events at this webhook is safe, but they do
nothing until you add them to the map.

## Flow
```
Webhook → Normalize → Known event? → GHL: Search Contact by Email → Build contact + route → Contact found?
                                                                                             ├─ GHL: Add event tag
                                                                                             └─ Bounced?
                                                                                                ├─ GHL: Set Stop Emails = True
                                                                                                └─ Can move opp? → GHL: Move Opp → Cold Email N Sent
```
The tag write and the bounce branch are **siblings, not a chain** — a failed stage move never
costs you the tag, and vice versa. Same reasoning as the parallel fan-out in
`Email Sent → Move To Sent Stage`.

## 🎯 Why a bounce sets `Stop Emails=True` **and** moves the opp
Those two writes are one decision, not two. `Stop Emails=True` means *no email is ever sent to
this lead again* — and per [`AGENTS.md`](../../AGENTS.md), the whole system keys off that field
**alone**:

> every no-email lead **must** carry `Stop Emails=True`, or it stalls in `Cold Email N` before
> the first call.

So setting the flag without moving the opp would **strand the lead**: the nightly senders would
skip it (flag set) and nothing would ever move it out of `Cold Email N`. Moving it to
`Cold Email N Sent` puts it exactly where the 4:30AM
[`Sent Cold Email to Caller Stages`](../scheduled-automations/Sent%20Cold%20Email%20to%20Caller%20Stages%20%284_30AM%29.context.md)
sweep will find it → call pipeline, Day 1/2/3. **A bounced lead becomes a call-only lead.**

This is the same "`Stop Emails` ⇒ go straight to the Sent stage" convention the senders and both
Cold Handlers already implement — this workflow just reaches it from a new direction.

## Picking `N` — `email_step_name` first, current stage as fallback
`Build contact + route` resolves the target stage in two steps:

1. **Primary — `Email Step Name`** (`WtFfl1nEbMupk2oR4m9e`), matched `^cold email (\d+)$`
   lowercased. Identical to the routing in `Email Sent → Move To Sent Stage`, so the two
   workflows can never disagree about which step a lead is on.
2. **Fallback — the email opp's *current* stage.** `N_BY_STAGE` maps both `Cold Email N` **and**
   `Cold Email N Sent` → the same `N`. This covers the real failure mode called out in the
   sibling context file: *the sender stamps `email_step_name` **after** the Instantly POST, so a
   failed stamp on a successful send leaves it empty or stale.* Without the fallback, a bounce on
   such a lead would set `Stop Emails=True` and strand it — the exact outcome above.

| `email_step_name` | opp's current stage | → target |
|---|---|---|
| `cold email 2` | (anything) | **Cold Email 2 Sent** |
| _empty_ | `Cold Email 3 Sent` | **Cold Email 3 Sent** _(no-op move — harmless)_ |
| _empty_ | `Cold Email 1` | **Cold Email 1 Sent** |
| `missed call email 1` | — | _none_ → **no move** (flag still set) |

## Guards — what a bounce does **not** do
`Can move opp?` requires **both** `target_sent_stage_id` and `email_opp_id`. Two cases fail it,
both deliberately:

- **No email opp.** The opp lookup is scoped to `pipelineId === '1A1RkYaL93s2rqbQ3Opi'`. The
  4:30AM sweep **moves that same opp** into a call pipeline rather than creating a new one — so
  once a lead is being called, there is no email opp left to find. **A late bounce must not yank
  an actively-called lead back into `Cold Email N Sent`,** and it can't. Same for a lead parked
  in Client Acquisition after a bad/on-hold disposition — a bounce won't resurrect it.
- **No cold step** (`missed call email N`, or an unrecognisable step name with no stage
  fallback). Tag + `Stop Emails=True` still land; only the move is skipped.

`Stop Emails=True` is written **unconditionally on any bounce**, independent of the move guard —
a dead address is a dead address regardless of which email bounced or where the opp sits.

**The move is idempotent.** A bounce normally arrives *after* `Email Sent → Move To Sent Stage`
has already moved the opp to `Cold Email N Sent`, so the PUT usually re-writes the stage the opp
is already in. That's a no-op, not a bug.

## GHL custom field IDs
- **Email Step Name** `WtFfl1nEbMupk2oR4m9e` — **read** (primary route key)
- **Stop Emails** `ixRO9dSUHVd6vNTdFa7Q` — **written `'True'` on bounce**. Radio field: the value
  is the **string** `'True'`, not a boolean. Never written `False` here — this workflow only ever
  stops email, never re-enables it.

## Credentials / constants
- **GHL:** `httpMultipleHeadersAuth` → `DtotRKnzjDewbSsv` · location `rzaMhqeo2apNI1p6DG5z`
- Email pipeline `1A1RkYaL93s2rqbQ3Opi`; `Cold Email N Sent` stage IDs inlined in
  `Build contact + route` (`SENT_STAGE`) — take them from [`AGENTS.md`](../../AGENTS.md).
- **No Instantly call** — this workflow only *receives* from Instantly, so unlike its four
  siblings it carries **no hardcoded bearer token**. Keep it that way.

## Sync state
Local `.json` has the bounce branch (`Bounced?`, `GHL: Set Stop Emails = True`, `Can move opp?`,
`GHL: Move Opp → Cold Email N Sent`) and the `Build contact + tag` → **`Build contact + route`**
rename — **not yet pushed**. Needs `update_workflow` on `LivoJrl0ot4luBdT`.

## TODOs / gotchas
- ⚠️ **`email_log` is still not fed by this workflow.** AGENTS.md predicts engagement events
  (`opened`/`bounced`/`replied`) reaching `email_log` via "a separate Instantly-events webhook" —
  **this is that webhook**, but it appends nothing. The `opened`/`bounced` columns on the `daily`
  tab stay 0 until a leaf `Sheet: Log Email` node is hung off the tag write (append, `event_type`
  = `opened`/`bounced`, `onError: continueRegularOutput` — copy the node from
  `Email Sent → Move To Sent Stage`).
- **Soft vs hard bounce.** The flow treats every `email_bounced` as terminal. If Instantly emits
  the event for soft/transient bounces too, a temporary mailbox-full will permanently convert a
  lead to call-only. Worth confirming against Instantly's event semantics before volume grows.
- **No dedup.** Instantly can fire `email_opened` many times for one email; each fires a full run
  (tag add is idempotent in GHL, so it's noisy rather than wrong). A repeat `email_bounced`
  re-writes the same flag and re-moves to the same stage — also idempotent.
- **The name understates it.** It is no longer only a tagger. Rename to
  `Instantly Event → GHL (tag + bounce routing)` if the live workflow gets renamed — the file
  names and the AGENTS.md registry row would need to follow.

## Related
- Sibling: [`Email Sent → Move To Sent Stage`](Email%20Sent%20-_%20Move%20To%20Sent%20Stage.context.md)
  — same webhook-from-Instantly shape, same `email_step_name` route, same Sent-stage map.
- Feeds: [`Sent Cold Email to Caller Stages (4:30AM)`](../scheduled-automations/Sent%20Cold%20Email%20to%20Caller%20Stages%20%284_30AM%29.context.md)
  — sweeps the `Cold Email N Sent` stage a bounce drops the lead into.
- `Stop Emails` semantics, pipelines/stages, custom fields: [`AGENTS.md`](../../AGENTS.md).
