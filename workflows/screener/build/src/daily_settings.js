// Settings for Screener: Daily Sweep (spec §7 freshness · §10.2 item 7b). DRY_RUN plans everything and
// reports it in Slack but writes nothing to GHL: use it for the first real runs.
const DRY_RUN = false;
const MAX_CONTACTS = 50;        // contacts changed per run at most; the rest wait for tomorrow (reported)
const STALE_DAYS = 14;          // Date Screened older than this = stale (Kevin, ~25:20)
const SCREENER_USER_ID = '';    // GHL user a re-screened lead is assigned to (the screener); '' = unassigned, reported
const now = Date.now();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date(now));
return [{ json: { dry_run: DRY_RUN, max_contacts: MAX_CONTACTS, stale_days: STALE_DAYS, screener_user_id: SCREENER_USER_ID, now_ms: now, today_pt: today } }];
