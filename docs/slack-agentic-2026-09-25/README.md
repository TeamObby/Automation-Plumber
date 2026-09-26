# Slack #agentic, Sep 24–25, 2026: CA list AI check and the 9 major tasks

> Continued in [`../slack-agentic-2026-09-26/`](../slack-agentic-2026-09-26/README.md): the owners were settled
> (Mohimenul: Tasks 4 and 5), the tools were picked, the list-build steps were written down, and there are two new
> meetings.

Pulled from Slack `#agentic` (C0ANKT5TR7F) on 2026-09-25. It covers everything from Kevin's
"The current california list has a lot of bad data…" message (Sep 24, 5:50 PM PT) up to
Mohimenul's Task 5 status reply (Sep 25, 9:12 AM PT), thread replies included. Times are Pacific.
All files and pictures posted in that window are in the numbered folders next to this file.

People: **Kevin** Yoo (owner), **Mohimenul**, **Hridoy**, **Tausif** (Ahmed Reza Tausif),
**Mahir** Shahriar, **Adid**, **Topu** (the screener, mentioned only).

## The short version

1. **The California list has bad data, so an AI matching check is now required.** When Kevin called
   prospects, some had the wrong names. The cause: the CA list joins the state licence list (who is a
   real licensed plumber) with the old list's Google data (phone, reviews, website), and some Google
   data belongs to a different business with a similar name. Kevin's fix is a rule-based matching
   program plus an AI "second look" for unsure records. On his test the wrong-business rate went from
   about 1 in 7 to 0 confirmed wrong. From now on **every** data source (Google, Yelp, Facebook, Angi,
   websites) has to pass the matching check before anyone uses it.
2. **301 of Kevin's own CA shops failed matching** and are held back from calling. Kevin web-checks
   those himself; no team work needed.
3. **Kevin posted 9 major tasks** and asked the team to split them, because the AI kept assigning
   too much to Mohimenul. **Task 8 (list upload and merge) is the top priority for Mohimenul**, then
   Tasks 1, 3, 4, 5, 6. He wants the **basic** version of each, done today or tomorrow, and says some
   instructions may be more complex than needed.
4. **Supabase:** Kevin asked which project to use. Mohimenul explained: the free plan allows only two
   projects per org, so he made a separate **Waterline** org (Obby account has developer access).
   Voice DB lives in TeamObby, the screener in Waterline. Ownership can move later if they buy Pro.
5. **Monday is at risk** (Kevin's notes): Topu can't start dialing until the GHL screener stage and
   fields, the screener automation, the phone numbers with recording, and batch 1 are ready. Fallback:
   start in GHL alone and copy the calls into Supabase later.

## Timeline

**Sep 24**

- **5:50 PM · Kevin** (to Hridoy, Mohimenul, Tausif): the CA list has bad data; prospects had wrong
  names. We need an extra AI layer to double-check everything. With it, error went from 16% to 0%;
  unsure records get a second check. Attached 2 screenshots, `our_shops_CA.csv`, `match_rules.py`,
  `MATCHING_KIT.txt` and an "Instructions" canvas → [01-ca-list-ai-check/](01-ca-list-ai-check/).
  - Screenshot 1 (results table): without the rules, **43 of 316 results (14%)** were the wrong
    business. With the rules, **0 confirmed wrong** in 29 accepted results checked online (2 unclear),
    21 of 21 random matches correct, and 16 of the 21 held records really were different businesses.
    (Kevin's message says 16%; the screenshot says 14%.)
  - Screenshot 2 (what happened): 301 shops failed matching. Example: *Lone Star Plumbing, Shafter*.
    Licence phone is 661 (Bakersfield area, fits Shafter), but the Google number we'd dial is 415 (San
    Francisco, ~280 miles away) and the website is `lonestarplumbing.ca`, so the screener may have
    called the wrong business. A separate AI "web check" looks each one up: **same shop** → back in the
    calling pool; **different business** → drop the Google data and wait for a fresh lookup; **can't
    tell** → stays held.
  - Instructions canvas: the team needs only 3 files (the kit, the program, our shop list), plus a
    ready-to-paste message telling the team that all collected data must go through matching, and
    every search must carry our shop ID (the licence number).
- **6:53 PM · Mahir** (in his thread from Sep 23): is this OK? A bit more testing, then production.
  **7:21 PM · Kevin:** looks good.
- **7:27 PM · Kevin → Tausif:** can't open some résumés (one applicant). **Mahir:** that applicant
  didn't submit one. (Hiring a second screener was mentioned just before the start message.)
- **7:39 PM · Kevin:** meeting soon. **8:16 PM:** posted the Zoom link, "please join".
- **8:36 PM · Hridoy:** posted the repo `github.com/TeamObby/trade-lead-pipeline`.
- **11:11 PM · Kevin:** "Supabase, which one? Waterline? Separate for voice and the prospect list?"
  (screenshot of the org picker: *TeamObby's Org* / *Waterline*) → [02-supabase-which-project/](02-supabase-which-project/).
  **Mohimenul:** Waterline was created on a different account with developer access for the Obby
  account, because the free plan caps projects at two. Voice DB is in TeamObby, the screener in Waterline.
- **11:14 PM · Kevin:** "oh I see… does this do the same thing? That's clever. We can get as many
  databases." **Mohimenul:** if we go Pro later, we can transfer ownership; not much hassle.
- **11:16 PM · Kevin:** screenshot of a Supabase "Failed to authorize request: your account does not
  have the necessary privileges" error, trying to connect the other account →
  [03-supabase-access-error/](03-supabase-access-error/). Asked for the original credentials;
  **Mohimenul** told him which login option to pick.

**Sep 25**

- **12:19 AM · Kevin** (to Mahir, Mohimenul): tried one way to give Claude chat read/write access to
  GitHub; it didn't work. Still needed eventually.
- **12:21 AM · Kevin** (to Hridoy, Mohimenul): notes to go over in the morning →
  [04-meeting-notes/notes.png](04-meeting-notes/notes.png). Summary:
  - Live check: GHL screener pipeline has no "Screener queue" stage; Screener Outcome lacks "No
    Answer" and "Voicemail"; the noise field is still free text; the new fields don't exist; the main
    screener automation is a draft. Supabase has one empty call-log table, no list tables, no automations.
  - Monday is at risk (see the short version above).
  - Decisions only Kevin can make: (1) start the DB setup tonight (list tables, load the CA list,
    keep one call log: the team's; nothing deleted)? (2) which repo: `trade-lead-pipeline` or a new
    one? (3) when do the kits go out to the team? (4) should the screener call shops whose only number
    is from the licence, and one row per shop plus a list of extra numbers? (5) budget: ~$160–245/mo
    or ~$560–640/mo, and ask Yelp for a price on licensed data? (6) wording of the recording notice
    and of the opener for shops hiring a receptionist.
- **12:57 AM · Kevin → Tausif:** Sample Test 3, made "as easy as possible", needed by tomorrow
  morning → [05-sample-test-3/](05-sample-test-3/). 150 shops (100 CA, 50 TX; 50 FL to follow once
  Hridoy sends the Florida file), one input file per tool: DataForSEO by phone and by name, Outscraper
  Google Maps, Yelp (Apify and Outscraper), Serper for directory pages, ClearoutPhone and Twilio phone
  checks, and a 3-area plumber sweep. Send back one zip plus the cost per tool.
- **1:06 AM · Kevin** (to Mohimenul, Hridoy, Tausif): the **Major Tasks** canvas, 9 tasks. "I don't
  know why the AI keeps assigning more to Mohimenul but we need to get this distributed among the
  team. **Task 8 is the most important, Mohimenul.** Then 1, 3, 4, 5, 6." →
  [06-major-tasks/Major_Tasks.md](06-major-tasks/Major_Tasks.md).
- **1:20 AM · Kevin:** Task 8 full detail, plus `ca_v2_list.zip`, `waterline_pipeline.zip`, and
  repeat copies of `test3_inputs.zip` and `MATCHING_KIT.txt` → [07-task-8-list-upload/](07-task-8-list-upload/).
- **1:32–1:39 AM · Kevin:** one canvas each for Tasks 3, 4, 5, 6, 2 (with `job_ads_searches.csv`)
  and 9 → [08-task-specs/](08-task-specs/).
- **1:40 AM · Kevin** (to Hridoy, Mohimenul, Tausif): some instructions may be too complex, "we just
  need the basic functionalities". Every file the tasks mention is in the new zip, the most up-to-date
  version; re-download if you have an older one → [09-waterline-pipeline-latest/](09-waterline-pipeline-latest/).
- **1:48 AM · Kevin:** "We need to really get these done today or tomorrow."
- **9:12 AM · Mohimenul** (Task 5 thread): most of Task 5 already exists, built in n8n rather than
  Supabase functions. Done: every screener call saved to Supabase `screener_log` with recording and
  transcript; attempt count (Attempt 1–4 → Exhausted); AI check of each transcript against the
  screener's pick, tagging `screen-mismatch`; confirmed owners move to Kevin's pipeline. Partial: the
  daily Slack summary exists, hourly productivity doesn't. Not built: the idle alert and the new call
  fields (first name, best time, etc.).

## The 9 tasks at a glance

Owner as written in the Major Tasks canvas; the task's own canvas sometimes suggests someone else.

| # | Task | Owner (Major Tasks) | Own canvas says | Spec |
|---|---|---|---|---|
| 1 | Matching kit: hand-pulled lists go through the kit; only MATCH HIGH/MEDIUM used; 20-row spot check per batch | Tausif | — | [Major_Tasks.md](06-major-tasks/Major_Tasks.md), [MATCHING_KIT.txt](01-ca-list-ai-check/MATCHING_KIT.txt) |
| 2 | Job ads hot list: daily Google Jobs search for receptionist/dispatcher/CSR ads; shops hiring their first receptionist are HOT | Mohimenul | Tausif (suggested) | [TASK_2](08-task-specs/TASK_2_JOB_ADS_HOT_LIST.md) |
| 3 | Nightly batch: keep ~900 shops in the GHL Screener queue; prepare 200–300 more each night with fresh data, match, score, push, post a Slack summary | Mohimenul | Mohimenul | [TASK_3](08-task-specs/TASK_3_NIGHTLY_BATCH_AUTOMATION.md) |
| 4 | The database: Supabase as the source of truth for shops, phones, calls, sets, raw pages, source records; load the CA list and existing GHL contacts; never delete | Mohimenul (with Kevin's Claude) | same | [TASK_4](08-task-specs/TASK_4_THE_DATABASE.md) |
| 5 | Call logging, AI check, productivity: `ghl-call` function, AI check every 15 min, hourly/daily counts, 20-min idle alert | Mohimenul | Sharjil or Mahir (suggested) | [TASK_5](08-task-specs/TASK_5_CALL_LOGGING_AI_CHECK_PRODUCTIVITY.md) |
| 6 | Screener setup in GHL (stage, outcomes, fields, automation) and phones (CA numbers, registry, silent voicemail, 2nd WAVV seat, recording, ≤100 dials/number/day) | Tausif and Hridoy | same | [TASK_6](08-task-specs/TASK_6_SCREENER_SETUP_GHL_AND_PHONES.md) |
| 7 | Scoring and finding every shop: batch 1, TX and FL lists, area-by-area Google search, weekly score tuning | Kevin | — | [Major_Tasks.md](06-major-tasks/Major_Tasks.md) |
| 8 | **List upload and merge (top priority):** connect `pipeline/ingest.py` to Supabase so every record becomes ATTACH / NEW_SHOP / UPDATE / NEEDS_CHECK / CONFLICT / SKIP / NO_MATCH; add `source_records` and `needs_check` | Mohimenul | Mohimenul | [TASK_8](07-task-8-list-upload/TASK_8_LIST_UPLOAD_AND_MERGE.md) |
| 9 | Multiple phone numbers per shop: `shop_phones`, `next_number()`; switch numbers after 4 no-answers / Not Sure / Wrong Number, never to get around a gatekeeper | Mohimenul and Tausif | same person as Task 5 | [TASK_9](08-task-specs/TASK_9_MULTIPLE_PHONES_PER_SHOP.md) |

## Files in this folder

Canvases were converted from Slack's HTML to Markdown; everything else is exactly as downloaded.

| Folder | File | What it is |
|---|---|---|
| [01-ca-list-ai-check](01-ca-list-ai-check/) | `image-1.png` | Results table: with vs without the matching rules |
| | `image-2.png` | What happened: the 301 failed shops, the Lone Star example, the web check |
| | `Instructions.md` | Canvas: the 3 files the team needs and the message to send them |
| | `MATCHING_KIT.txt` | Part 1 team steps, Part 2 Claude prompt, Part 3 rulebook |
| | `match_rules.py` | The matching program |
| | `our_shops_CA.csv` | Our CA shop list, 18,413 shops (shop_id = licence number, phones, address, website) |
| [02-supabase-which-project](02-supabase-which-project/) | `supabase-projects.png` | Supabase org picker: TeamObby's Org / Waterline |
| [03-supabase-access-error](03-supabase-access-error/) | `access-error.png` | "Failed to authorize request" when connecting the other account |
| [04-meeting-notes](04-meeting-notes/) | `notes.png` | Kevin's notes: live GHL/Supabase check, Monday risk, 6 decisions |
| [05-sample-test-3](05-sample-test-3/) | `Instruction_Sample_Test_3.md` | Canvas: Tausif's Round 1 steps per tool |
| | `test3_inputs.zip` | 9 input CSVs, one per tool (the copy posted with Task 8 is byte-identical) |
| [06-major-tasks](06-major-tasks/) | `Major_Tasks.md` | Canvas: the 9 tasks with owners |
| [07-task-8-list-upload](07-task-8-list-upload/) | `TASK_8_LIST_UPLOAD_AND_MERGE.md` | Canvas: full Task 8 spec, steps and expected test counts |
| | `ca_v2_list.zip` | `ca_v2_list.csv`, the updated CA list (8.4 MB unzipped) |
| | `waterline_pipeline-v1.zip` | First version of the pipeline (superseded by folder 09) |
| [08-task-specs](08-task-specs/) | `TASK_2…`, `TASK_3…`, `TASK_4…`, `TASK_5…`, `TASK_6…`, `TASK_9…` `.md` | Canvases: one spec per task |
| | `job_ads_searches.csv` | Task 2 input: 581 searches (7 job phrases × 83 cities in CA, TX, FL) |
| [09-waterline-pipeline-latest](09-waterline-pipeline-latest/) | `waterline_pipeline.zip` | **Latest** pipeline ("Sep 25, 1:40am (final)"): schema SQL, Task 8/9/2 SQL, `pipeline/` (match_rules, adapters, ingest, classify, phones), 24 tests, `ghl-call` edge function, AI check prompt, `README_MOHIMENUL.txt`, `SYSTEM_MAP.txt`, CA test data |

The Task 8 copy of `MATCHING_KIT.txt` is byte-identical to the one in folder 01, so it isn't
duplicated. The v1 pipeline zip lacks `task9_phones.sql`, `job_ads_table.sql`, the `ghl-call`
function and the AI check prompt; its `README_MOHIMENUL.txt` says to replace any copy without
`task9_phones.sql`.

## Where this touches our repo

- **Two Supabase designs now exist.** Kevin's `supabase_v1_schema.sql` (in the latest zip) defines
  `shops`, `calls`, `shop_phones`, `raw_pages`, `sets`, plus `source_records` / `needs_check` (Task 8)
  and `job_ads` (Task 2), and targets the project "screener-helper". Our
  [supabase/core_tables.sql](../../supabase/core_tables.sql) defines `shops`, `shop_raw`, `call_log`
  (design in [docs/supabase-design.md](../supabase-design.md)), and the screener logs to
  [screener_log](../../supabase/screener_log.sql). These needed reconciling before Task 4 or Task 8 loaded data (resolved 2026-09-26: Kevin's schema is live, see `docs/plan-2026-09-26.md`).
- **Task 5 overlaps the screener we already run.** Kevin's spec is a Supabase `ghl-call` edge function
  plus a `calls` table; ours is n8n workflows writing `screener_log` (see Mohimenul's status reply).
- **Repo question is open:** Kevin's notes ask `trade-lead-pipeline` or a new repo;
  `README_MOHIMENUL.txt` says a new private repo `waterline-pipeline`, with every change as a PR that
  Kevin's Claude reviews.
