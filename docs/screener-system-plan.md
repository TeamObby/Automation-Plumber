# Screener system — build spec

**Status:** ready to build. Every mechanism below was checked against the live GHL/WAVV account on
2026-09-22; §12 lists exactly what is proven, what is assumed, and the two things that are
blocked on someone else. Where a choice existed, this doc **makes** it — open questions are only
those that are genuinely Kevin's (§11), and each carries a recommendation.

**What it is:** two screeners call every plumber first and learn two facts — **does the owner
answer this line**, and **at what hour**. Kevin then dials only owner-verified numbers, inside the
hour block they answered in.

**Hard rule:** a screener call must not touch any of Kevin's automations — no cold email, no
missed-call email, no opportunity move, no `last_call_missed`. Screened-out leads get **nothing**
(Kevin, ~47:26).

Companions: [`ghl-automations.md`](ghl-automations.md) · [`AGENTS.md`](../AGENTS.md) ·
*Screener Pipeline Map* artifact (Mohimenul's AI tagger).

---

## 1. Who is calling — and why the guard is built the way it is

| Event | Fires | Identifies the caller? |
|---|---|---|
| Call recorded | `wavv_trigger_call_recorded` | **Yes** — `userId`, `callerId` (from-number), `teamId` |
| Disposition picked (WAVV writes a note) | `note_add` | **Partly** — the note body carries `From: <number>` |
| No answer | tag `wavv-no-answer` / `wavv-canceled` added | **No — nothing** |

No single caller signal covers all three, so **the guard lives on the contact**, which every event
carries: tag **`screening`** + **Owner = a screener user**.

### The four GHL workflows to edit — and where the branch goes

Two of them do housekeeping *before* the harmful part, and that housekeeping must keep running.

| Workflow (id) | Insert If/Else | Screener branch does | Why there |
|---|---|---|---|
| **Call No Answer** `0092952f-83d2-44aa-bd9c-829d350c08ce` | **between step 1 (*Remove Tag*) and step 2 (*Add Tag* `last_call_missed`)** | POST `/webhook/screener-no-answer` | Blocking the whole thing strands `wavv-no-answer` on the contact; the next dial re-adds a tag that is already there, the trigger does not fire, and **attempt 2 becomes invisible** |
| **Capture Wavv Disposition** `d5e8da04-4b4b-4eef-87c3-189cfbba34bd` | on **Branch A only**; **Branch B (wavv-tag cleanup) runs for everyone** | POST `/webhook/screener-disposition` with `{{note.body}}` | Branch A writes **Call Disposition** → Dispatcher → Cold/Gatekeeper Handler → moves the opp, sends the next cold email, sets Stop Phone Calls |
| **Call Recorded Trigger** `120588ca-915c-4a87-9f7e-ab6ca8b273fc` | first step | POST `/webhook/screener-call` (same payload it already builds) | else Capture Call Record writes a Call Router Context for a call Kevin never made |
| **Move Leads Into Cadence** `571b33ab-2e83-4b72-8688-7a24f8c67b3b` | first step | stop | fires on entry to Client Acq → New |

**Rule of thumb: block what reaches back to the lead, keep what keeps the CRM clean.**

Second layer in n8n (defence in depth): `Capture Call Record` filters `ghl_user_id` against the
screener users; `Capture Wavv Disposition` filters the parsed `From:` against the screener number
pool; `Dispatcher`'s `Prep + Gate` adds `screening` to its stop conditions.

**The Attempt ladder comes from the no-answer path**, not the recorded-call path — an unanswered
dial produces no recording. That is the whole reason `Call No Answer` keeps running.

**Residual risk:** a screener dialling a contact that is *not* tagged `screening` (manual dial)
is invisible on the no-answer path. Mitigation is procedural: screeners dial only from their
assigned Smart List.

---

## 2. Objects to create in GHL

### 2.1 Pipeline `Screener — Plumbers` — pinned to the top of the pipeline list

| # | Stage |
|---|---|
| 1 | To Screen |
| 2 | Attempt 1 |
| 3 | Attempt 2 |
| 4 | Attempt 3 |
| 5 | Attempt 4 |
| 6 | Owner Verified |
| 7 | Gatekeeper |
| 8 | Not Sure |

Kevin's list verbatim (~56:33). Only stage 6 leaves the pipeline. 7 and 8 are terminal and nothing
happens to them.

### 2.2 Custom fields (contact)

| Field | Type | Written by | Used for |
|---|---|---|---|
| `Date Screened` | DATE | n8n | freshness |
| `Screener Result` | TEXT | n8n | the `S:` disposition, reporting |
| `Screen Attempts` | NUMBER | n8n | 1–4, drives the stage |
| `Screen Noise` | TEXT (`busy` / `quiet`) | n8n | the gold list |

### 2.3 Tags

`screening` · `owner-confirmed` · `screened-pt-06-07` … `screened-pt-15-16` ·
`screen-busy` · `screen-quiet` · `screen-mismatch` · `screener-a` / `screener-b`

### 2.4 Users

- **2 screener users** — role **Only Assigned Data**, `ACCOUNT-USER` (not admin).
- **8 block label-users** — `PT 06-07` … `PT 15-16`, plain users, **no admin rights**.
  This is an existing pattern here: 7 of the account's 8 users are already label-users
  (PT/CT/ET/AT/HT, PhoneType ×2) — see §12.
  ⚠️ Those existing 7 are all `ACCOUNT-ADMIN`, which is worth downgrading while we are in there.

### 2.5 WAVV dispositions — needs the WAVV account owner

Namespaced `S:` because the list is shared with Kevin's. Give each the tag `wavv-s-…` so the
existing Branch B cleanup sweeps them up automatically.

| Disposition | Tag | Call Outcome |
|---|---|---|
| S: Owner | `wavv-s-owner` | Other |
| S: Gatekeeper | `wavv-s-gatekeeper` | Other |
| S: Not Sure | `wavv-s-not-sure` | Other |
| S: Busy (answered, noisy) | `wavv-s-busy` | Other |
| S: Quiet (answered, silent) | `wavv-s-quiet` | Other |
| S: Wrong Number | `wavv-s-wrong-number` | Bad Number |
| S: Not A Plumber | `wavv-s-not-a-plumber` | Other |
| S: DNC | `wavv-s-dnc` | Do Not Contact |

⚠️ **Two live findings that change this section** (§12): the WAVV settings page shows **14 user
dispositions**, and **"Add New Disposition" is disabled for the current login** — so an account
owner has to add these. WAVV also auto-dispositions unanswered calls (`[System] No Answer`,
`Voicemail`, `Bad Number`) without prompting, so the finer no-answer split is not the screener's
to make; we take WAVV's automatic ones.

---

## 3. What the screener does, per call

**Answered call → two clicks:** the outcome (`S: Owner` / `S: Gatekeeper` / `S: Not Sure`) and
the noise (`S: Busy` / `S: Quiet`).

**Unanswered call → nothing.** WAVV auto-dispositions it and the system counts the attempt.

That is the entire job. Kevin narrowed it to this himself (~43:41) after dropping male/female and
"sounds like an owner". Busy/quiet stays because no machine can hear it, and it is what marks the
gold list — a noisy background means the owner is in a truck, working, worth 2–3× (~43:20).

**Call conduct** — *"the screener cannot be connected to anything that comes back to us"* (~46:44):
never leave a voicemail · never name Obby or WaterLine · no demo, no selling · never dial outside
**8am–9pm in the lead's own local time** (the `TZ` field gates the list) · if asked to be removed,
`S: DNC` and stop.

---

## 4. What the AI does

Mohimenul's tagger reads the transcript and returns `call_outcome`, `owner_reached`, `confidence`,
`evidence_quote`, `owner_name`. The split (Ridoy, ~59:05): **transcript-readable facts are the
AI's; ear-only facts are the screener's.** Nobody is asked twice for the same thing.

### Cross-check — the screener's mark wins, the AI catches mistakes

| Screener | AI | Result |
|---|---|---|
| `S: Owner` | owner reached | **Owner Verified** |
| `S: Gatekeeper` | not the owner | **Gatekeeper** |
| `S: Owner` | not the owner / unclear / low confidence | **Not Sure** + `screen-mismatch` |
| `S: Gatekeeper` or `S: Not Sure` | owner reached | **Not Sure** + `screen-mismatch` |
| nothing (`wavv-none`) | anything | **Not Sure** + `screen-mismatch` |

Exactly Kevin's ask at ~57:43. The per-screener mismatch rate is also the fairest quality measure
we will have — which matters with two of them.

---

## 5. Two screeners

**One pipeline, split by owner** — not two pipelines.

| Layer | Mechanism |
|---|---|
| Ownership | contact **Owner** = Screener A or B, set by n8n at import; same owner on the screener opportunity |
| Access | role **Only Assigned Data** — neither can open the other's contacts, or Kevin's |
| Daily queue | Smart List: `Opportunity pipeline = Screener — Plumbers` **AND** `Opportunity stage = To Screen / Attempt 1-4` **AND** `Owner = me` ✅ all three filters verified |
| Attribution | recorded call → `userId`; disposition note → their own `From:` number; no-answer → the contact's owner |
| Reporting | tags `screener-a` / `screener-b` |

**Splitting is n8n's job at import** — alternate A/B, or split by state when Kevin works a state at
a time. GHL has **no round-robin action** (verified). A lead keeps the same screener across all
four attempts, or attempt counts stop meaning anything.

**Seats and numbers:** one WAVV seat and its own numbers per screener. WAVV local presence is
account-wide, so "own numbers" means fixed assigned numbers. ~100 dials per number per day,
registered in Trust Hub, rotated more often than Kevin's — short hang-up calls are exactly the
pattern carriers flag "Spam Likely", and Kevin's numbers must not be in the blast radius.

Screener #3 later = create user → add to the two n8n guard lists → add to the import split.

---

## 6. Hour blocks

Ten blocks, **always Pacific**, as Kevin listed them (~34:19) and always Pacific even for an
Eastern lead (~34:07):

`PT 06-07` · `07-08` · `08-09` · `09-10` · `10-11` · `11-12` · `12-13` · `13-14` · `14-15` · `15-16`

1. Only blocks the screeners dial in can ever fill. Their shift (9pm–3am Bangladesh) is
   **8am–2pm Pacific**, becoming **7am–1pm** after the November clock change. Build ten, expect six.
2. The tag records **when a human answered**, not when we dialled.
3. `PT 06-07` is 6am in California — the local-time rule in §3 is what stops that.

Written two ways by the same automation, because Kevin filters in two places:

- **follower** `PT 10-11` on the opportunity — the only filter the opportunity board has;
- **tag** `screened-pt-10-11` on the contact — for Smart Lists, WAVV and reporting.

**Replace, never append.** On a re-screen, remove the old block follower *and* tag first
(*Remove follower(s) from opportunity* exists — verified). Otherwise a lead sits in two blocks at
once and Kevin's list quietly fills with people who answer at another hour. Also note the
**10-follower cap** per record, and that two are already spent by the TZ and line-type workflows.

---

## 7. Kevin's call list

- **Opportunity board:** Advanced filters → `Follower = PT 10-11`. That is the whole query —
  everything on his board is already owner-verified.
- **Contact Smart List** (what WAVV dials): `tag = owner-confirmed` **AND** `tag = screened-pt-10-11`.
- **Gold:** add `tag = screen-busy`. Kevin takes those himself; quiet ones go to future closers (~43:26).

**Freshness is enforced by n8n, not by a filter.** The contact filter's operators for a custom
field are only *Is / Is not / Is empty / Is not empty* — there is no "in the last 14 days"
(verified). So the daily sweep **removes** `owner-confirmed`, the block tag and the block follower
when `Date Screened` is older than 14 days. The lead simply falls out of every list, and the
opportunity board stays correct too.

---

## 8. Graduation, and the re-screen trap

On **Owner Verified** only:

1. remove tag `screening`, clear the screener as Owner;
2. set `owner-confirmed`, block tag, block follower, `Date Screened`;
3. create the opportunity in **Kevin's** pipeline by today's rule from `Import Contact To New`:
   no email → Cold Call Pipeline `Day 1 Call A` (`060f44a8-…`); has email → Client Acquisition
   `New` (`f6aa7e0f-…`);
4. sweep any leftover `wavv-*` tag (belt and braces — Branch B should already have).

**`Import Contact To New` changes:** new `plumber` contacts go to the screener pipeline with
`screening` + an assigned screener, and do **not** create a Kevin opportunity. Screening becomes
the front door; Kevin's machine is untouched and gets a better feed.

**The re-screen trap:** re-adding `screening` to a lead that is mid-cadence would silently switch
**off** Kevin's automations for it. Rule: **only re-screen a lead with no open opportunity in
Kevin's pipelines.**

---

## 9. What gets built, in order, with acceptance tests

| Phase | Work | Done when |
|---|---|---|
| **0 — Isolation** | the 4 GHL If/Else branches, 2 n8n filters, `screening` tag | On a tagged test contact: a real WAVV call, a disposition and a no-answer each produce **no** opportunity move, **no** email, **no** `last_call_missed` — and the `wavv-*` tags are still cleaned up |
| **0b — Seats** | buy the 2nd WAVV seat; two people dial the same GHL account at once | Both dial simultaneously without breaking the demo connection (Mahir expects "a few hours of fixing", ~53:11) |
| **1 — Container** | pipeline + 8 stages, 4 custom fields, tags, 2 screener users, 8 block users, numbers, recording + transcription on, WAVV `S:` dispositions | A screener can open their Smart List and dial; a test call writes a note we can read |
| **2 — Capture + AI** | n8n 1–3 (below) | 20 role-played calls land in the right stage with the right tags; mismatches flag |
| **3 — Output** | n8n 4–5, Kevin's board filter + Smart Lists, `screen_log` | Kevin filters `Follower = PT 10-11` and sees only fresh owner-verified leads |
| **4 — Measure** | listen to the first 50 real calls against the AI verdicts | Accuracy known per screener; only then tune prompts or change the model |

### The n8n workflows

| # | Name | Trigger | Does |
|---|---|---|---|
| 1 | `Screener: Capture Call` | `/webhook/screener-call` | transcript + timestamp + recording + `userId`; dedupe on `call_id` |
| 2 | `Screener: Classify + Mark` | after 1, and `/webhook/screener-disposition` | AI verdict → cross-check → fields, tags, block tag + follower, stage move, `Date Screened` |
| 3 | `Screener: No Answer` | `/webhook/screener-no-answer` | `Screen Attempts` +1 → move to Attempt N (or park at 4) |
| 4 | `Screener: Graduate` | stage = Owner Verified | §8 |
| 5 | `Screener: Stale Sweep` | daily cron | `Date Screened` > 14 days **and no open Kevin opportunity** → strip `owner-confirmed` + block tag + block follower → back to To Screen with `screening` re-added |
| 6 | `screen_log` leaf | on 2 and 3 | date, contact, screener, attempt, `S:` disposition, busy/quiet, AI verdict, match, block, duration |

> **Priority:** Kevin called the list/ICP work first and the screener second (~62:53). Build
> alongside; do not let this push the list back.

---

## 10. Who does what

| Person | Owns |
|---|---|
| **Ridoy** | the 4 guard edits, pipeline, fields, tags, users, numbers, Smart Lists, Kevin's board filter |
| **Mohimenul** | n8n 1–6, the AI prompt and its accuracy report |
| **WAVV account owner** | the `S:` dispositions (the Add button is disabled for the current login), the 2nd seat |
| **Kevin** | §11, and the first 50-call review |

---

## 11. Only Kevin can decide

Settled and built in: 4 attempts · the 8 stages · pipeline at the top · busy-or-quiet the only
extra mark · screened-out leads get nothing · "septic pumping" script · 14-day freshness ·
tags **and** followers · no round-robin (n8n splits).

1. **Recording in CA / WA / NV** (all-party consent). *Recommendation:* screener opens with "quick
   recorded call" — it keeps the AI cross-check everywhere. Alternative: no recording there, and
   those calls rely on the screener's marks alone.
2. **8 block users appear in assignment dropdowns.** *Recommendation:* accept — the account already
   has 7 label-users.
3. **Leads already in Kevin's pipelines.** *Recommendation:* leave them; screen only new imports
   until the loop is proven, then back-fill the ones not in an active cadence.
4. **Male/female and "sounds like an owner"** stay dropped unless week one shows people faking
   being the owner (~42:38).

---

## 12. Verification log — 2026-09-22, live account

| Claim | How checked | Result |
|---|---|---|
| Recorded-call webhook identifies the user | live `Call Recorded Trigger` | ✅ `userId`, `callerId`, `teamId` |
| No-answer path carries no caller identity | live `Call No Answer` | ✅ confirmed |
| Blocking `Call No Answer` entirely breaks attempt counting | its step order + GHL "tag added" semantics | ⚠️ yes — hence the mid-workflow branch |
| GHL If/Else can branch on a tag | live workflows already do it | ✅ |
| Opportunity board filters: followers yes, tags no | opened Advanced filters | ✅ Owner, Followers, Status, Stage, Source, dates, value only |
| Contact Smart List filters | opened Filters panel | ✅ Tag, Owner, **Opportunity pipeline**, **Opportunity stage**, all custom fields |
| Custom-field date filter has no "last N days" | opened the operator list on a date field | ⚠️ only *Is / Is not / Is empty / Is not empty* → freshness moves to the n8n sweep |
| *Add / Remove follower(s) to opportunity* actions | action picker (draft workflow) | ✅ both exist |
| *Assign to user* / *Remove assigned user* | same | ✅ |
| Round-robin action | searched the picker | ❌ does not exist |
| Follower cap | HighLevel docs | ⚠️ 10 per record |
| Account already uses label-users | Settings → My Staff | ✅ 7 of 8 users are labels — and all are `ACCOUNT-ADMIN` |
| WAVV auto-dispositions unanswered calls | WAVV docs | ✅ No Answer / Voicemail / Bad Number, no prompt |
| Closing the modal with no pick is detectable | WAVV docs + live list | ✅ `[System] None` → `wavv-none` |
| **WAVV disposition list** | WAVV Manager → Settings → Call Dispositions | ⚠️ **14 user dispositions live.** `Cold Bad`, `Cold On Hold`, `Appointment Booked`, `Not Interested Right Now Good/Bad` are **absent** — the caller manual documents five dispositions the dialer cannot produce |
| Adding new WAVV dispositions | same page | ⚠️ **"Add New Disposition" is disabled for this login** — needs the WAVV account owner |
| Two WAVV seats dialing one GHL account | not testable without the seat | ❓ **blocked** — Phase 0b |

### If a blocked item goes badly

- **WAVV won't take the `S:` dispositions** → the screener marks two dropdown custom fields on the
  contact instead (~10s per call, weaker enforcement). Nothing else changes.
- **Two seats can't dial one GHL account** → screeners move to a **separate GHL sub-account** and
  the tagger matches back by phone number. This is the only failure that reshapes the build, which
  is why it is tested in Phase 0b, before anything is built on top.

---

## 13. Risks

- **The guard is the system.** One missed branch = a real cold email to a lead Kevin has never
  spoken to. All four paths get tested in Phase 0.
- **Stacked block followers** corrupt Kevin's list silently — the list still looks full.
- **Busy/quiet is the only irreplaceable human mark.** If screeners get lazy, the gold list is
  worthless; the `screen-mismatch` queue is what makes that visible.
- **The shared WAVV disposition list** — anyone adding a screener disposition without the `S:`
  prefix routes screener calls into Kevin's Cold Handler.
- **The five missing dispositions** (above) are a live gap in Kevin's *existing* system, not this
  one, but they will confuse anyone reading the caller manual. Worth fixing in the same WAVV session.
- **An empty To Screen stage is a signal, not a failure** — it means buy more leads (~54:31). Put
  the count in the daily summary.
