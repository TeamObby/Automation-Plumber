# TASK 6: SCREENER SETUP IN GHL AND PHONES (Tausif and Hridoy)

### Why this matters
On Monday the screener (Topu) starts calling. His only job on each call is to find out **whether the owner himself answers the shop's advertised number**.

- He never sells, never pitches and never connects the shop to Kevin.
- If anyone else answers (staff, a receptionist, a spouse, an answering service or an AI receptionist), the shop is out for now. We keep it and tag it.
- If the phone's own robot asks "who's calling?" and then the owner picks up, that's a **good** sign. It means it's his cell.
- He never leaves voicemails. If a shop calls back, it reaches a silent voicemail, and the screener calls it back.

GHL has to make each call take about 10 seconds of clicking, and then move the shop to the right place on its own.

**Rules for both of you:**

- Work only in the sub-account **Waterline Growth**.
- Never delete contacts, fields, tags, pipelines or automations. Turn things off instead.
- Don't buy anything without asking Kevin.

**What I found when I checked GHL tonight:** the pipeline "Screener — Plumbers" exists. None of the steps below are done yet, and the automation "Screener Outcome Changed" is still a draft.

### TAUSIF
Step 1. Add the first stage

In the pipeline **"Screener — Plumbers"**, add a stage called **Screener queue** before Attempt 1. This is where the nightly batch (Task 3) puts new shops.

The stages should read, in order: Screener queue, Attempt 1, Attempt 2, Attempt 3, Attempt 4, Owner Verified, Gatekeeper, Not Sure, Exhausted, Disqualified.

Send Mohimenul the new stage's ID.

Step 2. Fix the existing fields

1. **Screener Outcome:** add 2 options, **No Answer** and **Voicemail**. The final list should be: Owner - Busy, Owner - Quiet, Gatekeeper, No Answer, Voicemail, Not Sure, Wrong Number, Not A Plumber, Do Not Call.
2. **Screen Noise:** it's plain text right now. Change it to a **dropdown** with Job site, Driving, Home, Office and Quiet.

Step 3. Add the new fields

Before adding each one, check that no field with the same meaning already exists. If one does, tell Kevin instead.

| Field | Type | Options / what it holds |
|---|---|---|
| How He Answered | dropdown | Business name / His name / Just hello / Phone robot first |
| Voicemail Greeting | dropdown | Personal / Business / Carrier default / Mailbox full / Not set up |
| Who Answered | dropdown | Owner / Staff or receptionist / Spouse or family / Answering service / AI receptionist / Phone robot then owner / Voicemail / No answer / Wrong number |
| Best Time To Call | text | only if the owner says a time |
| Shop ID | text | our Supabase ID for the shop (the nightly batch fills it) |
| Other Phones | text | the shop's other numbers, for reference only |
| Call Order | number | the screener's list is sorted by this |
| List Batch | text | the batch name, for example CA-A1-S01 |
| Top Reasons | multi-line text | why the shop was picked |

The number the screener dials is the contact's normal **Phone** field, because that's what WAVV dials. We don't need a separate "Dial Number" field. When the shop's number changes (Task 9), the program updates Phone.

**Don't use** the old fields Tier, Bucket or Priority Score for new contacts, and don't delete them.

Step 4. The screener's list

Make a smart list called **"Screener — today"**:

- contacts in the stage Screener queue or Attempt 1-4
- sorted by **TZ**, so Florida comes first in the morning, then Texas, then California
- and within each time zone, by **Call Order**

The screener dials from this list in WAVV.

Step 5. Check WAVV's buttons

After a call, WAVV shows result buttons. Find out whether one click on those buttons can **set the Screener Outcome field** (or add a tag that the automation can react to).

- If it can, set it up that way. It saves the screener a click on every call.
- If it can't, the screener picks the result on the contact.

Tell Kevin which one it is.

Step 6. Finish the automation "Screener Outcome Changed"

**Trigger:** Screener Outcome changes **and** isn't empty. The "isn't empty" part stops it firing again when we clear the field.

**What happens for each result:**

| Result | What the automation does |
|---|---|
| Owner - Busy / Owner - Quiet | Move to Owner Verified. Add tags owner-confirmed and the time tag matching Best Time To Call (Kevin's existing "9am-10am" style tags). Make Kevin a follower. Create an opportunity in Kevin's pipeline "Cold Outbound Call Pipeline", first stage. |
| Gatekeeper | Move to Gatekeeper and add tag out-7g. Never sent to Kevin. |
| Not A Plumber | Move to Disqualified. |
| Do Not Call | Move to Disqualified and turn on Do Not Disturb. |
| Wrong Number | For now, move to Disqualified. Once Task 9 is live, the program moves the shop to its next number instead. |
| No Answer / Voicemail / Not Sure | Add 1 to Screen Attempts and move to the next Attempt stage. After Attempt 4, move to Exhausted. Once Task 9 is live, the program tries the shop's next number first. |

**After every result, in this order:**

1. Set **Date Screened** to today.
2. **Send the webhook** to the address Mohimenul gives you (Task 5), with these Custom Data keys:

   - shop_id = {{contact.shop_id}}
   - ghl_contact_id = {{contact.id}}
   - caller = screener-a
   - call_type = screen
   - outcome = the result
   - who_answered, noise (Screen Noise), answer_style (How He Answered), vm_greeting (Voicemail Greeting)
   - first_name = {{contact.first_name}}
   - best_time_to_call
   - dialed_number = {{contact.phone}}
   - recording_url, duration_sec and transcript, if GHL has them

3. **Then** clear Screener Outcome, Screen Noise, How He Answered, Voicemail Greeting and Who Answered, so the next call starts blank.

**The order matters:** send the webhook **before** clearing the fields, or the data gets lost.

Step 7. Kevin's calls

In **Cold Outbound Call Pipeline**, when Kevin sets his call result, send the same webhook with caller = kevin, call_type = sales, and outcome = his result.

Step 8. Callbacks

Make a small automation. When a contact in "Screener — Plumbers" calls one of the screener numbers and reaches voicemail, create a task for the screener: **"Call back - confirm owner"**.

Step 9. Find where recordings go

Find out whether WAVV call recordings show up in the GHL conversation, only in WAVV, or both, and whether GHL makes a transcript. Tell Mohimenul, because the AI check (Task 5) needs a recording or a transcript for every call.

Step 10. Test with 3 fake contacts

Use team phone numbers:

1. **Owner:** it should land in Owner Verified and show up in Kevin's pipeline.
2. **Gatekeeper:** it should land in Gatekeeper with the tag out-7g.
3. **No answer 4 times:** it should go through Attempt 1 → 2 → 3 → 4 → Exhausted.

All calls should show up in Supabase (Task 5). Screenshot everything for Kevin.

### HRIDOY
Step 1. Buy local phone numbers (ask Kevin first, with the price)

- The screener calls **Florida, then Texas, then California**, following the sun. Local numbers get answered more often, so buy numbers in **all 3 states**. Kevin's Claude will give you the area codes from batch 1.
- **How many:** 300 dials a day at 100 or fewer per number means at least 3 numbers. Get **4-6**, so they can take turns.
- Buy them in GHL (LC Phone).

Step 2. Register the numbers

Register every screener number for free at **freecallerregistry.com**, with the company name WaterLine. This makes carriers less likely to mark the calls "Spam Likely". If GHL allows it, also set the caller name (CNAM).

Step 3. Incoming calls

On the screener numbers:

- **Nobody's phone rings.**
- Callers reach a voicemail with **no greeting** (silent).
- Missed calls still show up in GHL, so Tausif's callback task (his Step 8) works.

Step 4. WAVV

Set up the **second WAVV seat** for the screener as a **single-line** power dialer, not multi-line. Send Kevin the price and the renewal date.

Step 5. Spread the dials

Set WAVV to rotate through the numbers, so none of them goes over about 100 dials a day.

Step 6. Recording

Turn on call recording for the screener's seat, in WAVV and in GHL if that's needed. Check with Tausif that every recording can be opened from a link.

**Recording notice:** California requires that everyone on a call agrees to it being recorded. Kevin still has to decide the exact line the screener says (for example "this call may be recorded"), or whether to use WAVV's own recording notice if it has one. Don't go live until Kevin has decided.

Step 7. Test

Log in as the screener and dial a team phone from a local number with WAVV. Then call that screener number back: it should reach the silent voicemail, and the callback task should appear.

### Done when (Task 6)
The screener can log in, sees the "Screener — today" list, dials from a local number, picks a result in about 10 seconds, the shop moves to the right stage by itself, the call shows up in Supabase, and a callback lands in silent voicemail with a task.
