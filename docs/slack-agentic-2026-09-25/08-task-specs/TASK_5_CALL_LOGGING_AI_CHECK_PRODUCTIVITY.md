# TASK 5: CALL LOGGING, AI CHECK AND PRODUCTIVITY (suggested: Sharjil or Mahir)

### Why this matters
Every screener call has to be saved, so we know:

1. **Where each shop stands:** owner confirmed, gatekeeper, or try again.
2. **Whether the screener picked the right result.** Every call is recorded, and an AI listens to it too. If the AI and the screener disagree, the call gets flagged.
3. **How productive the screener is:** dials per hour, breaks, and owners found.

### How a call flows

1. The screener calls the shop with WAVV, inside GHL.
2. After the call, the screener picks the result in GHL (for example "Owner - Busy").
3. GHL's automation "Screener Outcome Changed", which Tausif is building, sends the result to our Supabase function.
4. The function **ghl-call** saves the call in **calls** and updates the shop: status, attempt count, owner's first name, and so on.
5. Every 15 minutes, the **AI check** reads each new call's transcript and gives its own answer. If it disagrees, the call gets flagged.
6. The productivity numbers update on their own. An alert fires if the screener stops dialing.

### Step 1. Deploy the call webhook (20 minutes)

1. In the zip, open **supabase/functions/ghl-call/index.ts**. The code is finished.
2. In Supabase, go to **Edge Functions**, then **Deploy a new function**, then **Via Editor**.

   - Name it **ghl-call** and paste in the code.

3. In the function's settings, turn **"Verify JWT" OFF**. GHL can't log in, so the secret key in the address protects it instead.
4. Go to **Edge Functions**, then **Secrets**, and add **WEBHOOK_KEY** with a long random value (at least 30 random letters and numbers). SUPABASE_URL and the service key are already there automatically.
5. The address is:**https://[project-id].supabase.co/functions/v1/ghl-call?key=[WEBHOOK_KEY]** Send it to **Tausif** privately. He puts it in the GHL automation.
6. **Tell Tausif which data to send with every call.** These are the "Custom Data" keys:

   - shop_id, ghl_contact_id, caller (for example screener-a), call_type = screen
   - outcome, who_answered
   - noise (Screen Noise), answer_style (How He Answered), vm_greeting (Voicemail Greeting)
   - first_name, best_time_to_call, dialed_number
   - recording_url, duration_sec and transcript, if GHL has them

GHL needs a **Shop ID** field on the contact for this. The nightly batch fills it in. If it's missing, the function falls back to the GHL contact ID.

### Step 2. Test the webhook (10 minutes)

1. Pick one real shop ID from the shops table.
2. Send this with Postman or curl, as a POST to the address, with JSON:`{"customData": {"shop_id": "PUT-SHOP-ID-HERE", "caller": "screener-a", "outcome": "Owner - Busy", "who_answered": "Owner", "first_name": "Mike"}}`
3. **Check:** one new row appears in **calls**, and that shop's status is now **owner_confirmed**, with owner_first = Mike.
4. Send it again with a wrong key. It must say **"unauthorized"**.
5. Screenshot both for Kevin.

### Step 3. The AI check (every 15 minutes)
**First, find out where recordings and transcripts go.** Tausif is checking whether WAVV recordings show up in GHL, and whether GHL makes a transcript.

- **Transcript available:** use it.
- **Only a recording:** turn it into text first with a speech-to-text service. **Ask Kevin before signing up.** It costs well under a cent per minute. Save the text with **attach_transcript**.

**Build the job:**

1. Make a new Edge Function called **ai-check**.
2. Each time it runs, it takes up to 50 calls that have a transcript but haven't been checked yet (ai_checked_at is empty).
3. For each one, it sends **only the transcript**, never the screener's pick, to Claude (use the cheap Claude Haiku model), together with the prompt in **supabase/ai_check_prompt.md**. Add the ANTHROPIC_API_KEY secret.
4. Claude answers in JSON. Save it with **record_ai_check(call_id, answer)**. The database then decides whether the AI disagrees with the screener.
5. When it disagrees, add the tag **screen-mismatch** to the contact in GHL through the GHL API, and add a note with the AI's one-line reason.
6. Schedule it: **Integrations**, then **Cron**, then a new job that runs ai-check every 15 minutes (`*/15 * * * *`).

Kevin's Claude reviews the flagged calls every day and marks each one ok or fixed.

### Step 4. Productivity (daily summary)
The numbers are already calculated in 2 views:

- **screener_hourly**: dials per hour.
- **screener_daily**, per screener, per day:
   - dials, first and last dial
   - active hours and dials per active hour
   - breaks over 15 minutes
   - answered, owners found, and owner % of answered
   - AI-checked calls, AI flags and flag %

**Build:** at the end of every shift, post that day's screener_daily row to Slack, one line per screener.

### Step 5. Idle alert

1. Get the screener's **shift hours** (Pacific time) from Kevin and store them as 2 secrets: SHIFT_START and SHIFT_END.
2. Make a cron job that runs every 10 minutes. During the shift only, it checks the time of each screener's last call in **calls**.
3. If there's been nothing for **20 minutes**, post in Slack: "screener-a: no dials for 20 min".
4. Alert **once** per quiet stretch, not every 10 minutes.

### Step 6. Full test (with Tausif, once his GHL automation is ready)
Make 3 fake calls to team phone numbers, set up as fake contacts:

1. **Owner:** the shop becomes owner_confirmed and moves to Kevin's pipeline.
2. **Gatekeeper:** the shop becomes out_gatekeeper.
3. **Voicemail:** the attempt count goes up by 1.

On one of the 3, pick the **wrong** result on purpose (for example, choose "Owner" when a receptionist answered). The AI check must flag it.

Screenshot the calls table, the GHL tags and the Slack messages for Kevin.

### One thing that changes later (Task 9)
Right now, log_call treats "Wrong Number" as "shop disqualified", and 4 tries in total as "exhausted". Task 9 (multiple phone numbers) changes that to count **per number**: a wrong number or 4 no-answers moves to the shop's next number. Build Task 5 exactly as written now. Task 9 adjusts those two rules.

### Done when
Every call shows up in Supabase within a minute, the AI check runs every 15 minutes, mismatches get tagged, the daily summary and idle alerts arrive in Slack, and the fake-call test passes.
