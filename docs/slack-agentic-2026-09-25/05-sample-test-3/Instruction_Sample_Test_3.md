# Instruction Sample Test 3
Here's the zip for Tausif. It has one file per tool, numbered to match the steps below. It covers 150 shops, 100 in California and 50 in Texas. Once Hridoy sends you the Florida file, I'll add a small extra set of 50 Florida shops.

**Tausif's steps (Round 1)**

1. **DataForSEO, Google Maps by phone:** use file 1 (94 shops that have a phone). Use "keyword" as the search and "location_name" as the location. Turn on reviews: newest first, 100 per shop. Download the results.
2. **DataForSEO, Google Maps by name:** use file 2 (all 150 shops), with the same settings as step 1. Download the results.
3. **Outscraper, Google Maps:** upload file 3 and use the "query" column as the searches. Limit 1 result per query, all fields on. Download the results.
4. **Yelp, run it twice on file 4:**

   - Apify, with the Yelp actor that worked last time: use "search_term" and "location", or the "yelp_search_url" column if the actor asks for links. Turn reviews on, up to 50.
   - Outscraper Yelp: use the "yelp_search_url" column, with reviews on, up to 50.

Download both.

1. **Serper:** run every row of file 5 (1,050 searches) and keep the top 3 results per search. This finds each shop's Facebook, Angi, HomeAdvisor, Thumbtack, BBB, Houzz and Porch pages. Download the results.
2. **Phone check:** upload file 6 to ClearoutPhone (bulk upload, Smart validation on). Then run the same file through Twilio Lookup with Line Type Intelligence. Download both.
3. **Plumbers in 3 areas:**

   - DataForSEO: run file 7a. It has 27 searches, one per row: keyword "plumber", location_coordinate as given, depth 100.
   - Outscraper: run file 7b (3 searches, limit 500 each).

Download both.

1. **Send it all back:**

   - every download in one folder, zipped
   - one line per tool with what it cost
