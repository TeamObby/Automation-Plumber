# Resume On Hold Leads

- **n8n ID:** _pending import_ · **File:** `Resume On Hold Leads.json`
- **Folder:** `workflows/scheduled-for-stage-change/`
- **Status:** inactive (built 2026-07-06, not yet imported)
- **Trigger:** Schedule — every 30 min, **08:00–22:00 PT** (workflow timezone = America/Los_Angeles)

## Purpose
Sweeps the two Client Acquisition **on-hold** stages and, once a lead's saved resume time
has passed, moves its opportunity back into the caller stage saved when it was put on hold.
Pairs with the Cold Handler, which sets `Resume Call At` + `Next Caller Stage` on-hold.

## Flow
1. **Every 30m (8am-10pm PT)** (Schedule) — cron `0 0,30 8-21 * * *` + `0 0 22 * * *`.
2. **Pull Cold-On-Hold** / **Pull Conv-On-Hold** (HTTP GET, paginated) — `/opportunities/search`
   filtered by `pipeline_id=O7LMZpDOFM2SYO65twC5` + `pipeline_stage_id`, `limit=100`.
   Cursor pagination: `startAfterId` + `startAfter` from `meta`, complete when a page returns `< 100`.
   - Cold - On Hold `54994e3f-1643-46f4-8eeb-ade43712ae2d`
   - Conversation - On Hold `175c5765-fd68-48d5-a319-8bcc77487703`
3. **Combine** (Merge, append) → **Split Out** (`opportunities`) → **Extract Opp** — one item
   per opp with `opp_id` + `contact_id`.
4. **Loop (batch 10)** — batches of 10 with **Wait 2s** between batches (GHL rate-limit pacing).
5. **GHL: Get Contact** — reads `Resume Call At` + `Next Caller Stage` custom fields.
6. **Evaluate Resume** — decision brain (below).
7. **Can move?** (IF) — true → **GHL: Move Opp → Caller Stage** (PUT `/opportunities/{id}`);
   both branches converge on **Wait 2s → Loop** so the batch loop always advances.

## Resume gate (Evaluate Resume)
- `Resume Call At` (`u5VC5C59UlFZJDYOuw7N`, text) may be **date** or **date + time**:
  - **date only** → due when the date is reached (today PT ≥ resume date).
  - **with time** → due only when date **and** time have passed (now PT ≥ resume datetime).
- Comparisons in **America/Los_Angeles**.
- `Next Caller Stage` (`Tj0yopYbErXbwsTYTsCX`, text) slug → target pipeline + stage:

| Slug | Target pipeline | Stage |
|---|---|---|
| `cold_call_1` | Cold Outbound Call `9E6y34DlG1Imr8FV42RV` | Cold Call 1 `060f44a8…` |
| `cold_call_2` | Cold Outbound Call `9E6y34DlG1Imr8FV42RV` | Cold Call 2 `4cb90aaa…` |
| `cold_call_3` | Cold Outbound Call `9E6y34DlG1Imr8FV42RV` | Cold Call 3 `4b1d7a88…` |
| `day_1_attempt_1` | Active Conversation Call `TwW6o0JdPXUlcwvX0EvI` | Day 1 - 1st Attempt `74c3e036…` |

- `can_move = opp_id && target resolved && due`. Unknown slug or empty/future resume → not moved.
- Moving the opp OUT of the on-hold stage drops it from future sweeps (no field cleanup needed).

## Credentials
- **GHL:** `httpMultipleHeadersAuth` → `DtotRKnzjDewbSsv` (Waterline Growth) · location `rzaMhqeo2apNI1p6DG5z`

## Notes / verified
- Pagination shape (`startAfterId`/`startAfter`, `pipeline_id`/`pipeline_stage_id`, `{opportunities,meta}`)
  copied from the proven **Send Cold Email 2/3/4** workflow (`0iXr4fHGqptYGJpg`).
- Timezone PT and `Resume Call At` format (`YYYY-MM-DD` / `YYYY-MM-DD HH:mm`) confirmed by user.

## Related
- Upstream: [`Cold Handler`](../call-disposition/Cold%20Handler.context.md) sets the two fields on-hold.
- Pipelines/stages reference: [`AGENTS.md`](../../AGENTS.md).
- Pagination/loop pattern reference: **Send Cold Email 2/3/4 -> Instantly + stamp** (`0iXr4fHGqptYGJpg`).
