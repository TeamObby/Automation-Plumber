# Slack, Sep 25–26, 2026: what's new since the Sep 25 extraction

Pulled on 2026-09-26. It continues [`../slack-agentic-2026-09-25/`](../slack-agentic-2026-09-25/README.md), which
stops at Mohimenul's Task 5 reply (Sep 25, 9:12 AM PT). Sources: `#agentic` (C0ANKT5TR7F),
`#meeting-recordings` (C0BF2KSB2PL) and the Sep 25 huddle notes. Times are Pacific.

The two new meetings are in `docs/`:
- [`meeting-2026-09-25.md`](../meeting-2026-09-25.md) + [transcript](../meeting-2026-09-25-transcript.md): Zoom, Sep 24 evening PT.
- [`meeting-2026-09-26.md`](../meeting-2026-09-26.md) + [transcript](../meeting-2026-09-26-transcript.md): Zoom, Sep 25 evening PT.

The repo already had the Sep 24 BD-morning meeting ([`meeting-2026-09-24.md`](../meeting-2026-09-24.md)).

## The short version

1. **Mohimenul's main task is unchanged: the Supabase database, ready for Monday.** At the Sep 25 morning
   huddle Kevin said "I might need you a little more cause you're doing the database one… we got to really make
   sure that's ready" ([transcript 39:17](04-huddle-2026-09-25/huddle-transcript.md)). The evening meeting
   confirmed **Tasks 4 and 5** for Mohimenul, with the database due **the morning of Sep 26**. The rest of
   the team split is settled too: Hridoy **6** (GHL and phones), Tausif **3** (nightly batch, moved from
   Mohimenul), plus the pipeline-balancing logic and the one-shop enrichment.
2. **Two sources disagree on who owns the nightly program.** In the meeting, Kevin gave Task 3 to Tausif.
   Kevin's Claude (canvases posted after the meeting) suggests "Tausif handles the data pulls and the GHL setup,
   Mohimenul handles the nightly program", and lists Mohimenul for the Tier 1–2 items. It also says Kevin's
   Claude does the merge itself ("Matching kit on all of it together… Saved in Supabase. Me."), which overlaps
   Task 8. **Needs a word with Kevin.**
3. **Tools are chosen** (Sample Test 3, Round 1): **DataForSEO** for Google (Outscraper returned the wrong
   business 45 times against DataForSEO's 5), **Apify** for Yelp (half the price; Yelp found 15% of shops Google
   missed), **Twilio** for phone type (not ClearoutPhone), and a DataForSEO point grid to find every plumber
   (499 plumbers against Outscraper's 92). The Texas licence file lists people, not shops. Round 2 went to Tausif.
   The Yelp tool for a whole state (Apify or Outscraper, priced per search or per lead) is still Tausif's to settle.
4. **The list build is written down** ([List_Building_Final](03-list-building/List_Building_Final.md)):
   - Get every shop once: licence files + DataForSEO over every ZIP (41,580 searches, ~$25–40) + Yelp + old GHL leads.
   - Merge into one list: the matching kit, in Supabase.
   - Cheap check on everyone (~$150–250 once), then a full check only on the next shops Topu calls (~$3–10/day).
   - Score, check calling hours, load into Topu's pipeline.
   - Every pull saves its raw file to Drive and adds a row to a **DATA LOG**, so nothing is bought twice.
5. **A new scoring model (v2 → v2.5)** ([All_Major_Tasks_Ranked](02-all-major-tasks-ranked/All_Major_Tasks_Ranked.md)):
   - Must-haves are *likely owner* and *likely home jobs*.
   - "Gets a lot of calls" is worth 70 points; "will stay in business" 30; ×1.5 for 2–5 person shops.
   - Tiers 1–4 split the pool 20/30/30/20.
   - **Urgent 1–3** covers receptionist job ads, "never called back" reviews and storms.
   - **300 random shops** are called as a control group.
6. **The "brain" becomes Claude skills.** Claude wakes 1–3× a day, keeps Kevin's pipeline at ~70 per time
   zone and the screener's queue at ~200 per zone, and refills from the database. The logic lives in a shared
   **skills repo with a master skill**; Notion keeps only history. Kevin's Claude adds that n8n is fine for
   triggers, but the matching and scoring rules stay in tested code that n8n calls.
7. **Monday (Tier 1) needs:**
   - legal basics: do-not-call check, recording notice, calls only 9am–8pm local, **Florida ≤3 calls per 24h**,
     dial by hand or click-to-call;
   - screener setup (the dialer account is named **"Topu"** and every call records who made it);
   - database basics (tables, CA shops, old GHL contacts, no duplicates);
   - call logging basics; list upload and merge; batch 1.

   Topu is onboarded **Sunday Sep 27** and dials **Monday Sep 28**.

## Asked of Mohimenul (open)

| When | Ask | From |
|---|---|---|
| Sep 25 meeting | Own **Tasks 4 and 5**. Finish the DB changes and the tasks **by the morning of Sep 26**. | Kevin, [meeting ~35:30, ~61:24](../meeting-2026-09-26.md) |
| Sep 25 meeting | **Test the screener with Hridoy** after his live screener test call. | Hridoy, [meeting ~03:14](../meeting-2026-09-26.md) |
| Sep 25, 12:58 PM | Find a way to **forward Slack huddle AI notes to #agentic**. Add it to ClickUp. | Kevin |
| Sep 25, 1:08 PM | With Hridoy and Tausif: **a canvas of every data account we'll use, with credentials**. Mahir moves it to the master sheet. | Kevin |
| Sep 25, 9:36 PM | **Show Adid the meeting-recording automation** (he takes it over). Sep 26, 12:31 AM in #meeting-recordings: Adid must cut its latency, and Mohimenul gives him the context. | Kevin |
| Sep 26, 12:28–12:48 AM | With Hridoy: **the final list of every state**. Which sheet tab is the full final version, with every column from every source; for each list, all the scraping and enrichment done (e.g. "Texas: state records, Outscraper, ClearoutPhone, DataForSEO, Serper"); **which states came from which source**. | Kevin |

The Sep 25 huddle also recorded "@Mohimenul complete task 5 finalization" and "Tausif and Mohimenul
coordinate task ownership". The evening meeting settled the ownership.

## What this changes in the repo

These points are also in the hand-off ([`screener-handoff.md`](../screener-handoff.md) §3 and §6, updated 2026-09-26).

- **The database clash (the first thing to solve).**
  - Kevin's Task 4 schema (`supabase_v1_schema.sql`, in
    [the Sep 25 zip](../slack-agentic-2026-09-25/09-waterline-pipeline-latest/)) has its own `shops`, keyed by
    `shop_id`, plus `calls`, `shop_phones`, `source_records`, `needs_check` and more.
  - Our live `shops` / `shop_raw` / `call_log` differ, and all are empty.
  - Kevin's specs disagree on `calls` vs `screener_log`.
  - His `ghl-call` function would be a second GHL writer next to the live n8n screener.
- **Task 6 (GHL) vs the live n8n screener.** Four steps clash: the new No Answer / Voicemail outcomes, the Screen
  Noise dropdown, GHL counting attempts itself, and GHL clearing Screener Outcome after each call. Details and code
  references: [hand-off §3, Hridoy's section](../screener-handoff.md).
- **[`supabase-design.md`](../supabase-design.md)**:
  - `call_set` ("Tier 1, Set 2", ~100 per set, Notion tracker) no longer matches the new flow: a daily batch
    of ~15–25 shops, tiers 1–4, and Urgent 1–3.
  - Its "deliberately not built" list includes raw-data history and an automated Supabase → GHL loader. The
    new plan asks for a **DATA LOG**, a **score audit history**, **the score at call time**, and a nightly loader.
  - The dedupe keys (Google ID + phone) still match.
  - Kevin still owes the full column list.
- **Pipelines.** Topu's pipeline gets two columns, **Urgent** and **The Rest**. Kevin's pipeline gets
  **Urgent**, **Tier 1** and **Tier 2**. A new **Training** pipeline takes Tier 3–4 owners for Kevin's sister and
  new closers. Today `Screener: Graduate` creates the opportunity in Kevin's existing pipelines by hour block.
- **Gatekeepers.** The new plan says "office, receptionist or family member → out". Our Daily Sweep sends
  Gatekeeper back to Attempt 1 after 14 days.
- **Legal.** The screener's n8n workflows don't enforce Florida's 3-calls-in-24h rule or the 9am–8pm local
  window, and they can't gate dials: Topu dials by hand in WAVV. The checks have to live in loading (the
  new plan's step 22, "calling hours check… plus the stop list") or in the dialer.
- **Screener identity.** "Every call records who made it." The hand-off notes that `screener_log.screener_user_id`
  may stay empty, because Kevin's Call Recorded payload has no user id.
- **Answered open questions** ([hand-off §3, §6](../screener-handoff.md)):
  - Email: *"the screener calls regardless of email status; emails continue once a shop reaches your
    pipeline"* (the hand-off had it parked).
  - Old leads: those who said stop or not interested never go back to Topu; owners Kevin already reached go
    straight to his pipeline if Tier 1–2.
- **Dialer.** Two **single lines**, no multi-line. WAVV won't add Topu's seat until the Oct 23 cycle, and
  Hridoy is working around it.
- **Existing data.** ~10,900 GHL contacts and ~18,400 CA licence shops. Only ~1,850 have any Google data.

## Timeline (after the last extraction)

**Sep 25**
- **9:39 AM · Kevin:** "let's meet soon". The huddle ran **9:58–10:37 AM** in Kevin's DM with Hridoy, with
  Mohimenul and Tausif → [huddle notes](04-huddle-2026-09-25/huddle-notes.md). Hridoy shared them with Tausif and
  Mohimenul at 10:44 AM.
- **10:41 AM · Kevin → Tausif:** redo some testing. Round 1 graded, plus Round 2 inputs →
  [01-sample-test-3-round-1/](01-sample-test-3-round-1/).
- **12:57–12:58 PM · Kevin** re-shared "Yesterday's meeting" and "Today's meeting" (huddles). The AI notes only
  land in the DM where a huddle starts, so he wants them forwarded to #agentic (ClickUp task, to Mohimenul).
- **1:08 PM · Kevin:** a canvas of all the data accounts we'll use, with credentials (Hridoy, Mohimenul,
  Tausif); Mahir copies it to the master sheet.
- **7:19 PM · Kevin:** the meeting has to be after 8. Hridoy and Adid can't make it.
- **7:21 PM · Adid:** screenshot of the `NO x` reply and the new lead text ("Caught Job #2… Reply NO 2 and it
  won't count"; unknown numbers get "We couldn't find catch #3"). The image isn't saved here.
- **7:40 PM · Kevin:** "let's meet right now" → [meeting](../meeting-2026-09-26.md). In practice Hridoy and Adid joined.
- **8:53 PM · Kevin:** "Additional thread context": all major tasks ranked Tier 1–4, the scoring columns and
  costs → [02-all-major-tasks-ranked/](02-all-major-tasks-ranked/).
- **9:36 PM · Kevin → Mohimenul:** show Adid the meeting-recording automation and assign it to him too
  ("Removing the latency").
- **9:38 PM · Kevin → Mahir:** move Hubstaff manager access from Tausif to Adid.
- **10:18 PM · Mahir:** the Live agent's product version works; in the demo, bridging and asking for a price are
  still buggy.
- **10:39 PM · Kevin → Mahir, Sharjil:** post the screener job again this weekend (maybe Mon/Tue), then reassess.

**Sep 26**
- **12:28–12:30 AM · Kevin → Hridoy, Mohimenul:** the final list of every state (see the table above).
- **12:31 AM · Kevin (#meeting-recordings) → Adid:** decrease the latency of the video recordings; Mohimenul
  gives context.
- **12:43 AM · Kevin:** Tausif gets the data from three sources: state records, Google (DataForSEO) and Yelp
  (Apify or Outscraper).
- **12:48 AM · Kevin → Hridoy, Mohimenul:** "I need to know exactly which states came from what data source."
- **12:55 AM · Kevin → Tausif:** pick the Yelp tool for a whole state; beware per-search pricing →
  [Context_Data_Sources](03-list-building/Context_Data_Sources.md).
- **12:57 AM · Kevin → Tausif:** "these are the final steps" → [List_Building_Final](03-list-building/List_Building_Final.md)
  and [Additional_Thread_Context](03-list-building/Additional_Thread_Context.md). Re-posted to Hridoy and
  Mohimenul at 1:07 AM.

## Files

| Folder | File | What it is |
|---|---|---|
| [01-sample-test-3-round-1](01-sample-test-3-round-1/) | `Thread_Context_Round_1_Results.md` | Canvas: the Round 1 winners, 4 problems, the Round 2 steps |
| | `test3_round2_inputs.zip` | Round 2 inputs A–E (websites, pages, map grid, local ad searches, phone rerun) |
| [02-all-major-tasks-ranked](02-all-major-tasks-ranked/) | `All_Major_Tasks_Ranked.md` | Snippet: 24 tasks by tier (Monday / weeks 1–2 / 2–4 / month 2+), every scoring column with source, test result and points, costs |
| [03-list-building](03-list-building/) | `List_Building_Final.md` | Canvas: the 27 steps, with the tool and person for each |
| | `Additional_Thread_Context.md` | Canvas: the message to Tausif, old leads, avoiding paying twice, the full process in 5 parts |
| | `Context_Data_Sources.md` | Canvas: what Google, Yelp and the state files each give |
| [04-huddle-2026-09-25](04-huddle-2026-09-25/) | `huddle-notes.md` | Slack AI notes of the Sep 25 morning huddle |
| | `huddle-transcript.md` | Its full transcript (added by Mohimenul) |
| [05-meeting-ai-notes](05-meeting-ai-notes/) | `zoom-notes-2026-09-25-bd.md`, `zoom-notes-2026-09-26-bd.md` | The Zoom bot's topic and action lists for the two meetings |

Canvases were converted from Slack's HTML to Markdown, with user ids replaced by names.

## Not captured

- **Kevin's other huddles.** Their notes live in Kevin's DMs (for example his DM with Hridoy), which this
  Slack connection can't read. Search shows only the Sep 25 notes. Kevin's "Yesterday's meeting" huddle
  (Sep 24) has no notes that can be reached.
- **Older #meeting-recordings posts** (Sep 21, 22, 23) weren't extracted. They predate the screener work
  already in the repo.
