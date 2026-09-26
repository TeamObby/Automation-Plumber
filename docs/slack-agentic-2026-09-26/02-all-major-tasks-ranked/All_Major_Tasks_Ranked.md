# Additional thread context: all major tasks, ranked

_Posted by Kevin in #agentic, Sep 25 8:53 PM PT (a plain-text snippet, titled "Untitled" in Slack). Text unchanged below._

Here's even more context of major tasks we need to niclude, this gives a fuller picture: 

Goal is we need to know what to prioritize first.

Used Notion
Here's every major task in one ranked list: the original 9, the new ones from today's research, and the new ones from your team meeting. It's saved in Notion as PRIORITY ORDER: ALL MAJOR TASKS, and each new task is also in the tracker.

New from the meeting (so none get lost):

The "brain." Claude checks 1-3 times a day and looks at your pipeline and the screener's queue. It balances CA, TX and FL to match your pipeline, keeps a surplus ready, and refills when it runs low.
One-shop lookup: look up and score a single shop on demand. Job ads from anywhere in the US need this.
Reverse owner search: find the owner's name and phone for shops posting job ads.
Screener identity: the dialer account is named Topu, and every call records who made it.
Email rule: the screener calls regardless of email status, and emails continue once a shop reaches your pipeline.
Only the top tier goes to the screener. You'll pick the cutoff later. "Unlikely" and "not sure" shops are kept for future products.
Tausif's question: don't look up the other 1,500 shops yet. Data goes stale, so it gets pulled in small daily batches.
TIER 1: must work Monday (Topu's first calls)
Legal basics (you, plus a lawyer):
check numbers against the do-not-call list
the recording notice line
calls only 9am-8pm in the shop's local time
Florida: no more than 3 calls to a number in 24 hours
dial by hand or click-to-call
My suggestion: start with California and Florida, and add Texas once registration is sorted.
Screener setup in GHL and phones (Tausif, Hridoy):
the "Screener queue" stage, the fields and the automation
local numbers, silent voicemail and recording
copy your dialer setup for the screener, and name his dialer account "Topu"
Database basics (Mohimenul): the tables, the California shops, and your old GHL contacts, with no duplicates.
Call logging basics (Mohimenul): every call is saved with who made it, and confirmed owners move to your pipeline.
List upload and merge (Mohimenul): how batch 1 and old contacts get in without duplicates.
Batch 1 (me, using Tausif's 500 lookups): match and score them, keep only the top tier, and load them into GHL with some extra ready.
TIER 2: weeks 1-2 (it runs on its own and learns)
The brain (Mohimenul builds it, I set the rules): Claude checks 1-3 times a day, balances the time zones, keeps a surplus, and refills.
Surplus rule: the screener's queue holds about 2 times his daily calls.
About 1,000 scored shops are always ready in the database.
Fresh data every night (Mohimenul): these are the steps the brain triggers.
Mohimenul says most of the current logic is in n8n. That's fine for triggers and connections.
The matching and scoring rules stay in the tested code, which n8n calls. That way it runs the same way every time.
Multiple phone numbers (Mohimenul): the rules are already built.
AI check, productivity and idle alert (Mohimenul): the rest of Task 5. He says part of it already exists.
Learning from our own calls (me):
record the right results on every call
use missed calls as a signal
find the best hours to call
Customer truth test (you): send your customers' monthly call counts.
Referrals (you): start now. It needs no tech.
Email rule (Tausif): as decided in the meeting.
TIER 3: weeks 2-4 (best leads, and more shops)
Urgent leads. I agree with your grouping:
Call right away: receptionist job ads (anywhere in the US) and new reviews saying "never answered" or "didn't call back".
Storms: call a few days after. During a freeze or flood the owner is too busy to talk.
Brand-new shops: also in this group.
One-shop lookup (Mohimenul): needed for #15.
Reverse owner search (you decide, lawyer first). Flag: this changes two of your rules, "only the advertised number" and "never go around a gatekeeper". It also adds legal risk, because an owner's personal cell falls under do-not-call rules. For job-ad shops you may not need it anyway. A small shop hiring its first receptionist has the owner answering the advertised number today.
More shops (me, plus Tausif's tools):
start from public listings
add the new sources we found
build the Texas and Florida lists
Test 4 graded, and the points updated (me, with Tausif's results).
TIER 4: month 2 and later
Partners: plumber marketing agencies, and supply-house mornings.
Outreach helpers: postcards and email, Facebook groups, and a Facebook ad test.
Later channels: trade associations (PHCC), trade shows, and trade magazines.
Look-alike scoring, once there are about 20 customers.
"Unlikely" and "not sure" shops, saved for future products.
Is anyone else building something this detailed? For small plumbing shops, very rarely. Most sellers buy a list and dial it. Well-funded software companies do build this kind of machine: lists fed by buying signals, automatic enrichment and scoring. So it isn't unheard of, just rare in your market, and that gives you a real edge.

The honest risk isn't too little engineering, it's building too long before calling. That's why Tier 1 is only what Monday needs, and everything else learns from real calls.

Your messages:

✅ All the major tasks, ranked by tier: the 24 above, including the new ones from the meeting.
✅ Storms, negative reviews and job ads as urgent leads: agreed, as #15. Storms get called a few days after.
✅ Is anyone engineering this much? Rarely in your market. The risk is building too long before calling.
if this actually works with the goolge revies, job ads, and weather, stacked iwth the owner screening and liekly to buy tiers, we’re apporximating the miracle of getting everyone i call to close. this is coming within the the constraints of physis

Assessed realistic close-rate expectations against system constraints.
The direction is right, but it won't get anywhere near everyone closing, and it's better to plan knowing that.

What the stack really does: it makes nearly every call you make a call to the right person, with the problem, at a good moment. That's a big edge, because most sellers waste most of their calls on the wrong shops.

Why it still won't reach "everyone closes": some reasons for a "no" are invisible in any data:

no budget right now, or bad timing (busy season, a family issue)
he doesn't trust a new company, or hates contracts
he's happy missing some calls ("they'll call back")
he already tried something like it, or a competitor got there first
how the pitch, the offer and the demo land on that particular day
The list controls who you talk to. Those things decide whether he buys, and your offer and your pitch carry most of them.

Two more honest limits:

Urgent leads will be rare. Receptionist job ads and "never answered" reviews probably show up for a small share of shops, maybe a few percent. They'll be your best calls, but not most of your calls.
Every signal is indirect. Some high-scoring shops will turn out to be duds, and some low scores will surprise you.
How you'll know the real number: the 300 random shops. Compare your close rate on top-tier and urgent leads against the random group, and within a few weeks you'll see how much the stack actually adds. You'll have real numbers instead of hope.

Where "almost everyone closes" can come true: among owners who already agree they have the problem. A job-ad shop hiring its first receptionist, or an owner whose review says "never called back", is halfway sold before you dial. Those are the leads to protect and call first.

Your messages:

✅ Does the full stack get close to everyone closing? No. It makes most of your calls count, but the close rate still depends on things no data can see. The random 300 will show the real lift.
Updated Notion page
Here it is, grouped by the main variables, with every column under the variable it feeds. Page 16 in Notion now has exactly the same layout.

"Of 77" means the 77 test shops we found on Google in Tests 3 and 4. "Of 150" means all the Test 3 shops. Points are from the version running in the code now (v2), and the v2.5 changes are marked.

1. Finding every shop
Every source gets merged through the matching rules into one list.

Licence record

Source: the state licence file. Free and official.
Why and how it counts: proves the shop is a real, active plumber. Suspended or not a plumber means out.
Tested: yes.
Found: California 17,360 active. Texas 8,446, but it lists people, not shops. Florida not built yet.
Google listing

Source: DataForSEO.
Why and how it counts: the shop's public face. Almost every other column hangs off it.
Tested: yes.
Found: 77 of 150. Of those, 77 matched right and 3 wrong. Outscraper had 17 wrong and Apify 22.
Yelp listing

Source: Apify.
Why and how it counts: finds shops Google misses.
Tested: yes.
Found: 69 of 150 are on Yelp, and 11 of those weren't on Google. 47 of 48 were matched correctly.
2. Getting the phone number
A shop with no phone number is useless to us.

Advertised phone

Source: the Google listing first, then Yelp, the website, Facebook.
Why and how it counts: we only call the advertised number.
Tested: yes.
Found: 77 of 150. That's 63 of 100 in California and 14 of 50 in Texas.
Phone type

Source: Twilio. We didn't pick ClearoutPhone because it showed old types for numbers that had moved.
Why and how it counts: dead numbers are out. It also feeds the owner question: a cell or an office line.
Tested: yes.
Found: 61 of 77 checked. 35 were cells, 5 were 1-800 numbers.
Other numbers, and numbers shared with other businesses

Source: all the listings, plus our own program.
Why and how it counts: gives us the next number to try. A number shared by several businesses usually means an answering service.
Tested: the rules work in the code. We haven't counted shared numbers yet.
3. Will the owner answer? (must-have)
How it's decided:

Any office sign makes the shop "unlikely."
"Likely" needs 1-5 people, no office signs, and at least 1 owner sign.
Everything else is "maybe."
The screener's call is the final answer.
Office staff mentioned in reviews (office sign)

Source: Claude reads the last 2 years of Google, Yelp and Facebook reviews. A simple word search was only 80% right.
Tested: partly. We know how often it shows up, but Claude's accuracy hasn't been scored.
Found: 21 of 69 shops with reviews.
Office signs on the website (office sign)

Source: our crawler plus Claude. It looks for things like "call our office," an answering service, a chat receptionist, or ServiceTitan.
Tested: partly. We can spot these, but not whether they really mean an office.
Found, out of 50 websites: ServiceTitan 1, chat widget 2, call tracking 3.
Office phone system or 1-800 number (office sign)

Source: Twilio.
Tested: yes.
Found: 5 of 61.
600+ reviews (office sign)

Source: DataForSEO.
Tested: yes.
Found: 5 of 77.
Size (6+ people is an office sign, 21+ is out, 2-5 gets the 1.5 boost)

Source: in California, the workers' comp field in the licence file. In Texas and Florida: PPP loans, the website, and reviews naming several technicians.
Tested: yes in California. Weak in Texas and Florida.
Found: in California, 8,259 of 17,360 have employees and 8,773 don't. PPP loans matched only 8-24% of shops.
Cell phone (owner sign)

Source: Twilio.
Tested: yes.
Found: 35 of 61.
Sole-owner licence (owner sign)

Source: the licence file.
Tested: yes.
Found: 7,907 of 17,360 in California.
Reviews say the owner did the job (owner sign)

Source: Claude.
Tested: no. Not counted yet.
Owner-run website (owner sign)

Source: crawler plus Claude.
Tested: no. Not counted yet.
4. Does it do home jobs? (must-have)
How it's decided: any home sign makes it "likely." Mostly commercial work makes it "unlikely." No data means "unsure."

Home-job reviews

Source: Claude.
Tested: no. Not counted yet.
Home services on the website

Source: crawler plus Claude.
Tested: no. Not counted yet. 50 of 77 shops have a website.
On homeowner lead sites

Source: Apify for Angi and HomeAdvisor. SerpApi for Google's paid local ads, because DataForSEO found almost none.
Tested: small sample.
Found: Angi 9 of 77, HomeAdvisor 8 of 77, Google's paid local ads 5 of 77.
Mostly commercial work

Source: Claude.
Tested: no.
5. Gets a lot of calls (70 points)
Reviews in the last 12 months, all sites: 40 points (v2.5 changes this to 24 months and 30 points)

Source: DataForSEO for Google. Apify for Yelp and Facebook.
Why and how it counts: the best broad sign of real work. It lines up with card sales, but only from 22 shops.
Points grow with the count: 5 reviews earn about 18 points, 10 about 24, 20 about 31, and 50 or more get all 40.
Tested: yes.
Found (last 24 months): Google 45 of 77, Yelp 36 of 77, Facebook 13 of 77.
Pays for customers: 15 points (1 platform earns 10, 2 or more earn 15)

Google ads: from DataForSEO, checked by website. Tested. Found for 10 of 50 shops with a website. These shops had 5-10 times more card sales.
Google's paid local ads: from SerpApi. Tested once. Found 5 of 77.
HomeAdvisor paid badge: from Apify. Small sample. Found 4 of 13 profiles.
Meta ads: from the Ad Library website. Found 1 of 61, so rarely useful.
Maps position: 10 points (v2.5 changes this to 5)

Source: DataForSEO, checked from 9 spots around the shop.
Why and how it counts: top 3 earns 10, top 10 earns 7, top 20 earns 4.
Tested: yes, but the link to sales is weak.
Found: 55 of 77.
Repair-type work: 5 points (v2.5 replaces it with open 24/7)

Source: the website and reviews.
Tested: yes. Words like "emergency" didn't help, because everyone uses them.
New in v2.5 (these earn points only when found)

Website visitors, 5 points. From DataForSEO. Found 42 of 77.
Open 24/7, 5 points. From Google hours plus the website. Found 18 of the 48 shops whose hours we know.
Nextdoor recommendations, 5 points. From Serper plus Apify. Found 7-10 of 77, but 3 of the 25 pages were the wrong business.
Technician job ad, 5 points. From Google Jobs. Found 6 of 77. The automatic matching was wrong 20 times out of 26, so it has to be fixed first.
6. Will it stay in business? (30 points)
Reviews in the last 6 months vs the 6 before: 15 points

Source: the same review pulls.
Why and how it counts: rising earns 15, steady 11, falling 6, fading 2.
Tested: yes.
Found: only 24 of 77 have enough reviews for this to mean anything. The rest get the middle score.
Years in business: 10 points

Source: the licence date.
Why and how it counts: 5+ years earns 10, 3-5 earns 8.5, 2-3 earns 6, under 2 earns 4.
Tested: yes.
Found: every California shop.
Rating and licence trouble: 5 points

Source: the Google rating and the licence file.
Why and how it counts: a 4+ rating earns 5, lower earns 2, licence trouble earns 0.
Tested: yes.
Found: rating for 50 of 77. 16 California licences are pending suspension.
7. Urgent leads (these jump to the front of the queue)
Receptionist or office job ad: from Google Jobs and websites. Found 147 ads in California and Texas in a month. We haven't matched them to our shops yet.
"Never called back" reviews: from the review watch plus Claude. About 14% of shops have one.
Storms: from the National Weather Service. Not tested.
Brand-new shops: from new licences and new listings. Not tested.
All data sources we'll use
State licence files: free. A few states charge $10-200.
DataForSEO: the Google listing, reviews, Maps position, ads, website visitors and job ads. A map search costs a fraction of a cent. 10 reviews cost $0.00075.
Apify: Yelp ($0.79 per 1,000 reviews), plus Facebook, Angi, HomeAdvisor and Nextdoor (about 1-3 cents a page).
SerpApi: Google's paid local ads. About 1.5 cents a search, my estimate.
Serper: finding pages. About 0.1 cent a search.
Twilio: phone type. $0.008 a number.
Our crawler: websites. Almost free.
Claude: reading reviews and websites. About 2-5 cents a shop, my estimate.
PPP loans and the National Weather Service: free.
Cost per 100 shops, fully checked: about $12-20. Roughly:

Google $1
Yelp $2
Facebook and other pages $2-3
Nextdoor $1-3
Ads and Maps $2-3
Website visitors $1
Twilio $1
Claude $2-5
Cost per 100 shops ready for the screener: about $50-85. That's higher because only about 1 in 9 shops passes both must-haves, so we check about 900 to get 100:

First, the cheap checks that decide owner and home jobs, on all 900 shops: about $45-72.
Then everything else, on just the 100 that pass: about $7-12.
Separate costs:

Finding shops: about $0.30-1 per 100, done once per state.
The urgent-leads watch: about $350-650 a month for California, Texas and Florida.
How we tier
Must-haves first: likely owner and likely home jobs. Everything else is saved for later.
Priority = value score (0-100) × 1.5 for 2-5 person shops. Missing data earns half the points for that item.
Tiers inside the call pool: Tier 1 is the top 20%, Tier 2 the next 30%, Tier 3 the next 30%, and Tier 4 the rest.
The screener's order:
urgent leads first, then Tier 1 on down
plus 300 random shops, to test whether the tiers really work
always balanced across Florida, Texas and California, and within each state's calling rules
The biggest gaps: owner and home-job signs from reviews and websites haven't been counted yet, size data outside California is weak, and the technician job-ad matching needs fixing.

Your messages:

✅ Organized by the main variables, with each column underneath: sections 1-7.
✅ For each column, the source, why we get it and how it counts, whether it's tested, and how many shops have it: in every entry.
✅ All data sources and total cost per 100: about $50-85 per 100 shops ready for the screener.
✅ How we tier everything: the last section.
Updated Notion page
Here's the full list of columns and tools again, updated with everything we decided today. Page 16 in Notion now matches it.

"Of 77" means the 77 test shops we found on Google. "Of 150" means all the Test 3 shops.

1. Finding every shop
Licence record
Source: the state licence file. Free.
Why: proves the shop is a real, active plumber. A suspended licence means out.
Tested: yes. Found: 17,360 active in California and 8,446 in Texas (Texas lists people, not shops). Florida isn't built yet.
Google listing
Source: DataForSEO, searching every ZIP code plus extra spots between them, with 6 search words.
Why: the shop's public face. Most other columns hang off it.
Tested: yes. Found 77 of 150, with 3 wrong matches. Test 5 will count shops at full scale.
Yelp listing
Source: Apify.
Why: finds shops Google misses.
Tested: yes. 69 of 150 were on Yelp, and 11 of those weren't on Google.
2. Getting the phone number
Advertised phone
Source: the Google listing, then Yelp, the website, Facebook.
Why: we only ever call the advertised number.
Tested: yes. Found: 77 of 150.
Phone type
Source: Twilio.
Why: a dead number means out. A cell phone points to the owner. A 1-800 number points to an office.
Tested: yes. Of 61 numbers checked, 35 were cells and 5 were 1-800.
Other numbers, and numbers shared by several businesses
Source: every listing, plus our own program.
Why: other numbers give us the next one to try. A number shared by several businesses usually means an answering service.
Tested: the rules work in the code. Shared numbers aren't counted yet.
3. Will the owner answer? (must-have)
How it's decided:

Any office sign means "unlikely," and the shop is kept out.
"Likely" needs 1-5 people, no office signs, and at least 1 owner sign.
Everything else is "maybe." Those still get called, one tier lower.
Office signs

Office staff mentioned in reviews
Source: Claude reads the reviews.
Found: 21 of 69 shops with reviews.
Office signs on the website
Source: our crawler plus Claude.
Found: ServiceTitan on 1 of 50 sites, a chat widget on 2, call tracking on 3.
1-800 number
Source: Twilio.
Found: 5 of 61.
600+ reviews
Source: DataForSEO.
Found: 5 of 77.
Size. 6 or more people counts as an office sign, 21 or more is out, and 2-5 gets the ×1.5 boost.
Source: California's workers' comp records. In Texas and Florida: PPP loans, the website and reviews.
Tested: good in California, weak elsewhere. PPP matched only 15 of 77 shops, and loan size didn't line up with card sales.
Owner signs

Cell phone: 35 of 61.
Licence held by one person: 7,907 of 17,360 in California.
Reviews saying the owner did the job, or an owner-run website: not tested yet.
Test count: 28 of 77 were likely owner and likely home jobs, 25 were maybe, and 24 were unlikely.

4. Does it do home jobs? (must-have)
How it's decided: any home sign means "likely." Mostly commercial work means "unlikely," and the shop is kept out. No data means "unsure," and it's called one tier lower.

Home-job reviews and home services on the website
Source: Claude and the crawler.
Tested: word checks only.
Listed on homeowner lead sites
Source: Apify for Angi and HomeAdvisor. SerpApi for Google's paid local ads.
Found: Angi 9 of 77, HomeAdvisor 8, Google's paid local ads 5.
5. Gets a lot of calls (70 points)
Review speed: 35 points
Source: DataForSEO for Google. Apify for Yelp and Facebook.
How it counts: newer reviews count more.
Why: it's the best match to real card sales we found.
Found: 66 of 77 have reviews. Only 44 have any from the last 3 months.
20+ reviews in the last 6 months: automatic Tier 1. Found: 18 of 77.
Website visitors: 10 points
Source: DataForSEO.
Why: it lines up with card sales.
Found: 42 of 77.
Job ads (not receptionist)
Source: Google Jobs and the shop's website.
How it counts:
an ad in the last 90 days: automatic Tier 1
3-6 months old: 10 points
6-12 months old: 5 points
only a "now hiring" banner on the website: 5 points
Found: 6 of 77 had job ads, and 3 of 53 websites had a banner.
Must fix first: the automatic matching was wrong 20 times out of 26.
Pays for customers: 10 points
Sources:
Google's ad library: DataForSEO, checked by website
Google's paid local ads: SerpApi
HomeAdvisor and Angi paid badges: Apify
ad code on the shop's website: our crawler
How it counts:
live ads on 1 platform: 7 points
live ads on 2 or more: 10 points
ran ads in the past 12 months but not now: half
only the website code: 2.5 points
live paid ads: automatic Tier 2
Found:
Google ads: 10 of 50 shops with a website
Google's paid local ads: 5 of 77
HomeAdvisor badge: 4 of 13 profiles
Angi badge: 0 of 14
Meta ads: 1 of 61
website ad code: 10 of 51 sites, including 8 of the 10 live advertisers
Card sales
Source: Enigma, run only on shops we'll call.
How it counts: the top quarter, among shops with card data, goes to automatic Tier 1. No data means no penalty.
Found: 27 of 77, but only 7 of the 28 likely shops.
Caution: Enigma sees only a slice of card payments, so the number compares shops. It never shows income.
Open 24/7 and emergency work: 5 points
Source: Google hours and the website.
Found: 18 of the 48 shops whose hours we know.
Job software on the website
Source: our crawler, free.
Why: a small shop paying for booking software is usually doing well. ServiceTitan also hints at an office.
Found: booking links on 7 of 55 sites.
Tie-breakers: Maps position (55 of 77, weak link to sales) and Nextdoor recommendations (7-10 of 77).
Testing next: Angi's "neighbors requested a quote" count in one city, and Google's "bookings nearby."
6. Will it stay in business? (30 points)
Reviews rising or falling: 15 points. Only 24 of 77 have enough reviews to tell. The rest get the middle score.
Years in business: 10 points. From the licence date, for every California shop.
Rating and licence trouble: 5 points. 50 of 77 have a rating. 16 California licences are pending suspension.
7. Urgent (always goes first; kept out only if owner or home jobs is "unlikely")
Receptionist job ad
In the last 7 days: Urgent 1. 8-30 days: Urgent 2. 31-90 days: test group.
Found: 147 ads in California and Texas in a month. We haven't matched them to our shops yet.
Missed-call Google review
In the last 7 days: Urgent 1. 8-30 days: Urgent 2. 31-90 days: Urgent 3.
About 14% of shops have one at some point.
Storm
Ended within 7 days: Urgent 1. Within 30 days: Urgent 2. Within 60 days: Urgent 3.
Not tested yet.
Any 2 urgent signals within 90 days: Urgent 1.
Brand-new shops: dropped.
Every tool we'll use
State licence files: free. A few states charge $10-200.
DataForSEO: listings, the area search, reviews, Maps position, the Google ad library, website visitors, job ads.
Apify: Yelp, Facebook, Angi, HomeAdvisor, Nextdoor.
SerpApi: Google's paid local ads.
Serper: finding pages.
Twilio: phone type.
Our crawler: websites, ad codes, job software, hiring banners.
Enigma: card sales, only on shops we'll call.
Claude: reading reviews and websites.
National Weather Service and PPP loans: free.
Cost
Checking everything on one shop: about 12-20 cents, plus Enigma at about 25 cents per shop it has data for (about 1 in 3).
Per 100 shops ready for the screener: about $25-40. It's lower than the $50-85 I gave earlier because "maybe" shops are now called too, so about 2 in 3 shops found on Google are callable. The breakdown:
The cheap checks on about 150 shops: $8-12.
Everything else on the 100 we'll call: $7-12.
Enigma on those 100: $6-9.
Separate costs:
finding shops: about $0.30-1 per 100, once per state
the urgent-leads watch: about $350-650 a month for California, Texas and Florida
Your messages:

✅ Recap of the columns and tools: above, updated with every change from today, and matching page 16 in Notion.
