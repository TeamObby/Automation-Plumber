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

## Build status — 2026-09-22

> **For Mohimenul:** everything in **✅ Built** exists in the live GHL account right now, with the
> real IDs below — you can code against them today. Your half (n8n + the AI tagger) is untouched
> and listed under **Mohimenul's part**.

### ✅ Built (Hridoy's half, done by Claude)

**Pipeline `Screener — Plumbers`** — `CvDwpavqkHSRhg5Bn3L4`

| # | Stage | Stage ID |
|---|---|---|
| 1 | Attempt 1 | `7ff9193f-1e0a-4c93-9626-a6aab22b666b` |
| 2 | Attempt 2 | `d3d8862e-bc2e-443f-97e6-f77e577ac09e` |
| 3 | Attempt 3 | `abb54fb0-dbfc-44d9-aa21-796b91b7540b` |
| 4 | Attempt 4 | `ec53d2ba-8322-45d6-9d60-283cc4fc016e` |
| 5 | Owner Verified | `c8e33d9d-fd1b-46f6-87a6-7cc47841642f` |
| 6 | Gatekeeper | `f83777fa-1dc0-4163-aa84-ef501126d82b` |
| 7 | Not Sure | `0c160182-e74d-4ace-9d3b-c4404043ef4b` |
| 8 | Exhausted | `c1db8172-84bf-45a1-8f0e-5625157574a5` |
| 9 | Disqualified | `65f9e1b4-8688-456d-845e-ebe0781101b9` |

**Custom fields** — all on the **Contact** object, in a new folder **`Screener`**

| Field | ID | Key | Type |
|---|---|---|---|
| Screener Outcome | `iTZa77JWntQs2QBuo9QU` | `contact.screener_outcome` | SINGLE_OPTIONS |
| Date Screened | `MUkHW8R17PIksrSnpz6g` | `contact.date_screened` | DATE |
| Screen Attempts | `vcqKnq23gN5wIIHqRww4` | `contact.screen_attempts` | NUMERICAL |
| Screen Noise | `AbbR6jH9PFMLJCRdCqMp` | `contact.screen_noise` | TEXT |
| Screen AI Verdict | `boOwqb5qGOmbWBopWvTv` | `contact.screen_ai_verdict` | LARGE_TEXT |

**`Screener Outcome` options — copy these strings exactly** (plain hyphen, not an en dash):

`Owner - Busy` · `Owner - Quiet` · `Gatekeeper` · `Not Sure` · `Wrong Number` ·
`Not A Plumber` · `Do Not Call`

**Tags (17)** — `screening` · `owner-confirmed` · `screen-busy` · `screen-quiet` ·
`screen-mismatch` · `screener-a` · `screener-b` · `screened-pt-06-07` … `screened-pt-15-16`

### ⬜ Not built, and why

| Item | Why it stopped | Who unblocks it |
|---|---|---|
| **2 screener users + 8 block users** | Creating a GHL user sends a real invite email, and I have no addresses to use. The existing label-users follow a pattern (`pacific@gmail.com`, `alaska@gmail.com`…) — pick the same style. Make them `ACCOUNT-USER`, role **Only Assigned Data**, never admin | Hridoy |
| **Smart Lists** | The filter UI needs the users to exist (screener queues), and the tag-value picker is awkward to drive reliably. Recipe below — about 30 seconds each by hand | Hridoy |
| **The four guard edits** (§1) | Deliberately **not** done unattended. These edit workflows that run Kevin's live campaign; a wrong branch sends a real cold email to a lead he has never spoken to. Do them together, one at a time, each verified on a `screening`-tagged test contact | Hridoy + Claude |
| **WAVV: 2nd/3rd seat, screener numbers** | Costs money; `Seats Used: 1/1` | Kevin |
| **Team dispositions decision** (§2.5) | Needs the seats before it can be tested | Kevin + Hridoy |

**Smart List recipe** (Contacts → Filters → set → Save as Smart List):

- *Kevin, per block:* `Tag` is `owner-confirmed` **AND** `Tag` is `screened-pt-10-11` → save as
  "Kevin — Owner @ PT 10-11", then clone for each block.
- *Gold:* the same plus `Tag` is `screen-busy`.
- *Each screener:* `Opportunity pipeline` is `Screener — Plumbers` **AND** `Opportunity stage` is
  `Attempt 1/2/3/4` **AND** `Owner` is that screener.
- ⚠️ UI quirk: the box next to the field name is the **operator** ("Is"); the value picker is the
  separate "Please select" box to its right. Typing the tag into the wrong one leaves
  "Value cannot be empty".

### Mohimenul's part — unchanged and unblocked

Nothing of the n8n half has been built, by design (§10.2). You can start now:

1. The **stage and field IDs above** are real — no mocking needed for the write-back.
2. For the **inbound** side, mock the payload: copy the `customData` list from the live
   `Call Recorded Trigger` in [`ghl-automations.md`](ghl-automations.md) and POST it to your
   webhook by hand. Hridoy wires the real GHL triggers when the guards go in.
3. Build the six workflows in §9. Keep them **inactive** until the guards exist — until then a
   screener call would still reach Kevin's automations.
4. The compare step (§4.1) is shared by two paths — build it once as a sub-workflow.

---

## 0. Does this match what Kevin asked for?

Checked line by line against the 2026-09-22 meeting. **Everything he asked for is in, in the form
he asked for it** — with four deliberate deviations, all listed at the bottom.

| Kevin asked (timestamp) | Where it lives | Match |
|---|---|---|
| Screener calls first with the septic-pumping script (~23:34, ~59:59) | §3, unchanged wording | exact |
| Owner / gatekeeper / **not sure** — the third option he added after Mohimenul's objection (~44:12) | §2.5 dropdown, stages 6–8 | exact |
| Background noise = busy owner = highest-value contact (~24:32, ~43:20) | `Owner - Busy` / `Owner - Quiet`, `screen-busy` tag, Gold list | exact |
| Drop male/female and "sounds like an owner" (~43:41) | not built | exact |
| "We have to create a custom field… it can't be empty" (~41:45) | §2.5 `Screener Outcome` | exact — and this is why the mark is a field, not a WAVV disposition |
| Tag the **hour** the owner was reached, always Pacific (~24:47, ~34:07) | §6, ten blocks | exact |
| Date screened, stale after two weeks (~25:20) | `Date Screened`, 14-day sweep | exact |
| **Followers** so he can filter (~33:55, ~45:01, ~57:25) | §5/§6 — follower per block on the opportunity | exact (plus tags, see deviations) |
| Filter on the **opportunity** (~24:25) | §7 board filter | exact — and verified it is the only filter the board has |
| Separate pipeline: Attempt 1–4, owner verified, gatekeeper, not sure (~56:33) | §2.1 | exact, plus two terminal stages (see deviations) |
| Pipeline pinned to the top so nobody mis-clicks (~57:13) | §2.1 | exact |
| Screener must not reach his pipeline (~48:42) | Only Assigned Data + `screening` guard | exact |
| Stage moves automatically from their selection (~56:51) | §9 event 2 | exact |
| AI cross-checks and flags disagreement (~44:34, ~57:43) | §4.3 | exact |
| Two WAVV seats, screener's own numbers, faster rotation (~47:42) | §5 | exact |
| Nothing traceable back to us; screened-out leads get nothing (~46:44, ~47:26) | §3 conduct, terminal stages | exact |
| Stop using mobile-phone-type as the filter (~45:08) | see deviations | noted |
| List/ICP work is the higher priority (~62:53) | §9 priority note | exact |

### The four places I went beyond him

1. **Two terminal stages he did not list — "Exhausted" and "Disqualified."** Stages mean the call
   *due* (his existing convention), so a lead must leave the ladder when its four attempts run out,
   and the dead-end outcomes (wrong number, not a plumber, do-not-call) need somewhere to rest.
   Without them, dead numbers stay in the dialling queue forever.
2. **Tags as well as followers** — he asked for followers, which only work on the opportunity
   board. Tags are what the contact Smart List and WAVV dialling lists can filter on, so both get
   written. His filter works either way; nothing is taken away.
3. **No follower for "owner verified"** — he described one (~54:19), but only graduated leads ever
   get an opportunity in his pipelines, so the block follower already implies it. *If he wants the
   explicit filter anyway, add one `Owner Verified` label-user; it is one extra node.*
4. **The screener dismisses WAVV's disposition modal** (§3) — he never covered what the screener
   does with the menu that pops up after every answered call. Their mark is the field.

Also worth telling him: he said he will stop filtering by **mobile phone type** (~45:08). The
`Copy - Final - Add Timezone Followers` workflow still adds a line-type follower to every
opportunity, spending one of the ten follower slots per record. It can be switched off once the
screener data replaces it.

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
| **Capture Wavv Disposition** `d5e8da04-4b4b-4eef-87c3-189cfbba34bd` | on **Branch A only**; **Branch B (wavv-tag cleanup) runs for everyone** | POST `/webhook/screener-disposition` with `{{note.body}}` — **load-bearing**: this is the only path that carries WAVV's **auto**-dispositions (`Voicemail`, `Bad Number`), which nothing else listens to | Branch A writes **Call Disposition** → Dispatcher → Cold/Gatekeeper Handler → moves the opp, sends the next cold email, sets Stop Phone Calls |
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

**A stage is the call that is due, not the call that happened** — the same convention as the
existing cold pipeline, where `Day 1 Call A` means *this* is the call to make next. So a freshly
imported lead starts in **Attempt 1**, and there is no separate "to screen" stage.

| # | Stage | Meaning |
|---|---|---|
| 1 | **Attempt 1** | imported, first call due |
| 2 | **Attempt 2** | one dial, nobody reached — second call due |
| 3 | **Attempt 3** | second call due failed — third due |
| 4 | **Attempt 4** | last call due |
| 5 | **Owner Verified** | the only exit into Kevin's machine |
| 6 | **Gatekeeper** | a human answered, not the owner |
| 7 | **Not Sure** | human answered, owner unclear; also where AI/screener disagreements land |
| 8 | **Exhausted** | four dials, never reached a human |
| 9 | **Disqualified** | wrong number, not a plumber, do-not-call |

**The dialling queue is stages 1–4.** Everything below is terminal, and only **Owner Verified**
leaves the pipeline.

Kevin's list (~56:33) was "Attempt 1, 2, 3, maybe 4. Owner verified, gatekeeper, not sure." The
last two stages are mine: with *due* semantics a lead has to leave the ladder when it runs out of
attempts (**Exhausted**), and the three dead-end outcomes the screener can pick need somewhere to
rest (**Disqualified**) — otherwise dead numbers stay in the queue and get dialled forever.

### 2.2 Custom fields (contact)

| Field | Type | Written by | Used for |
|---|---|---|---|
| **`Screener Outcome`** | **single-select dropdown** | **the screener** | the only thing a human types; also the webhook trigger (§2.5) |
| `Date Screened` | DATE | n8n | freshness |
| `Screen Attempts` | NUMBER | n8n | dials made so far (0–4); drives the stage |
| `Screen Noise` | TEXT (`busy` / `quiet`) | n8n | derived from the outcome, for the gold list |
| `Screen AI Verdict` | TEXT | n8n | where the AI parks its verdict so it can meet the screener's mark (§4.1) |

### 2.3 Tags

`screening` · `owner-confirmed` · `screened-pt-06-07` … `screened-pt-15-16` ·
`screen-busy` · `screen-quiet` · `screen-mismatch` · `screener-a` / `screener-b`

### 2.4 Users

- **2 screener users** — role **Only Assigned Data**, `ACCOUNT-USER` (not admin).
- **8 block label-users** — `PT 06-07` … `PT 15-16`, plain users, **no admin rights**.
  This is an existing pattern here: 7 of the account's 8 users are already label-users
  (PT/CT/ET/AT/HT, PhoneType ×2) — see §12.
  ⚠️ Those existing 7 are all `ACCOUNT-ADMIN`, which is worth downgrading while we are in there.

### 2.5 The screener's mark: **a GHL custom field, not a WAVV disposition**

**Field `Screener Outcome`** — contact, single-select dropdown, options:

`Owner - Busy` · `Owner - Quiet` · `Gatekeeper` · `Not Sure` · `Wrong Number` ·
`Not A Plumber` · `Do Not Call`

One pick per answered call. Unanswered calls need no mark at all — WAVV auto-dispositions those
(`[System] No Answer`, `Voicemail`, `Bad Number`) and the Attempt ladder runs off that tag (§1).

#### Why not WAVV dispositions

The first draft of this spec used `S:`-namespaced WAVV dispositions. Four reasons it is wrong:

1. **A call has one disposition.** The screener must record *two* facts — who answered **and**
   busy/quiet. That needs combinatorial entries (`S: Owner – Busy`, `S: Owner – Quiet`, …) or a
   second click that WAVV does not offer. One dropdown holds both cleanly.
2. **We cannot create them.** "Add New Disposition" is **disabled** for the current login (§12);
   it needs the WAVV account owner. The custom field can be created today.
3. **The disposition list is shared with Kevin.** Thirteen `S:` entries would appear in the menu
   he sees after every sales call — one mis-click puts a screener label on a real prospect.
4. **The trigger is already a proven pattern here.** "Contact Changed → `Screener Outcome` has
   changed → webhook" is exactly how `Manual Review Items Changed` and `Call Disposition OR Note
   Updated` already work in this account. No note parsing, no tag round-trip.

#### The upgrade path: WAVV team dispositions (checked in the agency account)

In **agency → WAVV Admin → Call Dispositions** everything is editable (the sub-account view is
read-only), and there is a switch: **"Team Dispositions — allow custom dispositions at the team
level"**, currently **off**. WAVV's Team page already has **Groups** (`All Members`, `Ungrouped`,
`Group_1`), so the mechanism a screener group would use exists.

If that switch does what its label says, the screeners could get **their own disposition list**
on their own group — no `S:` prefix, nothing added to the menu Kevin sees, and the modal pops up
by itself so the mark cannot be forgotten. That would beat the custom field on enforcement.

**Why it is not the plan today:** WAVV shows **Seats Used: 1/1** — the screener seats do not exist
yet, so a group-scoped list cannot be tested, and the switch is agency-wide (it would touch
Kevin's dialer too). Decide after the seats are bought:

- if team dispositions work per group → move the **outcome** into the dialer modal and keep the
  field for busy/quiet (or use combined options and retire the field);
- if not → the field stays exactly as specified. Nothing else in the plan changes either way.

**What we give up:** WAVV's modal pops up by itself; a custom field does not, so the habit is not
forced. Covered by the cross-check (a missing mark → **Not Sure** + `screen-mismatch`) and by a
daily count of answered-but-unmarked calls per screener.

**Unchanged:** WAVV still owns unanswered calls, so no WAVV admin work is needed to start.
Worth doing separately: Kevin's own disposition list is missing five entries the caller manual
documents (§12) — a real bug in the existing system, for the same WAVV session.

---

## 3. What the screener does, per call

**Answered call → one pick** in the `Screener Outcome` dropdown on the contact:
`Owner - Busy`, `Owner - Quiet`, `Gatekeeper`, `Not Sure`, `Wrong Number`, `Not A Plumber`,
`Do Not Call`.

**Unanswered call → nothing.** WAVV auto-dispositions it (`No Answer`, `Voicemail`, `Bad Number`)
and the system counts the attempt by itself.

**The WAVV disposition modal still pops up after an answered call**, showing *Kevin's* 14
dispositions. Screeners **dismiss it** — that writes `wavv-none`, which is harmless because the
guard (§1) stops it reaching Kevin's automations. Their mark is the `Screener Outcome` field, not
that menu.

That is the entire job. Kevin narrowed it to this himself (~43:41) after dropping male/female and
"sounds like an owner". Busy/quiet stays because no machine can hear it, and it is what marks the
gold list — a noisy background means the owner is in a truck, working, worth 2–3× (~43:20).

**Call conduct** — *"the screener cannot be connected to anything that comes back to us"* (~46:44):
never leave a voicemail · never name Obby or WaterLine · no demo, no selling · never dial outside
**8am–9pm in the lead's own local time** (the `TZ` field gates the list) · if asked to be removed,
pick `Do Not Call` and stop.

---

## 4. What the AI does

Mohimenul's tagger reads the transcript and returns `call_outcome`, `owner_reached`, `confidence`,
`evidence_quote`, `owner_name`. The split (Hridoy, ~59:05): **transcript-readable facts are the
AI's; ear-only facts are the screener's.** Nobody is asked twice for the same thing.

### 4.1 The two marks arrive at different times

The AI verdict comes from the **recorded call** (seconds after hang-up). The screener's pick comes
from a **field change** (whenever they get to it). Neither can wait for the other, so:

- whichever arrives first is written to the contact — the AI to `Screen AI Verdict`, the screener
  to `Screener Outcome`;
- **both paths end in the same compare step**, which runs only when both values are present;
- if the screener's mark is still missing when the next call to that contact starts, the compare
  runs anyway with "nothing marked" and the contact lands in **Not Sure** + `screen-mismatch`.

This is why the verdict needs its own field rather than living inside one workflow run.

### Cross-check — the screener's mark wins, the AI catches mistakes

| Screener | AI | Result |
|---|---|---|
| `Owner - Busy` / `Owner - Quiet` | owner reached | **Owner Verified** |
| `Gatekeeper` | not the owner | **Gatekeeper** |
| `Owner - …` | not the owner / unclear / low confidence | **Not Sure** + `screen-mismatch` |
| `Gatekeeper` or `Not Sure` | owner reached | **Not Sure** + `screen-mismatch` |
| nothing marked | anything | **Not Sure** + `screen-mismatch` |

Exactly Kevin's ask at ~57:43. The per-screener mismatch rate is also the fairest quality measure
we will have — which matters with two of them.

---

## 5. Two screeners

**One pipeline, split by owner** — not two pipelines.

| Layer | Mechanism |
|---|---|
| Ownership | contact **Owner** = Screener A or B, set by n8n at import; same owner on the screener opportunity |
| Access | role **Only Assigned Data** — neither can open the other's contacts, or Kevin's |
| Daily queue | Smart List: `Opportunity pipeline = Screener — Plumbers` **AND** `Opportunity stage = Attempt 1 / 2 / 3 / 4` **AND** `Owner = me` ✅ all three filters verified |
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
| **1 — Container** | pipeline + 9 stages, 4 custom fields, tags, `Screener Outcome` dropdown, 2 screener users, 8 block users, numbers, recording + transcription on | A screener can open their Smart List and dial; a test call writes a note we can read |
| **2 — Capture + AI** | n8n 1–3 | 20 role-played calls land in the right stage; a call where the screener marks **before** the AI finishes, and one where they mark **after**, both end in the same place; a voicemail bumps the attempt |
| **3 — Output** | n8n 4–5, Kevin's board filter + Smart Lists, `screen_log` | Kevin filters `Follower = PT 10-11` and sees only fresh owner-verified leads |
| **4 — Measure** | listen to the first 50 real calls against the AI verdicts | Accuracy known per screener; only then tune prompts or change the model |

### Every inbound event, and what handles it

| # | Event in GHL | Webhook | n8n does |
|---|---|---|---|
| 1 | call recorded (answered) | `/webhook/screener-call` | store transcript + timestamp + recording + `userId`, dedupe on `call_id`, run the AI → write `Screen AI Verdict` → compare (§4.1) |
| 2 | **`Screener Outcome` changed** (the screener's pick) | `/webhook/screener-outcome` | write `Screen Noise`, compare with `Screen AI Verdict` → stage, tags, block tag + follower, `Date Screened` |
| 3 | tag `wavv-no-answer` / `wavv-canceled` | `/webhook/screener-no-answer` | `Screen Attempts` +1 → next Attempt stage; after the 4th dial → **Exhausted** |
| 4 | WAVV note with an **auto**-disposition (`Voicemail`, `Bad Number`) | `/webhook/screener-disposition` | `Voicemail` → attempt +1; `Bad Number` → **Disqualified** |

⚠️ **Event 4 is not optional.** WAVV tags a voicemail `wavv-voicemail`, and **no GHL workflow
listens to that tag** — `Call No Answer` only fires on `wavv-no-answer` / `wavv-canceled`. Without
the note path, a voicemail dial would never count as an attempt and the lead would sit in the same
Attempt stage forever.

### The n8n workflows

| # | Name | Fed by | Does |
|---|---|---|---|
| 1 | `Screener: Capture Call` | event 1 | transcript, AI verdict, `Screen AI Verdict`, then compare |
| 2 | `Screener: Mark + Compare` | event 2 | the shared compare step → stage, tags, follower, `Date Screened` |
| 3 | `Screener: Attempt Counter` | events 3 and 4 | `Screen Attempts` +1 → next Attempt stage or **Exhausted**; `Bad Number` → **Disqualified** |
| 4 | `Screener: Graduate` | stage = Owner Verified | §8 |
| 5 | `Screener: Stale Sweep` | daily cron | `Date Screened` > 14 days **and no open Kevin opportunity** → strip `owner-confirmed` + block tag + block follower → back to **Attempt 1** with `screening` re-added |
| 6 | `screen_log` leaf | on 1, 2, 3 | date, contact, screener, attempt, `Screener Outcome`, busy/quiet, AI verdict, match, block, duration |

Workflows 1 and 2 share one compare step — build it once as a sub-workflow and call it from both,
or the two paths will drift apart.

> **Priority:** Kevin called the list/ICP work first and the screener second (~62:53). Build
> alongside; do not let this push the list back.

---

## 10. Dividing the work between Hridoy and Mohimenul

**Split by system boundary, not by phase.** One person owns everything inside GHL/WAVV, the other
owns everything inside n8n. They meet at a written contract (§10.3), so neither has to wait for
the other to start.

### 10.1 Hridoy — GHL and WAVV

| Order | Task | Done when |
|---|---|---|
| 1 | **The four guard branches** (§1) + `screening` tag | a tagged test contact survives a real WAVV call, a disposition and a no-answer with **no** opp move, **no** email, **no** `last_call_missed`, and `wavv-*` tags still cleaned |
| 2 | Pipeline + 9 stages, pinned to the top | stage IDs handed to Mohimenul (§10.3) |
| 3 | the `Screener Outcome` **dropdown** (exact option spellings), the other 4 fields, all tags | field IDs + option strings handed over |
| 4 | 2 screener users (Only Assigned Data, **not** admin), 8 block users | screener can log in and see only their own list |
| 5 | Numbers per screener, recording + transcription on, Trust Hub registration | a test call produces a recording and a transcript |
| 6 | The GHL workflows that POST to Mohimenul's 4 webhooks — including the new **Contact Changed → `Screener Outcome`** one | he sees real payloads for all four events |
| 7 | Kevin's board filter + the block Smart Lists | Kevin can filter `Follower = PT 10-11` |

Then Hridoy moves to the **list/ICP work**, which is Kevin's actual first priority (~62:53).

### 10.2 Mohimenul — n8n and the AI

| Order | Task | Done when |
|---|---|---|
| 1 | `Screener: Capture Call` + dedupe on `call_id` | a mock payload lands and is stored |
| 2 | The classifier: prompt, strict JSON schema, 8 hand-written transcripts | verdicts are stable on the test set |
| 3 | Pacific hour-block computation | a UTC timestamp maps to the right `PT xx-xx` |
| 4 | `Screener: Classify + Mark` — cross-check, fields, tags, follower, stage move | 20 role-played calls land in the right stage |
| 5 | `Screener: No Answer` — attempt counter and ladder | four no-answers walk a contact to Attempt 4 |
| 6 | `Screener: Graduate` (§8) | a graduated lead appears correctly in Kevin's pipeline |
| 7 | `Screener: Stale Sweep` + `screen_log` + daily summary | a 15-day-old lead drops out of Kevin's list by itself |
| 8 | Accuracy report on the first 50 real calls | per-screener mismatch rate known |

**Mohimenul is not blocked by Hridoy.** Items 1–3 are built against a **mock payload** — copy the
`customData` list from the live `Call Recorded Trigger` (see [`ghl-automations.md`](ghl-automations.md))
and post it by hand. Only item 4 onwards needs the real fields and stage IDs.

### 10.3 The contract between them — agree this before either starts

One short doc or Slack message, filled in by Hridoy, consumed by Mohimenul:

| Thing | Who provides | Example |
|---|---|---|
| Webhook paths (all four, §9) | Mohimenul | `/webhook/screener-call`, `/webhook/screener-outcome`, `/webhook/screener-no-answer`, `/webhook/screener-disposition` |
| Payload body for each | Mohimenul specifies, Hridoy wires | `contact_id`, `call_id`, `ghl_user_id`, timestamp, transcript, recording URL; for the outcome event: `contact_id` + the new `Screener Outcome` value |
| Pipeline + 9 stage IDs | Hridoy | `Owner Verified = …` |
| 4 custom field IDs | Hridoy | `Date Screened = …` |
| Exact tag spellings **and dropdown option strings** | both agree once | `screened-pt-10-11` not `screened_pt_10_11`; `Owner - Busy` with a plain hyphen (this is what was created) — n8n compares these literally |
| Screener user IDs + block user IDs | Hridoy | for the guards and the follower writes |
| A test contact that may be tagged repeatedly | Hridoy | — |

Names are the classic place two people silently disagree; fix the spelling **before** anyone
writes code against it.

### 10.4 Shared, and who chases it

| Item | Owner | Note |
|---|---|---|
| The five dispositions missing from Kevin's own WAVV list | **Kevin / WAVV account owner** | not a screener blocker any more (§2.5), but a real bug in the existing system |
| 2nd WAVV seat + two seats dialling one GHL account | **Hridoy with Mahir** | Phase 0b — the only unknown that could reshape the build |
| Decisions in §11 | **Kevin** | recording policy is the one that blocks Phase 2 |
| First 50-call review | **Kevin + Mohimenul** | — |

### 10.5 How to work in parallel without collisions

- **One joint session, 30 minutes, at the end of Phase 1:** fire one real screener call and watch
  it travel — GHL trigger → webhook → n8n → tag on the contact. Everything after that is tuning.
- **Daily 15 minutes** while both are building, to sync contract changes.
- **Repo discipline:** both edit this repo, so pull before you start, and keep each workflow's
  `context.md` updated in the same commit as its `.json`. Hridoy also updates
  [`ghl-automations.md`](ghl-automations.md) whenever he changes a GHL workflow — that file is the
  only record of the GHL side.
- **Nobody edits the other's system.** If Mohimenul needs a GHL change, he asks; if Hridoy needs an
  n8n change, he asks. The guards especially: a half-applied guard is worse than none.

---

## 11. Only Kevin can decide

Settled and built in: 4 attempts · the 9 stages · pipeline at the top · busy-or-quiet the only
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
| **WAVV disposition list** | sub-account WAVV Manager → Settings → Call Dispositions | ⚠️ **14 user dispositions live.** `Cold Bad`, `Cold On Hold`, `Appointment Booked`, `Not Interested Right Now Good/Bad` are **absent** — the caller manual documents five dispositions the dialer cannot produce |
| Adding new WAVV dispositions | agency → **WAVV Admin** → Call Dispositions | ✅ fully editable there (read-only in the sub-account) |
| "Team Dispositions — allow custom dispositions at the team level" | same page | ✅ exists, currently **off**; WAVV Groups exist (`Group_1`) — the upgrade path in §2.5 |
| WAVV seats in use | WAVV Manager → Team | ⚠️ **1/1** — a seat per screener must be bought before anything can be tested |
| No GHL workflow listens to `wavv-voicemail` | read every live workflow's trigger | ⚠️ true — hence event 4 in §9 |
| Two WAVV seats dialing one GHL account | not testable without the seat | ❓ **blocked** — Phase 0b |

### If a blocked item goes badly

- ~~WAVV won't take the `S:` dispositions~~ → resolved: the mark is a GHL custom field (§2.5), so
  no WAVV admin work is needed to start.
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
- **Do not add screener options to the WAVV disposition list** (§2.5). It is shared with Kevin's
  dialer, and an entry there routes screener calls into his Cold Handler.
- **The five missing dispositions** (above) are a live gap in Kevin's *existing* system, not this
  one, but they will confuse anyone reading the caller manual. Worth fixing in the same WAVV session.
- **An empty Attempt 1 stage is a signal, not a failure** — it means buy more leads (~54:31). Put
  the count in the daily summary.
