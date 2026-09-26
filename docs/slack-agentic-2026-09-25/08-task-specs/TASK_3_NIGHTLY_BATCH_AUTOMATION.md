# TASK 3: NIGHTLY BATCH AUTOMATION (Mohimenul)

### Why this matters
The screener (Topu) calls about 300 shops a day. The information about a shop goes stale quickly, so we don't prepare the whole list at once. Every night, a program prepares the next 200-300 shops with fresh data, scores them, and puts only the good ones in the screener's queue in GHL. It runs by itself, so nobody has to build lists by hand.

### Needs first

- **Task 4:** the shops are in Supabase.
- **Task 8:** the upload and merge program works.

Build this third.

### What's already written (waterline_pipeline.zip)

- **pipeline/ingest.py** (Task 8): matches everything a tool returns to our shops, with no duplicates.
- **pipeline/classify.py**: the scoring rules.
   - Owner class: likely, maybe or unlikely to answer his own phone.
   - Home-jobs class: likely, unsure or unlikely.
   - A value score from 0 to 100.
   - The HOT flag.
- **pipeline/phones.py** (Task 9): picks which of the shop's numbers to call.

You write **one script, batch.py**, that runs these in order every night.

### Setup (once)

1. **Put batch.py in the GitHub repo**, next to the pipeline folder.
2. **Add these secrets to the repo** (GitHub, then Settings, then Secrets). Never put keys in the code:

   - SUPABASE_URL and SUPABASE_SERVICE_KEY
   - DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD
   - GHL_TOKEN: a private integration token from the GHL sub-account "Waterline Growth"
   - ANTHROPIC_API_KEY: for Claude reading reviews and websites
   - SLACK_WEBHOOK_URL

3. **Add a GitHub Action** that runs batch.py every night at about **3am Pacific**, before the screener's first shift. The screener starts with Florida mornings.
4. **GHL details you'll need:**

   - location "Waterline Growth" = **rzaMhqeo2apNI1p6DG5z**
   - pipeline "Screener — Plumbers" = **CvDwpavqkHSRhg5Bn3L4**
   - the "Screener queue" stage: Tausif is creating it now, so get its ID from him

5. **Ask Tausif for 2 new GHL fields:Other Phones** (text) and **Call Order** (number). The screener's list is sorted by Call Order.

### What batch.py does every night (8 steps)

1. **Check whether the screener needs more shops.** Ask GHL how many opportunities are in the "Screener queue" stage. If it's **900 or more** (3 days of calls), post "Queue full, no batch tonight" in Slack and stop.
2. **Pick about 400 candidates from Supabase**, from the shops table:

   - Only shops that haven't been called and aren't in GHL yet: status "new" and no GHL contact ID.
   - Best pre-score first.
   - A third from each state (FL, TX, CA). Until Texas and Florida are loaded, use California for the rest.
   - Add **30 "random control" shops** every night, whatever their score, until all 300 have been called. They're marked random_control. They show us whether the scoring actually works.
   - Why 400: some shops drop out once we see their fresh data, and we want 200-300 to remain.

3. **Pull fresh data** for each candidate, from DataForSEO:

   - **Google Maps search by the shop's licence phone.** If that finds nothing, search by name + city.
   - **The newest 100 Google reviews** for the matched listing, including review dates.
   - **The phone check** with ClearoutPhone, which we already use, until Test 3 picks the winner. It shows whether the number works and whether it's a cell or an office line.
   - Save everything the tools send back, exactly as it came.

4. **Put every result through Task 8** (ingest.py). Only MATCH results get used. NEEDS CHECK results go to Tausif's pile, and that shop waits.
5. **Claude reads the reviews and website** for every matched shop. Send each shop's reviews and website text to Claude with the **reading prompt** below. Claude answers yes or no for each item, with a quote as proof.
6. **Score it.** Combine Claude's answers with the facts the program already has into one set of facts, and run classify.evaluate(facts). The program already has:

   - reviews in the last 12 months, the last 6 months and the 6 months before, counted from the review dates
   - cell or office line, from the phone check
   - a number shared with other businesses, from Task 8
   - years licensed and sole-owner status, from the licence
   - size, from workers' comp or PPP

The result says, for each shop: **call pool**, **HOT**, **saved for later** or **out**, plus its priority. Save all of it in the shops table.

1. **Send the good ones to GHL:** only **call pool** and **HOT** shops, 200-300 in total.

   - Create or update the contact:
      - name and owner's first name
      - main phone = the number from phones.py (Task 9)
      - Other Phones and TZ (the time zone)
      - Call Order: HOT shops first, then by priority
      - a batch tag like **set-CA-A1-S01**
   - Create its opportunity in "Screener — Plumbers", stage **Screener queue**.
   - Save the GHL contact ID in Supabase.

2. **Post a summary in Slack:** candidates picked, matched, needs check, dropped out (and why), call pool, HOT, sent to GHL, and the cost tonight.

### The reading prompt (for step 5)
> You are reading one plumbing shop's customer reviews and website text. Use only what is written. Answer in JSON with these keys, each **true** / **false** / **null** (null = nothing written about it), and for every **true** give the exact quote that proves it:

> - **office_in_reviews**: a review from the last 2 years mentions office staff, a receptionist, a dispatcher, "the office", or a family member answering the phone.
> - **owner_answer_reviews**: reviews say the owner answered the phone, came out, or did the job himself.
> - **home_reviews**: reviews describe work at people's homes (kitchen, bathroom, water heater, house).
> - **commercial_mostly**: reviews or website are mostly about commercial buildings or new construction.
> - **office_on_website**: the website says "call our office", mentions an answering service, or has a chat receptionist.
> - **owner_run_website**: the website says owner-operated, family-run by the owner, or writes as "I".
> - **home_services_website**: the website lists home services (repairs, drains, water heaters, remodels).
> - **call_driven_work**: repairs, drains, water heaters, 24/7 or emergency service.
> - **team_size**: a number if reviews or the website say how many people work there, else null.
> - **techs_named**: how many different technician names appear in the reviews.

### Test before it goes live

1. **First run by hand.** Run it, but **don't send anything to GHL** yet. Send Kevin the list of shops it picked, with their classes and reasons. Kevin's Claude checks it.
2. **Second run:** send to GHL, then open GHL and confirm the shops show up in "Screener queue" in the right order.
3. **Run it again the same night:** it should find the queue full and stop, or add only new shops. It must never create duplicates.
4. **Then switch on the nightly schedule.**

### Cost

- DataForSEO is about $4 a night.
- Claude reading 300-400 shops a night could cost more than $50 a month. Before it goes live, Kevin's Claude will price it and Kevin decides. We can read only the newest 50 reviews to keep it cheap.

### Send Kevin
The test-run list, a screenshot of the GHL queue, and the first 3 Slack summaries.

### Done when
It runs every night on its own, the queue never runs empty, the Slack summary arrives every morning, and there are no duplicates in GHL.
