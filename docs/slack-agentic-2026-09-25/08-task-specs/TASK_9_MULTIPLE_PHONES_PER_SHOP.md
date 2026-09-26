# TASK 9: MULTIPLE PHONE NUMBERS PER SHOP (suggested: the same person as Task 5)

### Why this matters
Many shops advertise more than one number, for example one on Google, another on their website, and a cell on Yelp.

- If the first number never answers, the owner might pick up on another one.
- But we must **never** try another number to get around a gatekeeper. If a receptionist answered, that shop is out.

These rules were approved by Kevin.

### The rules

- **One shop = one contact in GHL.** The number the screener dials is the contact's normal **Phone** field. The other numbers go in **Other Phones**, for reference only.
- **Which number comes first:**

   1. The number on the Google listing
   2. Other advertised numbers, cell phones first, and numbers seen in more places first
   3. A number found only in the licence file, last, and only if Kevin says yes. That's a setting, and it's "no" for now.

- **When to move to the next number:**
   - 4 no-answers or voicemails on the current number
   - "Not Sure"
   - "Wrong Number"
- **When to stop the shop (no more numbers):**
   - **Owner:** it goes to Kevin.
   - **Gatekeeper:** it's out.
   - **Do Not Call**
   - **Not A Plumber**
- **Never dial** a dead number, or one shared by 2 or more businesses. Sharing is a sign of an answering service.
- **Every allowed number tried:** the shop goes to **Exhausted**.

### What's already built (in the zip)

- **task9_phones.sql:** the rules inside the database. It adds:
   - 2 columns to shop_phones: **on_google_listing** and **licence_only**
   - a **settings** table, with allow_licence_only_phones = false
   - **next_phone(shop)**, which says which number to call next
   - an updated **log_call**. After every call, it works out the next number, saves the result on that number, and tells GHL what to do.
- **supabase/functions/ghl-call/index.ts:** the webhook now also updates GHL. When the number changes, it sets **Phone** = the new number, **Screen Attempts** = 0, and moves the contact back to **Attempt 1**. When every number has been tried, it moves the contact to **Exhausted**.
- **tests/test_task9.sql:** the test.
- **pipeline/phones.py:** the same rules in Python, for the nightly batch.

### Step 1. Install it (5 minutes)
In the Supabase SQL Editor, run **task9_phones.sql**. Run it **after** supabase_v1_schema.sql, because it replaces the old log_call. It's safe to run twice.

### Step 2. Test it (10 minutes, in a test project, not the live one)

1. Create a free test project in Supabase, or a branch. **Not screener-helper.**
2. Run supabase_v1_schema.sql, then task8_tables.sql, then task9_phones.sql.
3. Run **tests/test_task9.sql**. Every line has to end in **true**:

   - the first number is the Google listing
   - the 4th no-answer switches to the cell
   - a wrong number moves to the next number
   - a gatekeeper stops the shop
   - when every number has been tried, the shop is exhausted
   - a shared number is never dialed

4. Screenshot it for Kevin.

### Step 3. Fill in the phone numbers (with Task 8)
Every time Task 8 attaches a record with a phone number, add that number to **shop_phones** for the shop:

- **sources:** where it was seen, for example "google,yelp". Add to this list if the number is already there.
- **on_google_listing:** true if it came from the matched Google listing.
- **licence_only:** true if it's only in the licence file.
- **line_type** and **valid:** from the phone check (ClearoutPhone for now).
- **shared_with:** how many **other** shops have the same number. If it's more than 0, the number is never dialed.

The nightly batch (Task 3) also writes the other numbers into GHL's **Other Phones** field.

### Step 4. Update the webhook
Redeploy **ghl-call** with the new code from the zip. Add one more secret: **GHL_TOKEN**, a private integration token from the Waterline Growth sub-account with permission to edit contacts and opportunities.

### Step 5. Change 2 branches in Tausif's GHL automation
Now that the database decides, the GHL automation "Screener Outcome Changed" must **not** end the shop on these two results:

- **Wrong Number:** don't move it to Disqualified. Only send the webhook. The function either moves it back to Attempt 1 with the next number, or to Exhausted.
- **No Answer / Voicemail / Not Sure on Attempt 4:** don't move it to Exhausted. Only send the webhook. The function decides.

Everything else stays as written in Task 6.

### Step 6. Full test in GHL (with Tausif)

1. Make a fake shop with 3 team phone numbers: number 1 as its Google number, numbers 2 and 3 as other numbers. Load it into GHL.
2. Log "No Answer" 4 times on number 1. **Check:** the contact's Phone changes to number 2, Screen Attempts is back at 0, and the contact is back at Attempt 1.
3. Log "Wrong Number" on number 2. **Check:** it switches to number 3.
4. Log "Gatekeeper" on number 3. **Check:** the contact is in Gatekeeper, and no other number is ever tried again.
5. Make a second fake shop with 1 number, and log 4 no-answers. **Check:** it goes to Exhausted.
6. Screenshot every step for Kevin.

### Kevin's decision (still open)
Should the screener call **licence-only numbers**, meaning numbers the shop doesn't advertise? For now it's **no**. If Kevin says yes, change one setting (allow_licence_only_phones = true). No code changes.

### Done when
Both tests pass, and GHL switches numbers by itself without anyone touching it.
