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
1. **Schedule 4:30AM** fans out to **three parallel pulls** (email pipeline `1A1RkYaL93s2rqbQ3Opi`,
   all paginated):
   | Node | Stage | ID | → N |
   |---|---|---|---|
   | Pull Sent Cold Email 1 | Cold Email 1 Sent | `41849471-…` | 1 |
   | Pull Sent Cold Email 2 | Cold Email 2 Sent | `fdd4f9a4-…` | 2 |
   | Pull Sent Cold Email 3 | Cold Email 3 Sent | `2f599547-…` | 3 |
2. **Combine** (merge ×3) → **Split Out** (`opportunities`).
3. **Detect Pre** (code) — `SENT_TO_N` maps stage → `N`; emits `routable = (1 ≤ N ≤ 3) && contact_id`.
4. **Is routable?** (filter) → **Loop (batch 10)** → **GHL: Get Contact**.
5. **Build Route + SUB** (code) — the brain. Picks `target_stage_id` (see matrix) and assembles
   the input contract for the personalization sub-workflow.
6. **Personalize Call Context (SUB)** — `executeWorkflow` → `T4Mz1k2fYwCwzp7D`, mode `each`.
   Returns `call_context` + `interaction_summary`.
7. **GHL: Write Call Context + Interaction Summary** (PUT contact).
8. **GHL: Clear Disposition + Notes** (PUT contact) — **empties Call Disposition
   (`YxGIrvPl5tfLeYoc7Ldr`) + Call Notes (`kVU8T6Swsh9sF4TWC81U`)** right before the move, so the
   next call cycle starts clean. Partial PUT — **does not touch** Call Context (`sLGmbbrcmzdlGONFYDSC`),
   Call Router Context (`HW0eBfoQPW2mwxX8aY7Q`), Call Processing State (`BD9TmgEynOEy6bCvZshm`), or
   Interaction Summary. Non-blocking (`onError: continue`) so a cleanup hiccup never strands the move.
9. **GHL: Move Opp → Cold Call Stage** (PUT opp) — moves it into pipeline `9E6y34DlG1Imr8FV42RV`
   at `target_stage_id`. **This is the step that drains the `Cold Email N Sent` stages.**
10. **Wait 2s** → loop.

## 🎯 Routing matrix (the core logic)
Two **independent** axes decide the target stage:

- **`is_mgr`** — MGR = *Missed call Google Review* lead. True ⟺ custom field
  **`Missed Call Review` `u9UymBEMP3f7IZqDTwVd`** is **non-empty**.
- **`is_missed`** — the lead's **last call** went unanswered. True ⟺ contact carries the
  **`last_call_missed` tag**.

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
- The `(from on hold)` stages exist but **nothing targets them yet** — see `Resume On Hold Leads`.
- **Restructured-pipeline migration:** this workflow, the call-disposition Dispatcher, and the
  missed-call Cold Handler are all migrated. **`Resume On Hold Leads` is the only one still on the
  old stage IDs** — see [`AGENTS.md`](../../AGENTS.md).
- Runs at **4:30AM**, 30 min after `Send Cold Email 2/3/4` (4:00AM) — the last step of the nightly
  cascade (3:00 → 3:30 → 4:00 → 4:30). No longer shares an hour with 2/3/4.

## Related
- Upstream: [`Send Cold Email 1 (3:30AM)`](./Send%20Cold%20Email%201%20%283_30AM%29.context.md) ·
  [`Send Cold Email 2/3/4 (4AM)`](./Send%20Cold%20Email%202_3_4%20%284AM%29.context.md) — they populate
  the `Cold Email N Sent` stages this workflow drains.
- Sub-workflow: **Personalize Call Context (SUB)** `T4Mz1k2fYwCwzp7D` — _not yet mirrored._
- Pipelines/stages, custom fields, MGR definition: [`AGENTS.md`](../../AGENTS.md).
