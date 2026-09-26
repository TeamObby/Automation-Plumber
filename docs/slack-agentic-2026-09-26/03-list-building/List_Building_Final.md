# List Building Final

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
