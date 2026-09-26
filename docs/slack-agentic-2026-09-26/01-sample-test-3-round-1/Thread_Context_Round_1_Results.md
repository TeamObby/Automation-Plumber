# THread COntext

Got all 15 files. I'm grading them now against the California answers I kept. First look from Tausif's notes: the whole test cost about $7.30, and Twilio vs ClearoutPhone already shows a clear difference. I'll send the full results shortly.

Round 1 is graded. There's a clear winner in every head-to-head, and **0 wrong businesses got through the matching rules**. The whole test cost about $7.30, roughly 5 cents a shop. Results are saved in Notion as **SAMPLE TEST 3: ROUND 1 RESULTS**, and the Round 2 files for Tausif are above.

**The winners**
- **Google lookup: DataForSEO.**

  - It found the right shop for 55 of the 150, against 36 for Outscraper.

  - Outscraper returned the wrong business 45 times (the rules caught every one); DataForSEO did that only 5 times.

  - The 3 cases where I already knew the answer was a different business were all caught.

- **Yelp: keep it, and use Apify.**

  - Both tools found the same 56 shops, but Apify cost about half as much.

  - Yelp matters more than I expected. It found **22 shops Google didn't (15%)**, and 13 shops have recent Yelp reviews but none on Google.

- **Phone check: Twilio.** Twilio shows the phone company a number is with now. ClearoutPhone shows the one it started with.

  - 7 numbers ClearoutPhone called landlines have since moved to cell companies.

  - Twilio answered all 16 that ClearoutPhone could only call "landline or cell".

  - Twilio also spots virtual numbers, like RingCentral or Twilio numbers, which can mean a call-tracking line.

- **Finding every plumber in an area: DataForSEO, searching point by point.** It found 499 plumbers in the 3 test areas; Outscraper found 92. Outscraper did find 26 that DataForSEO missed, mostly in Houston, so we'll space the search points closer together.

**Problems it uncovered**
- **The phone search used the wrong DataForSEO lookup.** It found only 35 of 94 shops by phone. It needs to be the Maps search we used in September, which found 77 of 100 then. It costs about 6 cents to redo, and it's in Round 2.

- **Neither tool shows Yelp ads ("Sponsored").** I'm dropping that signal.

- **Texas coverage is low: 14 of 50 found.** The Texas licence file lists individual master plumbers, many of whom work for someone else's company, and half have no phone number. Texas needs a different starting list. I'll work out options.

- **Tausif's own Yelp matching was too loose.** Matching on "same name in the same state" isn't enough. The rules flagged those as "needs check", so nothing wrong got in, but the tools should never be trusted on their own matching.

**Round 2 for Tausif** (5 files in the zip, lettered to match):
- **File E:** rerun the phone search with DataForSEO **Google Maps search** (the same kind as step 7a), not "My Business Info". Same settings otherwise, and pull the newest 100 reviews for each shop found.

- **File A (53 websites):**

  - DataForSEO **Google Ads Transparency**: search each website address.

  - Crawl each website (home, about, services and contact pages) and save the text.

- **File B (pages found by Serper):**

  - Run Apify on each page link to get: review count, review dates, and any badge (Angi Approved, HomeAdvisor Screened & Approved, Thumbtack Top Pro).

  - For every **Facebook** link, also check the **Meta Ad Library website** (logged out) and record whether it's running ads.

- **File C (495 searches):** DataForSEO Google Maps "plumber" at each point, depth 20.

- **File D (188 searches):** DataForSEO Google search in each city. Save the whole results page, so I can find the paid "Google Verified" ads section.

- **Send it back the same way:** one zip plus a notes file with the cost of each tool.

Meanwhile, I'll do the second check on the 34 "needs check" shops.

**Your messages:**
- ✅ Test 3 results: graded above, with a winner for each tool and 4 problems found. Round 2 is ready for Tausif.
