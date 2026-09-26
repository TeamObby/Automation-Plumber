# TASK 8 FOR MOHIMENUL: LIST UPLOAD AND MERGE
**What it is:** one program that every list and every tool result goes through before it reaches the database. It takes a list (a Google search, Yelp, a licence file, job ads, anything) and, for each record, decides:

- **ATTACH:** it's a shop we already have. Add the new info to that shop.
- **NEW_SHOP:** it's a plumber we don't have yet. Add a new shop.
- **UPDATE:** we've already saved this exact record. Refresh it; don't add it twice.
- **NEEDS_CHECK or CONFLICT:** not sure, or it could be two different shops. Put it on a list for review and never guess.
- **SKIP:** not a plumber. Ignore it.
- **NO_MATCH:** we searched for one specific shop and this result isn't it.

**Why it matters most:** without it, every new list creates duplicates and wrong matches. Then the screener calls the same shop twice, or calls the wrong business. The nightly batch, the job ads and every new state all depend on it.

**What's already done (in the zip):**

- pipeline/match_rules.py: the matching rules
- pipeline/adapters.py: turns each tool's columns into our standard format, one small piece per tool
- pipeline/ingest.py: the merge program itself. It doesn't compare every record with every shop. It looks shops up by phone, then by street and zip, then by name in the same city, so it stays fast.
- tests/test_pipeline.py: 24 tests
- test_data/: a real California test
- task8_tables.sql: the 2 new tables he needs

**What he builds:** the connection between this program and Supabase.

**Step 1. Check that the code works on his computer (10 minutes).**

1. Unzip waterline_pipeline.zip and open a terminal in that folder.
2. Run `python -m tests.test_pipeline`. It should say "24 of 24 tests passed".
3. Run `python -m pipeline.ingest test_data/shops_CA_licence.csv test_data/old_google_list_CA.csv old_google_list my_result.csv`
4. It should take about 12 seconds and print exactly these counts: NEW_SHOP 661, ATTACH 1477, NEEDS_CHECK 135, SKIP 331, UPDATE 62, CONFLICT 1. His my_result.csv should match test_data/expected_result.csv.
5. Screenshot both results for Kevin.

**Step 2. Set up the tables in Supabase** (project "screener-helper").

1. Open the SQL Editor, paste supabase_v1_schema.sql and run it.
2. Then paste task8_tables.sql and run it.

Both only add tables, and both are safe to run twice. I tested them on a fresh database. This adds:

- source_records: every record ever uploaded, and which shop it went to. The same record can never be saved twice.
- needs_check: the review list.

**Step 3. Write the connector.** This is his real work. It's a small script that does 4 things every time a file is uploaded:

1. **Read the shops from Supabase** and turn each one into the format the program expects:

   - business_name = shops.shop_name
   - other_name = the legal name stored in shops.extra
   - phone_1, phone_2 and so on = every number for that shop in shop_phones
   - address = the street address stored in shops.extra
   - city, state, zip and website = the matching columns in shops

2. **Read the records already saved** from source_records (source, source_id, shop_id), and pass them in as `seen`. That's how the program recognises repeats.
3. **Run `ingest(shops, records, adapter_name, seen)`** with the right adapter for the tool.
4. **Write each result back:**

   - ATTACH: save the record in source_records, fill in the shop's empty columns, and add any new phone numbers to shop_phones
   - NEW_SHOP: add a row to shops (the program gives the ID) and save the record in source_records
   - NEEDS_CHECK or CONFLICT: add a row to needs_check
   - UPDATE: update last_seen and the saved copy in source_records
   - SKIP or NO_MATCH: save it in source_records with that action, so the program remembers it next time

**Step 4. Test it in Supabase.**

1. Run the connector on test_data/old_google_list_CA.csv against the California shops in the database.
2. The counts should be close to Step 1. Some will differ, because the database has shops that the test file doesn't.
3. Run the same file a second time. Everything should now come back as UPDATE, with no new rows. That proves there are no duplicates.
4. Send Kevin the counts from both runs, and export 50 random ATTACH rows (shop name, city, the tool's name, phone). I'll check them.

**Step 5. Every new tool from now on:** add one small adapter in adapters.py and one test in tests/. Nothing else changes.

**Rules:**

- Nothing goes into the database except through this program.
- Never delete shops or records.
- Don't change match_rules.py without Kevin's OK. It holds the business rules.
- If many CONFLICTs show up, stop and send Kevin the file.

**Who loads the California shops:** Kevin's Claude can load the 18,413 shops, including the legal names and addresses, once Kevin says yes. Otherwise Mohimenul loads ca_v2_list.csv.

**What to send Kevin:**

1. The screenshot of "24 of 24 tests passed"
2. The screenshot of the Step 1 counts
3. The counts from the 2 runs in Step 4
4. The 50 sample matches
