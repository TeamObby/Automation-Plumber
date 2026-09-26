#  Huddle notes: 9/25/26 with @Kevin and @Hridoy

AI took notes for this huddle from **10:58:02 PM - 11:37:17 PM GMT+6**. @Kevin outlined a lead qualification system with nightly automation, job ads scraping, and infrastructure to intelligently distribute contacts between screener and sales pipeline by Monday. [View huddle in channel](https://obbygroup.slack.com/archives/D0ADWHW14L9/p1790355400649329)

##  Attendees

@Kevin, @Hridoy, @Mohimenul, and @Tausif

##  Summary
- Lead Qualification Criteria and Tiering

  - @Kevin defined four core criteria: owner likelihood (binary), residential focus (binary), call volume/business activity (percentage-weighted), and business longevity/direction (percentage-weighted). [9:22] [13:19] [16:14]

  - Owner and residential must both be "likely" to reach screener; "unlikely" or "unsure" leads are tagged and saved for future products. [13:02] [11:38]

  - Call volume weighted 70%, direction weighted 30% to produce final tier score; only top tier (estimated 20-30%) goes to screener initially. [16:14] [18:38]

  - Data staleness risk: businesses without recent reviews (past 6 months) may be defunct; nightly incremental scraping prevents this. [14:18] [14:38]

- Nightly Batch Automation Strategy

  - @Kevin proposed processing contacts incrementally across states (California ~18,000, Texas, Florida) rather than all at once to keep reviews and business data current. [4:23] [6:25]

  - Screener queue should be calibrated based on @Kevin's pipeline capacity and geographic distribution to balance workload. [6:44] [7:01]

  - @Hridoy clarified that screener calls regardless of email status; once leads enter @Kevin's pipeline, email follow-up resumes normally. [7:53]

- Job Ads Scraping as Priority Lead Source

  - @Kevin proposed daily scraping of job boards for plumbers hiring receptionists/dispatchers, then reverse-searching to find owner contact info. [19:34] [19:55]

  - Job ads leads bypass normal tiering; they go directly to screener as highest priority because they signal immediate need. [21:06] [21:22]

  - Requires two new automations: batch job ads scraping and single-contact individual scraping for businesses not in database. [20:28] [20:45]

  - Pitch angle: "I saw you're hiring a receptionist—can I grab a few minutes?" to test higher close rate. [21:57]

- Infrastructure and Intelligent Automation Layer

  - @Kevin described need for Claude as central trigger waking 1-3 times daily to check pipeline status, inventory levels, and execute all automations. [32:39] [33:36]

  - System requires surplus logic: if screener can call 200/day, maintain 400+ contacts ready; when inventory drops below threshold, automation replenishes. [34:19] [34:37] [34:56]

  - Current state is manual (asking team for more scraping); goal is fully autonomous system that "keeps going on its own." [35:31]

- Monday Deadline Scope and Priorities

  - Monday requires: database-to-Go High Level communication, screener setup, call logging, phone number prioritization, and matching logic—not yet nightly automation. [36:13] [36:47]

  - @Kevin ranked highest priorities: screener setup, database supply, call logging, and matching logic. [37:22]

  - Job ads scraping is lower priority for Monday but should be built afterward. [23:57]

- Task Status and Assignments

  - @Tausif completed task 1 logic for first 500 contacts but hasn't integrated into Supabase infrastructure yet. [2:05] [31:32]

  - @Mohimenul reviewed task 5 (partially completed by prior team members) and will finalize it. [25:21] [25:53]

  - @Hridoy owns screener setup (task 6) and must determine if dialer account can be named and linked to database. [26:13] [30:43]

##  Action items
- @Kevin will pass full tiering logic and step-by-step automation order to team once ready. [28:49]

- @Hridoy check if dialer account can be assigned a name and linked back to database for call attribution. [30:43]

- @Hridoy work with Claude to design screener queue column and naming convention (screener queue → attempt one flow). [27:34]

- @Tausif and @Mohimenul coordinate to decide task ownership and begin work. [24:56]

- @Mohimenul complete task 5 finalization. [25:53]

- Team meet tomorrow morning at 9:30am to align before @Hridoy onboards Topu Sunday morning. [40:11] [39:17]

---

_This tool uses AI to generate notes, so some information may be inaccurate. They're based on the huddle transcript and thread and can be edited anytime._

File ID: sf:F0C4JNFSWRY, File URL: https://obbygroup.slack.com/files/USLACKBOT/F0C4JNFSWRY/huddle_transcript
