# Sent Cold Email to Caller Stages (4:30AM)

- **n8n ID:** `IIyYJxvDyeCmYdur` · **URL:** https://n8n.meetobby.com/workflow/IIyYJxvDyeCmYdur
- **Folder:** scheduled-automations · **Status:** **Active ✅** (schedule **4:30AM**)

## Purpose
The **email → call handoff.** Once a cold email has gone out, the lead's opportunity sits in a
`Cold Email N Sent` stage of the email pipeline. This workflow sweeps those stages nightly and
**moves the opp into the Cold Outbound Call Pipeline** (`9E6y34DlG1Imr8FV42RV`) at the right
Day-N call stage, after generating personalized call context for the caller.

Only **Sent 1 / 2 / 3** are swept. `Cold Email 4 Sent` (`39a20e88-…`) is deliberately **not**
pulled — email 4 is the end of the sequence, no call follows.

## Flow
1. **Schedule 4:30AM** fans out to **four parallel pulls** (email pipeline `1A1RkYaL93s2rqbQ3Opi`,
   all paginated):
   | Node | Stage | ID | → N |
   |---|---|---|---|
   | Pull Sent Cold Email 1 | Cold Email 1 Sent | `41849471-…` | 1 |
   | Pull Sent Cold Email 2 | Cold Email 2 Sent | `fdd4f9a4-…` | 2 |
   | Pull Sent Cold Email 3 | Cold Email 3 Sent | `2f599547-…` | 3 |
   | **Pull No Email Cold Call 1** | **No Email Cold Call 1** | `fae631a1-…` | **1** |
2. **Combine** (merge ×**4**) → **Split Out** (`opportunities`).
3. **Detect Pre** (code) — `SENT_TO_N` maps stage → `N`; emits `routable = (1 ≤ N ≤ 3) && contact_id`.
4. **Is routable?** (filter) → **Loop (batch 10)** → **GHL: Get Contact**.
5. **Build Route + SUB** (code) — the brain. Picks `target_stage_id` (see matrix) and assembles
   the input contract for the personalization sub-workflow.
6. **Personalize Call Context (SUB)** — `executeWorkflow` → `T4Mz1k2fYwCwzp7D`, mode `each`.
   Returns `call_context` + `interaction_summary`.
7. **GHL: Write Call Context + Interaction Summary** (PUT contact).
8. **GHL: Clear Disposition + Notes** (PUT contact) — serialises the `contact_fields` array built by
   `Build Route + SUB`. Always **empties Call Disposition (`YxGIrvPl5tfLeYoc7Ldr`) + Call Notes
   (`kVU8T6Swsh9sF4TWC81U`)** right before the move, so the next call cycle starts clean; for a
   call-first lead it **also writes Stop Emails (`ixRO9dSUHVd6vNTdFa7Q`) = `True`** (see below).
   Partial PUT — **does not touch** Call Context (`sLGmbbrcmzdlGONFYDSC`), Call Router Context
   (`HW0eBfoQPW2mwxX8aY7Q`), Call Processing State (`BD9TmgEynOEy6bCvZshm`), or Interaction Summary.
   Non-blocking (`onError: continue`) so a cleanup hiccup never strands the move.
9. **GHL: Move Opp → Cold Call Stage** (PUT opp) — moves it into the **cold OR gatekeeper** call
   pipeline (`target_pipeline_id`, dynamic) at `target_stage_id`. **This is the
   step that drains the `Cold Email N Sent` stages** and **the swap point** where the `gatekeeper`
   tag decides the lane.
10. **Wait 2s** → loop.

## 🎯 Routing matrix (the core logic)
**Three independent** axes decide the target stage:

- **`is_gatekeeper`** — the lead carries the **`gatekeeper` tag** → the **gatekeeper** call pipeline
  (`3onA8GkJnSwgzIGTGSpI`), same stage *name*; else the cold pipeline. N=1 has no
  gatekeeper twin, so a tagged N=1 lead safely falls back to cold.
- **`is_mgr`** — MGR = *Missed call Google Review* lead. True ⟺ custom field
  **`Missed Call Review` `u9UymBEMP3f7IZqDTwVd`** is **non-empty**.
- **`is_missed`** — the lead's **last call** went unanswered. True ⟺ contact carries the
  **`last_call_missed` tag**.

The matrix below shows the **cold** stage IDs; for a gatekeeper lead, swap to the same-named
gatekeeper stage (see AGENTS.md interchange).

| From (N) | last call missed? | normal | MGR |
|---|---|---|---|
| Cold Email 1 Sent (1) | _n/a_ | **Day 1 Call A** `060f44a8-…` | **Day 1 Call A (MGR)** `04ccf8e0-…` |
| Cold Email 2 Sent (2) | no | **Day 2 Call** `4b1d7a88-…` | **Day 2 Call (MGR)** `4b3023aa-…` |
| Cold Email 2 Sent (2) | yes | **Day 2 Call (missed call)** `40bdc040-…` | **Day 2 Call MGR (missed call)** `59069dd4-…` |
| Cold Email 3 Sent (3) | no | **Day 3 Call** `f8407fb8-…` | **Day 3 Call (MGR)** `5bfcb041-…` |
| Cold Email 3 Sent (3) | yes | **Day 3 Call (missed call)** `b50e0792-…` | **Day 3 Call MGR (missed call)** `21b772e5-…` |

**N=1 has no missed-call variant** — the lead has not been called yet, so `is_missed` is ignored
there (the code falls back to the `plain` bucket). All 12 (N × missed × mgr) combinations were
executed against this matrix and match.

## 📞 The call-first lane (`No Email Cold Call 1`)
Stage `fae631a1-5f6c-4a47-bee7-c9f78c7744f7` in the **email** pipeline. Park a lead here instead of
`Cold Email 1` to start calling immediately without sending cold email 1. `Detect Pre` maps it to
**`N=1`**, so it routes exactly like `Cold Email 1 Sent` → **Day 1 Call A** (or the MGR variant).
The other two axes behave correctly at N=1 with no special-casing: `is_missed` is ignored (no missed
variant) and `is_gatekeeper` finds no `STAGE_GK[1]`, so it falls back to the cold lane.

`Detect Pre` also emits **`from_no_email`**, which `Build Route + SUB` uses to append
**Stop Emails = `True`** to `contact_fields`.

### ⚠️ Why Stop Emails is forced here
`Send Cold Email 1 → Instantly: Add to Cold Email 1` (`POST /api/v2/leads`) is the **only
lead-create point in the whole system**, and the only place the TZ→campaign assignment happens.
A lead that skips it has **no Instantly record at all**, and every later Instantly call assumes one
exists — `update-interest-status` (keyed on `lead_email`), `PATCH /leads/{instantly_lead_id}`,
`subsequence/remove`, and the missed-call emails. Worse, `Set interest (cold email N)` in
`Send Cold Email 2/3/4` has **no `onError`**, so it would error the batch item outright.

Forcing Stop Emails keeps the lead on the *Sent*-stage path, which is entirely email-free.
Verified by running the real `Parse + Map Outcome` at each N:

| After | `Stop Emails=True` → | 4:30AM picks it up? |
|---|---|---|
| Day 1 call | Cold Email 2 **Sent** | yes → Day 2 Call |
| Day 2 call | Cold Email 3 **Sent** | yes → Day 3 Call |
| Day 3 call | Cold Email 4 **Sent** | no — sequence ends |

Without it the same leads land in the *unsent* `Cold Email N` stages, where `Send Cold Email 2/3/4`
picks them up and dies on `Set interest`. **Do not clear Stop Emails on these leads** unless you
first create them in Instantly.

**Still worth checking:** `Build Route + SUB` passes `email_history` (empty for these leads) into
`Personalize Call Context (SUB)` (`T4Mz1k2fYwCwzp7D`, not mirrored here). If that prompt assumes a
cold email preceded the call, the generated Call Context will be wrong for this lane.

**Not targets of this workflow:** `Day 1 Call B` / `B (MGR)` (the caller flow advances A→B), and
all `(from on hold)` stages (those belong to the resume path).

## Sub-workflow input contract
`Build Route + SUB` emits, for **Personalize Call Context (SUB)** (`T4Mz1k2fYwCwzp7D`):
`company_name`, `contact_city`, `stage` (the **target stage name**, e.g. `Day 2 Call (missed call)`),
`event_logs`, `email_history`, `call_summary`, `googlestars`, `googlereviewscount`.
It returns `call_context` + `interaction_summary`.

## GHL custom field IDs
- **Missed Call Review** `u9UymBEMP3f7IZqDTwVd` — read; **non-empty ⇒ MGR**
- Call Context `sLGmbbrcmzdlGONFYDSC` — written (from SUB)
- Interaction Summary `AH3JqyYEPzPX4wXKoX1V` — written (from SUB)
- Read for context: Event Logs `7D9N71mEDfipN90zfV0j` · Email History `TcdjZt3fwFSZTgY6ngeE` ·
  Call Summary `ZVeEoK85i5EOhWt1HO1F` · Google Stars `E7XjZUePJBrJ99LnCD6e` ·
  Google Reviews `kDel5db3cRFrNjqOwdNp`

## Credentials / constants
- **GHL:** `httpMultipleHeadersAuth` → `DtotRKnzjDewbSsv` · location `rzaMhqeo2apNI1p6DG5z`
- All HTTP nodes: `retryOnFail`, 4 tries, 2s backoff. All three pulls paginate.

## TODOs / gotchas
- The `(from on hold)` stages are **not** targeted by this workflow — `Resume On Hold Leads` handles them.
- Runs at **4:30AM**, 30 min after `Send Cold Email 2/3/4` (4:00AM) — the last step of the nightly
  cascade (3:00 → 3:30 → 4:00 → 4:30).

## Related
- Upstream: [`Send Cold Email 1 (3:30AM)`](./Send%20Cold%20Email%201%20%283_30AM%29.context.md) ·
  [`Send Cold Email 2/3/4 (4AM)`](./Send%20Cold%20Email%202_3_4%20%284AM%29.context.md) — they populate
  the `Cold Email N Sent` stages this workflow drains.
- Sub-workflow: **Personalize Call Context (SUB)** `T4Mz1k2fYwCwzp7D` — _not yet mirrored._
- Pipelines/stages, custom fields, MGR definition: [`AGENTS.md`](../../AGENTS.md).
