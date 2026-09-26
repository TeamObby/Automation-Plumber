# Major Tasks
**1. Matching kit (Tausif)**

1. The rules are already built into the code (match_rules.py). Once feature 8 is running, every upload is checked automatically.
2. Until then, for any list pulled by hand, paste the MATCHING KIT into Claude along with the list and our shop list.
3. Only use records rated MATCH HIGH or MEDIUM. Put NEEDS CHECK records in a separate file for Kevin.
4. For every batch, check 20 random matches by hand. If even 1 is wrong, stop and tell Kevin.

**2. Job ads hot list (Mohimenul)**

1. Every day, search DataForSEO Google Jobs for 7 phrases: "plumbing receptionist", "plumbing dispatcher", "plumbing customer service representative", "plumbing office manager", "plumbing office assistant", "plumbing scheduler" and "plumbing CSR". Do this in every metro area in CA, TX and FL (about 70), for ads from the last 14 days.
2. Save every ad in a job_ads table: title, company, city, date, link and text.
3. Keep only plumbing companies. Drop staffing agencies, franchises, property managers and big contractors.
4. Run each company through the list upload program (feature 8) to find its shop.
5. Score it with classify.py, using "receptionist ad" = yes.

   - A small shop with no office signs is HOT: put it at the top of the queue and tag it "hiring-front-desk".
   - A small shop with office signs is probably replacing someone: tag it "hiring-replacing".

6. Add a GHL note with the job title, date and link.
7. Week 1 is a test: send Kevin the counts plus 10 HOT shops with their ad links. Ask Kevin before costs pass $50 a month.

**3. Nightly batch automation (Mohimenul)**

1. Every night, count the shops waiting in GHL's "Screener queue".
2. If fewer than about 900 are waiting (3 days of calls), pick the next 200-300 shops by priority, mixed across FL, TX and CA.
3. Pull fresh data for them: the DataForSEO lookup and reviews, plus the other tools once Test 3 picks them.
4. Put the results through the list upload program (feature 8).
5. Score them with classify.py. Send the shops in the call pool, plus any HOT shops, to GHL's "Screener queue" with Dial Number, Other Phones and the owner's first name.
6. Post a summary in Slack: how many shops, how many matched, how many need a check, and the cost.
7. Before turning it on, run it once by hand and send Kevin the result.

**4. The database (Mohimenul, with me)**

1. Use the Supabase project "screener-helper", which already exists.
2. Run supabase_v1_schema.sql. It only adds tables, and I can run it if Kevin says yes.
3. Load the California list into the shops table, one row per shop. I can do this part too.
4. Copy the existing GHL contacts in, keeping each GHL contact ID and marking who's been called before.
5. Send Kevin the number of rows in each table, and I'll check them.
6. Rule: never delete anything.

**5. Call logging, AI check and productivity (Mohimenul)**

1. Keep your screener_log as the only call log. Add these columns: shop_id, number_dialed, how_he_answered, voicemail_greeting, first_name and best_time.
2. Build the Supabase function "ghl-call". GHL sends every call result to it, and it saves a row and updates the shop's status, attempts and first name.
3. **AI check:** every 15 minutes, the AI reads new call transcripts and compares them with what the screener picked. If they don't match, fill in the ai_ columns and tag the contact "screen-mismatch" in GHL.
4. **Productivity:** hourly and daily counts per screener: dials, pickups and owners found.
5. **Idle alert:** if there's no call for 20 minutes during a shift, post in Slack.
6. Test it with 3 fake calls and send Kevin a screenshot.

**6. Screener setup in GHL and phones (Tausif and Hridoy).** You already sent this one. Recap:*Tausif:*

1. Add a "Screener queue" stage before Attempt 1.
2. Add "No Answer" and "Voicemail" to Screener Outcome.
3. Turn Screen Noise into a dropdown.
4. Add these fields: How He Answered, Voicemail Greeting, Best Time To Call and Other Phones.
5. Finish and publish the "Screener Outcome Changed" automation, and add the callback task automation.
6. Send every call result to Mohimenul's function.
7. Test with 3 fake contacts.

*Hridoy:*

1. Buy the California numbers (ask Kevin first).
2. Register them at freecallerregistry.com (http://freecallerregistry.com).
3. Set up no ringing and a silent voicemail.
4. Set up the second WAVV seat as a single line.
5. Turn recording on.
6. Keep each number to 100 dials a day or fewer.

**7. Scoring and finding every shop (me)**

1. When Tausif's California lookup arrives, I build batch 1.
2. I build the Texas list from the Texas licence file.
3. I build the Florida list from Hridoy's Florida file.
4. After Test 3 picks the tool, I set up the area-by-area Google search.
5. Every week, I adjust the points using screener and sales results.
6. What I need from you: the files, when they come in.

**8. List upload and merge (Mohimenul)**

1. The logic is already written and tested: pipeline/ingest.py.
2. Add 2 tables: source_records (every record ever uploaded) and needs_check.
3. Connect the program to Supabase so that for every record:

   - A match updates the existing shop and saves the record.
   - A new plumber becomes a new shop.
   - An unsure record goes to needs_check.
   - A repeat updates the old copy.
   - A non-plumber is skipped.

4. Each new tool gets one small adapter and one test.
5. Test it: run the 24 tests, then run it on the California Google lookup. Send Kevin the counts plus 50 random matches.
6. Rule: nothing goes into the database any other way.

**9. Multiple phone numbers per shop (Mohimenul and Tausif)**

1. The shop_phones table is already in the schema. It holds each number, where it was seen, the line type, whether it works, and whether it's shared.
2. After every call result, run next_number() from pipeline/phones.py.
3. If it returns a new number, put it in GHL's "Dial Number", reset Screen Attempts to 0, and move the contact back to Attempt 1.
4. If it says stop:

   - owner confirmed: move the shop to Kevin's pipeline
   - gatekeeper or out: move it to that stage
   - every number tried: move it to Exhausted

5. Tausif adds the "Other Phones" field in GHL.
6. Test it: make a fake shop with 3 numbers. After 4 no-answers on the first number, it should switch to the second.
