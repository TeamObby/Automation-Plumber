# Screener build — pick-up-here notes

**Purpose:** everything a fresh session (or teammate) needs to continue the screener build without
re-deriving it. Written 2026-09-23. Full design: [`screener-system-plan.md`](screener-system-plan.md).
GHL side of the existing campaign: [`ghl-automations.md`](ghl-automations.md). Repo map: [`AGENTS.md`](../AGENTS.md).

---

## 1. Where it stands in one paragraph

The **GHL container is built** (pipeline, stages, fields, tags, 10 block users, test rig) and
**Mohimenul's n8n items 1–3 are built** (capture + dedupe, AI classifier + eval, Pacific hour
block). The **guards are not in yet**, so no screener call may be made and Mohimenul's workflows
stay **inactive**. The immediate critical path is: guards → publish `Screener Outcome Changed` →
Mohimenul's item 4 → one real test call.

---

## 2. Live IDs

**Location** `rzaMhqeo2apNI1p6DG5z` · **Pipeline `Screener — Plumbers`** `CvDwpavqkHSRhg5Bn3L4`

| Stage | ID |
|---|---|
| Attempt 1 | `7ff9193f-1e0a-4c93-9626-a6aab22b666b` |
| Attempt 2 | `d3d8862e-bc2e-443f-97e6-f77e577ac09e` |
| Attempt 3 | `abb54fb0-dbfc-44d9-aa21-796b91b7540b` |
| Attempt 4 | `ec53d2ba-8322-45d6-9d60-283cc4fc016e` |
| Owner Verified | `c8e33d9d-fd1b-46f6-87a6-7cc47841642f` |
| Gatekeeper | `f83777fa-1dc0-4163-aa84-ef501126d82b` |
| Not Sure | `0c160182-e74d-4ace-9d3b-c4404043ef4b` |
| Exhausted | `c1db8172-84bf-45a1-8f0e-5625157574a5` |
| Disqualified | `65f9e1b4-8688-456d-845e-ebe0781101b9` |

**Custom fields** (contact, folder `Screener`)

| Field | ID | Key | Type |
|---|---|---|---|
| Screener Outcome | `iTZa77JWntQs2QBuo9QU` | `contact.screener_outcome` | SINGLE_OPTIONS |
| Date Screened | `MUkHW8R17PIksrSnpz6g` | `contact.date_screened` | DATE |
| Screen Attempts | `vcqKnq23gN5wIIHqRww4` | `contact.screen_attempts` | NUMERICAL |
| Screen Noise | `AbbR6jH9PFMLJCRdCqMp` | `contact.screen_noise` | TEXT |
| Screen AI Verdict | `boOwqb5qGOmbWBopWvTv` | `contact.screen_ai_verdict` | LARGE_TEXT |

**`Screener Outcome` options — copy exactly (plain hyphen):**
`Owner - Busy` · `Owner - Quiet` · `Gatekeeper` · `Not Sure` · `Wrong Number` · `Not A Plumber` · `Do Not Call`

**Tags (17):** `screening` · `owner-confirmed` · `screen-busy` · `screen-quiet` · `screen-mismatch` ·
`screener-a` · `screener-b` · `screened-pt-06-07` … `screened-pt-15-16`

**Hour-block users** (role User, placeholder addresses `ptHHMM@meetobby.com`)

| Block | ID | Block | ID |
|---|---|---|---|
| PT 06-07 | `ZU6NEmag5FFcYAYwtu75` | PT 11-12 | `nTHz8ZbvpMxoWqsyJsLs` |
| PT 07-08 | `QKMhxRVQX45dq2bxF5a5` | PT 12-13 | `u1v0arwCtQw8kr9FSYIT` |
| PT 08-09 | `u24gWdO3FlXhwjwhm6sE` | PT 13-14 | `7KI79ZeuhHa1WrmFSaPH` |
| PT 09-10 | `hdIv63msJcYjhwfIJ4eg` | PT 14-15 | `j5w26gAQTznnaAgqRePi` |
| PT 10-11 | `T4p1bK3yo6Bl14OK1LP3` | PT 15-16 | `QlDlzTUPYag7RxkJ2B5Q` |

**Test rig:** contact **Dana Happy** `2Z5mwZe5RT4NQdNW85vj`, phone **(805) 265-3731** (team Google
Voice), tagged `screening`, opportunity `FAstcBVvrgbpds2gQIV3` in Attempt 1.
⚠️ Same contact is the AI-receptionist demo record (`obby-demo`, `obby-sms`…) — reused because GHL
blocks duplicate phone numbers.

**Workflows**

| Where | Name | ID | State |
|---|---|---|---|
| GHL | `Screener Outcome Changed` | `29535603-03a9-470c-8d98-0cde44df6c04` | **Draft** — publish when n8n item 4 is live |
| GHL | Call Recorded Trigger | `120588ca-915c-4a87-9f7e-ab6ca8b273fc` | live, **needs guard** |
| GHL | Capture Wavv Disposition | `d5e8da04-4b4b-4eef-87c3-189cfbba34bd` | live, **needs guard (Branch A only)** |
| GHL | Call No Answer | `0092952f-83d2-44aa-bd9c-829d350c08ce` | live, **needs guard (mid-workflow)** |
| GHL | Move Leads Into Cadence | `571b33ab-2e83-4b72-8688-7a24f8c67b3b` | live, **needs guard** |
| n8n | Screener: Capture Call | `jQaCWO08lddHg9fN` | inactive by design |
| n8n | Screener: Classify Transcript | `LbGY5ptzldJjnTZJ` | sub-workflow |
| n8n | Screener: Classifier Eval | `FMUXvDBXsigHA4vb` | test harness |
| n8n | Screener: Compare Step | `3pwiQXC8etTcKf5Z` | item 4, sub-workflow — `BLOCK_USER` filled 2026-09-24 |
| n8n | Screener: Mark + Compare | `zVCzfADKZqPWV6hk` | item 4, inactive |
| n8n | Screener: Write-back Retry | `IvxTYaChixQOiNzt` | retries failed GHL writes, inactive |

Webhooks: `/webhook/screener-call` · `/webhook/screener-outcome` · `/webhook/screener-no-answer` ·
`/webhook/screener-disposition`

**Screener log sheet** (2026-09-23, built and empty): "WaterLine — Screener Log"
`1jw-5hnW2VJEoTpC37brncQBxLUIIx2ANjyauXD4raf8` · tab `screen_log` gid `892532160` · `accuracy` gid
`604528574` · bound script "Screener Log Setup"
`1Z3LfH496my3HBQfctuQf1eBuOJayXfk_X9vmlGELSWn6bgI-P3sny2fB` · source
[`metrics/screener-log-sheet-setup.gs`](../metrics/screener-log-sheet-setup.gs). Columns and the data
contract are in [`AGENTS.md`](../AGENTS.md). Separate from Kevin's metrics workbook on purpose.
⚠️ `setupScreenerLog()` **clears** `screen_log` — after live data, only `rebuildAccuracyOnly()`.

---

## 3. What is left, in order

1. **The four guards** (Hridoy + Claude together) — §1 of the plan. Nothing else may go live first.
2. **Publish `Screener Outcome Changed`** once Mohimenul's item 4 exists.
3. **Change `Import Contact To New`** — new `plumber` contacts go to the screener pipeline with
   `screening` and must **not** create a Kevin opportunity.
4. **Smart Lists** — Kevin's ten block lists + Gold; screener queues need the screener users.
5. **Two screener users** — after hiring; role *Only Assigned Data*.
6. **Mohimenul:** item 4 is **built** (Compare Step + Mark + Compare + Write-back Retry) but unproven —
   its "done when" is 20 role-played calls, which needs the guards. Items **5–7 are not built**:
   attempt ladder (`/webhook/screener-no-answer` has no listener), graduate, stale sweep + `screen_log`.
   The ten block-user IDs are in the Compare Step's `Decide` node (2026-09-24); the `screen_log`
   writer is still to build (contract in the plan).
7. **Kevin:** 2nd/3rd WAVV seat + numbers + Trust Hub, recording policy for CA/WA/NV, team-disposition
   decision, hiring.

---

## 4. Decisions that must not drift

- **The screener's mark is the `Screener Outcome` custom field, not a WAVV disposition.** A call
  carries one disposition and we need two facts; the field also needs no WAVV admin.
- **Guards block what reaches the lead, keep what keeps the CRM clean.** `Call No Answer`'s
  *Remove Tag* step and `Capture Wavv Disposition`'s Branch B must keep running for screener
  contacts, or the `wavv-*` tags stick and the next attempt becomes undetectable.
- **The Attempt ladder is driven by the no-answer path**, not the recorded-call path — an
  unanswered dial produces no recording.
- **Block follower and block tag are replaced, never appended** on a re-screen, or a lead appears in
  two of Kevin's hour blocks. 10-follower cap per record; two already used by the TZ and line-type
  workflows.
- **Re-screen only leads with no open opportunity in Kevin's pipelines** — re-adding `screening` to
  a lead mid-cadence would silently switch his automations off for it.
- **Freshness is enforced by the n8n sweep, not a filter** — contact filters on a custom field offer
  only *Is / Is not / Is empty / Is not empty*.
- **Stages mean the call *due*** (same convention as `Day 1 Call A`), so Attempt 1 = never dialled.
- **Mohimenul's workflows stay inactive until the guards exist.**

---

## 5. Hard-won gotchas

**GHL builder**
- Verify every workflow edit through the API, never the canvas:
  `GET backend.leadconnectorhq.com/workflow/<loc>/trigger?workflowId=<id>` and
  `GET .../workflow/<loc>/<id>?includeScheduledPauseInfo=true`. GHL **silently discards** a filter
  saved without an operator — canvas showed it, API returned an empty trigger list.
- **Contact tag** trigger filters have **no operator** (only which tag fires it) → `Call No Answer`
  needs an in-workflow If/Else. **Contact changed** filters *do* take `Has changed`.
- Field-picker labels are split by the search highlighter (`Screener` + `Outcome`) — match a
  parent's combined text.
- The webhook URL box is rich text; typing opens a merge-field popup that blocks clicks below.
- Custom-data values render as chips: `{{contact.id}}` → `Contact.ID` (correct).
- Unknown: where existing steps land when an If/Else is inserted mid-workflow. Procedure in the plan.

**GHL elsewhere**
- Opportunity board filters: **followers yes, tags no**. Contact Smart Lists: tags, Owner,
  Opportunity pipeline/stage, custom fields.
- Contact search does **not** match partial phone numbers — the duplicate-check on save is what
  revealed the existing contact.
- Duplicate phone numbers are rejected account-wide.
- Smart List filter rows: the box beside the field name is the **operator**; the value picker is the
  separate "Please select" to its right.
- Settings → Custom Fields lives at `/settings/fields?tab=field`; guessing URLs renders blank pages.

**Automation technique**
- Clicking the GHL UI step-by-step is slow (stale refs, portal dropdowns). **Script whole flows
  inside one `browser_evaluate`** with a wait-for-condition loop — ten users took two calls that way.
- Dialogs need a wait-until-closed check between iterations or every second one silently fails.

**Tooling**
- Browser access is the **Playwright Extension** in Chrome; the token lives in `~/.claude.json`
  under the `playwright` MCP server env (`PLAYWRIGHT_MCP_EXTENSION_TOKEN`). It shares the whole
  browser, so keep unrelated tabs in mind.
- The **n8n MCP** connector drops out and needs re-authorising from claude.ai connector settings.
- `git push` may be refused by the permission classifier; the user allows it via `/permissions`.
- Browser scratch output lands in `.playwright-mcp/` (gitignored).

---

## 6. Open questions for Kevin

Recording in CA/WA/NV · whether to screen leads already in his pipelines · team dispositions once
seats exist · male/female + "sounds like an owner" stay dropped unless week one shows owners being
faked.
