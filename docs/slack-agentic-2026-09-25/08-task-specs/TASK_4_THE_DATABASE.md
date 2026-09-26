# TASK 4: THE DATABASE (Mohimenul, with Kevin's Claude)

### Why this matters
Supabase is the one place where the truth about every shop lives:

- who the shop is
- all its phone numbers
- every piece of data we've collected about it
- every call we've made to it
- where it stands: never called, in the screener's queue, owner confirmed, with Kevin, or out

GHL is only where calls happen. If GHL and Supabase ever disagree, Supabase is right.

Without this database, we can't tell who has been called, we can't stop duplicates, and nothing can run on its own.

### What goes in it

| Table | What it holds |
|---|---|
| shops | One row per shop: name, main number, city, owner, licence, scores and status |
| shop_phones | Every phone number for every shop, and where each one was found |
| calls | One row per call: who called, the result, the recording and the AI check |
| sets | Every batch sent to GHL |
| raw_pages | Long text: website pages, reviews, job ads |
| source_records | Every record any tool ever gave us, and which shop it belongs to (Task 8) |
| needs_check | Records the program wasn't sure about (Task 8, worked by Tausif in Task 1) |
| job_ads | Every receptionist job ad we found (Task 2) |

Plus these ready-made parts:

- **log_call**: saves a call and updates the shop
- **record_ai_check**: saves the AI's opinion of a call
- **attach_transcript**: adds a transcript that arrived later
- **shop_call_state**: shows who has been called and who hasn't
- **screener_hourly** and **screener_daily**: the productivity numbers

### Step 1. Access (5 minutes)

1. Open the Supabase project **screener-helper**, which already exists.
2. Give Kevin owner access: Organization settings, then Team, then Invite, using Kevin's email with the role **Owner**.
3. Don't share the "service_role" key with anyone, and never paste it in a chat. Only the automations use it.

### Step 2. Create the tables (10 minutes)

1. Unzip waterline_pipeline.zip.
2. In Supabase, open **SQL Editor**, then **New query**.
3. Paste in all of **supabase_v1_schema.sql** and click **Run**.
4. Start another new query, paste **task8_tables.sql**, and click **Run**.
5. Start another new query, paste **job_ads_table.sql**, and click **Run**.
6. Open **Table Editor**. You should see all 8 tables from the list above.

All 3 files are tested and safe to run twice. They only add things and never delete anything.

**Leave the existing table screener_log alone.** We use "calls" instead, because it's already connected to the shops, the attempt counts, the owner's first name and the productivity numbers.

**Kevin's Claude can do Steps 2 and 3 directly if Kevin says yes.**

### Step 3. Load the California shops (Kevin's Claude, or Mohimenul)
The file is **ca_v2_list.csv** (unzip ca_v2_list.zip). It has 18,413 shops.

**Shop IDs:**

- California shops keep their licence number as their ID, for example **715306**.
- Texas shops will be **TX-RMP-** plus their licence number.
- Florida shops will be **FL-** plus their licence number.
- New shops found later automatically get **WL-000001**, WL-000002 and so on.

**What goes where:**

- **shops:** shop_name, dial_number, city, state, zip, timezone, website, owner_first, owner_last, licence_number, licence_status, size_group, segment, tier and status.
   - Everything else goes into the "extra" column: the legal name, street address, priority, workers' comp, licence date, PPP jobs, Google review count, Google place ID and the random-control flag.
   - Task 8 needs the legal name and address to match records, so they have to be there.
- **shop_phones:** one row for the dial number, one for the licence phone, and one for each alt phone. Mark which one came from the Google listing.

**Check:** the shops table has 18,413 rows, and none are duplicates.

### Step 4. Bring in the old GHL contacts (through Task 8, not directly)
We've already called some of these shops. They must end up attached to the right shop, never added as a second copy.

1. In GHL, sub-account **Waterline Growth**, open **Contacts**, select all, and **Export** to CSV.
2. Send the file to Kevin. Kevin's Claude writes the small "adapter" that tells Task 8 which GHL columns mean what.
3. Run the file through **Task 8**. Each contact then:

   - attaches to its shop, and that shop's **ghl_contact_id** gets filled in, or
   - becomes a new shop, if it isn't on the licence list, or
   - goes to needs_check.

4. A contact counts as **called before** if its **Last Call Timestamp** or **Call Disposition** field isn't empty. Set those shops' status to **called_before**, so the nightly batch never sends them to the screener again.
5. **Don't change anything in GHL.**

### Step 5. Check it (send these to Kevin)
Run these in the SQL Editor and screenshot the results:

1. `select status, count(*) from shops group by status;`
2. `select count(*) from shop_phones;`
3. `select * from shop_call_state limit 50;`
4. Proof of no duplicates: `select dial_number, count(*) from shops where dial_number is not null group by 1 having count(*) > 1;`

   - This should return 0 rows, or only numbers that Task 8 flagged as shared.

Kevin's Claude compares the numbers with what they should be.

### Keeping it safe

- **Free plan warning:** Supabase free projects **pause after a week with no activity** and have **no backups**. Before we go live, Kevin decides on moving to the Pro plan (about $25 a month), which adds daily backups.
- **Weekly backup:** every Friday, export the shops and calls tables to CSV and save them in Drive, in a "Backups" folder.
- **Never delete** a shop, a call or a record.

### Done when
All 8 tables exist, the California shops and their phone numbers are loaded, the old GHL contacts are attached with no duplicates, and Kevin's Claude can read everything.
