# Instructions
You're right, that was too many. I merged the guide, prompt and rulebook into one file, so the team only needs 3 files (attached):

1. **MATCHING_KIT.txt:** everything in one place.

   - Part 1: the steps for them to read.
   - Part 2: the prompt they paste into Claude.
   - Part 3: the rules.

2. **match_rules.py:** the program that does the checking. Claude runs it, so nobody needs to open it.
3. **our_shops_CA.csv:** our list of California shops. Every result gets checked against it.

The other two files I sent you (the updated California list and the 301 shops to check) are for you and me, not the team. I'll web-check those 301 myself.

**Message to send the team (copy and paste):**

> Hi team, from now on, any data we collect (Google, Yelp, Facebook, Angi, websites) has to go through a matching check before we use it. This stops us from mixing up businesses with similar names. In our test, skipping it gave us the wrong business about 1 in 7 times.

> I'm attaching 3 files:

> 1. MATCHING_KIT.txt, which has the steps (Part 1), the prompt to paste into Claude (Part 2) and the rules (Part 3)
> 2. match_rules.py, the program Claude runs to do the checking
> 3. our_shops_CA.csv, our California shop list that everything gets matched against

> Please read Part 1 first and set up the Matching folder in Drive. When you run a search, always include our shop ID (the licence number) so the results can be tied back to our shops. The first file to put through is the Google lookup results. When each file is done, send me one line with the counts and the spot check result.
