# Additional hread context

okay so i need to send the instructions over to tausif so he can build the list and the automations etc. Tell me the exact steps for getting the lsit and full context that i can send to him. Also what do we do about the leads that wew already have? do we need to still do all of ca tx and fl even though we have alot of them? how do we prevent from paying double?

The files are ready. Send Tausif the zip above and the new Notion page **Team instructions > LIST BUILD: CA + TX + FL**. The page has the full context and every step, in order.
**Message to send him:**

> 

Tausif, new job: build the full plumber list for California, Texas and Florida. The steps are in Notion (Team instructions > LIST BUILD: CA + TX + FL) and the zip has every search. Start with Step 0. If you already ran Test 5, skip it and send me those results. Always use the Standard queue on DataForSEO, check the DATA LOG before running anything so we never pay twice, and stop and message me if a step goes over its budget.

**The steps, short version:**
 0. Run the LA, Houston and Miami rows first, then wait for my go. This checks cost and whether Yelp is worth it.
- Google area search for all 3 states: 41,580 searches, about $25-40.

- Yelp area search, only if Step 0 shows Yelp finds shops Google misses.

- Texas and Florida licence files (free).

- He uploads, and I merge everything into one list.

- Cheap check on every shop (newest reviews, ads, phone type): about $150-250 one time.

- Daily full checks on only the next 20-40 shops going to Topu: about $3-10 a day.

After that, he sets up the GHL pipelines, including a training pipeline for Tier 3-4.

**Your existing leads:** yes, we still need to search all 3 states. There are about 10,900 contacts in GHL and 18,400 California licence shops, but most are just a name and a phone number. Only about 1,850 have any Google data, and none of that says who's busy. Texas's licence file lists people, not shops, and only 28% could be found. The area search is the cheap part (about $25-40 for all 3 states), so it's worth running. Your existing leads aren't wasted, though. I pull them from GHL myself and keep their call history. Anyone who said stop or not interested never goes back to Topu. Owners you already reached go straight to your pipeline if they're Tier 1-2.

**How we avoid paying twice:**
- **One list.** Every shop is in it once, matched by its Google ID and phone number.

- **Check the DATA LOG before any run.** A search that's already logged isn't run again.

- **Reuse recent data.** Reviews and websites are reused for 30 days, ads for 14 days, and a phone type is checked only once.

- **Test 5 rows are marked.** If he already ran them, he skips them.

One thing to settle: Mohimenul already has the nightly program code. My suggestion is Tausif handles the data pulls and the GHL setup, and Mohimenul handles the nightly program.

✅ Exact steps and full context for Tausif: Notion page + zip + message above
 ✅ Existing leads: we still search all 3 states (cheap); I pull your GHL leads and keep their call history
 ✅ Avoid paying twice: one list, DATA LOG check, reuse windows, Test 5 rows marked

Sources:
- [DataForSEO Google Maps SERP API pricing](https://dataforseo.com/pricing/serp/google-maps-serp-api)

- [TSBPE free licensee list](https://tsbpe.texas.gov/free-licensee-list/)

- [Florida DBPR construction industry public records](https://www2.myfloridalicense.com/construction-industry/public-records/)

List build ca tx fl
ZIP

Can you go over the entire process for how we get the data? from beginning to end and what we do. Exact steps.

The process has two halves. A one-time build finds every shop in all 3 states and does a cheap sort. After that, a daily loop does full checks on only the next shops Topu will call.
**Part 1. One time: build the list**
- **Pull what we already have.** I pull every GHL contact with its call history (about 10,900) plus the California licence list (about 18,400). Free.

- **Google area search.** Tausif searches every ZIP code plus the gaps between them, 6 search words each. That's 41,580 searches, about $25-40. LA, Houston and Miami go first as a check.

- **Yelp area search.** Only if that check shows Yelp finds shops Google misses.

- **Texas and Florida licence files.** Free downloads.

- **Merge into one list.** I make sure each shop appears only once and drop non-plumbers, franchises, closed shops and duplicates. Old leads keep their history: anyone who said stop or not interested never goes back to Topu.

- **Cheap check on every shop.** Tausif pulls the newest 20 Google reviews and checks whether each shop runs Google ads. I read the reviews for signs of office staff, the owner answering, and home jobs. Phone type (cell or office line) gets checked for the busy shops only. About $150-250, once.

- **First sort.** Every shop lands in one of four groups: busy and callable, maybe-owner backup, Tier 3-4 (saved, training only), or out. Every score is saved in the audit history.

**Part 2. Every day: feed Topu**
- **Pick the batch.** Urgent shops first, then Tier 1, then Tier 2, spread across the 3 time zones. Only enough to keep about 2 weeks of confirmed owners waiting for you, roughly 15-25 new shops a day.

- **Full check on that batch only.** Fresh Google and Yelp reviews, Facebook and Angi pages, the website, website visitors and job ads. About $3-10 a day.

- **Final score.** Owner and home jobs get re-checked, then the shop gets its tier. That's saved too.

- **Check calling hours** in the shop's time zone, and the stop list.

- **Load into Topu's GHL pipeline** (columns: Urgent, The Rest). Each card shows the dial number, owner name, tier and why we're calling.

- **Topu calls.** If the owner answers, the shop moves to your pipeline (Urgent, Tier 1, Tier 2). If it's an office, receptionist or family member, it's out. No answer means a retry.

- **You call.** The outcome, the recording and a short AI summary get saved, along with the score the shop had when you called.

**Part 3. Every day: urgent watch (about $10 a day)**
- New receptionist job ads, reviews that mention missed calls, and storm alerts.

- Urgent shops that pass the owner and home-jobs checks jump to the top of the next day's batch.

**Part 4. Training list**
- In his spare time, Topu screens Tier 3-4 shops where the owner likely answers. Confirmed owners go into a separate Training pipeline for your sister and new closers.

**Part 5. Every 1-3 months**
- Search again for new shops, refresh the licence files, rescore everyone, and re-check websites.

- Once a month, compare tiers with real results (confirmed owners, demos, sales) and fix the rules.

**What isn't built yet:**
- The new tier rules you decided aren't in the scoring code yet; it still runs the old version.

- Job-ad matching is too loose: 20 of 26 automatic matches were wrong.

- The check for mostly-commercial shops has to run before the tier rules.

I'll fix all three before the first batch goes to Topu.

I replaced the old Notion Steps page with this version and kept the earlier notes below it as history.

✅ Entire process, beginning to end, exact steps

Here's the full process in order, with the tool and the person for each step.
**A. Get every shop** (once, whole state, all 3 states at the same time)
- **Licence files.** California we already have. Texas and Florida come from the state boards. Free. Tausif.

- **Google search** of every ZIP code plus the gaps, 6 search words each. DataForSEO (Google Maps, cheapest speed setting). About $25-40. Tausif.

- **Yelp search** of every ZIP code. Apify or Outscraper, whichever wins the 10-row test. Price isn't known yet, and Tausif stops at $300. Tausif.

- **Your old leads with call history.** Pulled from GHL. Free. Me.

**B. One list**
 5. **Matching kit** on all of it together. One row per shop; non-plumbers, franchises, closed shops and duplicates are removed. Saved in Supabase. Me.

**C. Cheap check** (about 2,000 shops at a time, busiest first, about $10-20 per 2,000)
 6. **Newest 20 Google reviews.** DataForSEO. Tausif.
 7. **Google ads check.** DataForSEO. Tausif.
 8. **Read the reviews** for office staff, the owner answering, and home jobs. Me.
 9. **Phone type** (cell or office line), for busy shops only. Twilio. Tausif.
 10. **Sort** into callable (Tier 1-2), maybe-owner backup, Tier 3-4 saved, and out. Me.

**D. Full check** (about 100-150 shops a week, only the ones Topu calls next, about $15-40 a batch)
 11. **Fresh Google reviews.** DataForSEO.
 12. **Yelp reviews and Yelp ads.** Apify.
 13. **Facebook page and reviews.** Serper finds the page, Apify reads it.
 14. **Angi and HomeAdvisor pages.** Serper finds them, Apify reads them.
 15. **Website:** office signs, owner signs, home services, hiring banner and ad code. Our own crawler, free.
 16. **Website visitors.** DataForSEO.
 17. **Paid Google local ads.** SerpApi.
 18. **Job ads.** DataForSEO (Google Jobs).
 19. **Size hint.** PPP loan file, free.
 20. **Read everything new.** Me.

Tausif runs steps 11-18.

**E. Score and load**
 21. **Final score and tier.** Our scoring code, saved in the audit history. Me.
 22. **Calling hours check** for the shop's time zone, plus the stop list. Me.
 23. **Load into Topu's GHL pipeline** (Urgent, The Rest). Tausif for now, the nightly program later.

**F. Urgent watch** (every day, about $10 a day)
 24. **Receptionist job ads.** DataForSEO (Google Jobs).
 25. **Missed-call reviews.** DataForSEO for Google (weekly), Apify for Yelp (monthly).
 26. **Storms.** National Weather Service, free.
 27. **Urgent shops that pass** get a full check and jump to the top of Topu's pipeline.

Every step saves its raw file to Drive and adds a row to the DATA LOG, so nothing gets bought twice.

This is now at the top of the Notion Steps page as the quick version.

✅ Full step by step, with which tool for what
