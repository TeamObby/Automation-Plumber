# TASK 2: JOB ADS HOT LIST (suggested: Tausif)

### Why this matters
A small plumbing shop that posts a job ad for a **receptionist** is telling us 3 things:

1. The owner answers his own phone today.
2. It's hurting him: he's missing calls.
3. He has the money to fix it.

That's WaterLine's best possible customer, and Kevin wants to call these shops first, any day, in any state.

There are 2 kinds:

- **HOT:** a small shop with **no** signs of an office. He's hiring his **first** receptionist, so he's the owner answering today. He goes to the top of the list.
- **Replacing:** a small shop that **already** shows office signs (reviews mention office staff, for example). He's probably replacing someone who left. Call him soon, but not first.

### Files

- **job_ads_searches.csv**, sent above: 581 searches, which is 7 job phrases times 83 cities in CA, TX and FL.
- **job_ads_table.sql**, in the zip.
- **pipeline/classify.py**, in the zip.

### Step 1. Setup (once)
Run **job_ads_table.sql** in the Supabase SQL Editor. It makes the **job_ads** table.

### Step 2. Search every day
For every row in job_ads_searches.csv, run a **DataForSEO Google Jobs** search using the **keyword** and **location_name** columns. Google Jobs already includes Indeed, ZipRecruiter, Glassdoor and company websites, so don't scrape those sites directly.

The 7 phrases are: plumbing receptionist, plumbing dispatcher, plumbing customer service representative, plumbing office manager, plumbing office assistant, plumbing scheduler and plumbing CSR.

If DataForSEO doesn't recognise a city name, use the nearest city it does recognise, and write that down.

**Cost:** about $0.0006 per search, which comes to about **$10 a month**.

### Step 3. Save the ads
Keep only ads **posted in the last 14 days**. For each one, save a row in **job_ads**:

- job_id, title, company, city, state
- posted date, the site it came from, the link, the full ad text, the pay if it's shown
- which search found it

If an ad is already there (same job_id), skip it. Never save the same ad twice.

### Step 4. Keep only plumbing companies
**Keep an ad** if any of these is true:

- the company name contains **plumb, rooter, drain, sewer** or **water heater**
- the company matches one of our shops
- the ad says it's a plumbing company

**Drop an ad**, and write the reason in drop_reason, if:

- it's a **staffing agency** (the name has staffing, recruiting, talent, workforce or personnel, or the ad says "our client")
- it's a **franchise** (Roto-Rooter, Mr. Rooter, Benjamin Franklin Plumbing, Rooter-Man, Bluefrog Plumbing + Drain, Zoom Drain, 1-800-Plumber, ARS / Rescue Rooter, Mr. Handyman). Kevin's Claude keeps the full list in the code.
- it's a **property manager** or a hotel, hospital, school or government office. Those are in-house plumbing jobs.

### Step 5. Find the actual shop
Job ads usually don't have a phone number.

1. Search **DataForSEO Google Maps** for the **company name + city**.
2. Put the result through **Task 8** (list upload and merge):

   - **ATTACH:** it's a shop we have. Write its shop_id on the ad.
   - **NEW_SHOP:** a plumber we didn't have. It's added automatically.
   - **NEEDS_CHECK:** it goes to Tausif's pile (Task 1). **Never guess.** A wrong business means a wasted call on our best kind of lead.

### Step 6. Mark the shop
On the shop in Supabase, save the ad's date, title and link in the "extra" column. That tells the scoring that this shop has a receptionist ad.

### Step 7. Score it and put it in the queue
The next nightly batch (Task 3) picks up shops with a new ad **first**. It pulls their fresh data and scores them with classify.py, with "receptionist ad" = yes:

- **HOT:**
   - Put it at the top of the Screener queue (Call Order = 1).
   - Tag it **hiring-front-desk**.
   - Add a GHL note: "Hiring: [job title], posted [date], [link]".
- **Replacing:**
   - Tag it **hiring-replacing**.
   - Normal queue.
   - Add the same note.
- **6 or more staff, or the owner is unlikely to answer:** no action. Record the result on the ad as "no action".

Write the result on each ad: hot, replacing, no action or needs check.

### Step 8. Week 1 is a test (it can be semi-manual)
At the end of week 1, send Kevin:

1. **The funnel:** ads found → plumbing companies → matched to a shop → HOT → replacing.
2. **10 HOT shops**, with the ad link and the shop's Google listing. Kevin's Claude checks that each one is really a small plumbing shop hiring its first receptionist.

If it looks right, it runs by itself every day from week 2.

**Kevin's part:** Kevin writes a special opener for these shops (something like "saw you're hiring a receptionist..."). It's needed before HOT shops go to Kevin's calls.

### Every week after that
Send Kevin: ads found, HOT shops, how many the screener confirmed as owner-answered, demos booked, and deals closed from job ads.

### Done when
It runs every day by itself, saves every new ad once, and HOT shops show up at the top of the screener's list with their note.
