/**
 * WaterLine Growth — Campaign Metrics Workbook Setup
 * ---------------------------------------------------
 * Creates three tabs in the active spreadsheet:
 *   call_log   — one row per dial (append-only, written by n8n)
 *   email_log  — one row per email event (append-only, written by n8n)
 *   daily      — one row per date, newest first, 100% formulas over the logs
 *
 * The daily date column is self-generating: it pulls every distinct date
 * present in either log and sorts descending, so the newest day is always
 * row 2 and no future/empty rows clutter the top. A date with zero activity
 * in both logs gets no row at all.
 *
 * Run setupMetricsWorkbook() once. Safe to re-run: it rebuilds the tabs.
 * WARNING: re-running CLEARS existing log rows. Use rebuildDailyOnly()
 * once you have live data.
 *
 * The two log tabs are plain append-only sheets: n8n writes each new row at
 * the bottom and nothing reorders them. Only `daily` is newest-first, which
 * it achieves through its own formula rather than by sorting anything.
 *
 * DATA CONTRACT (n8n must honor these or the formulas silently return 0):
 *   - date_pt   must be a real date, not text. Write "2026-07-19" with
 *               valueInputMode USER_ENTERED so Sheets parses it.
 *   - picked_up must be boolean TRUE / FALSE, not the strings "true"/"yes".
 *   - attempt_no must be the number 1, 2, or 3 (cadence position).
 *   - final_outcome must be one of the 15 known slugs, lowercase-hyphenated.
 *   - disposition_source must be exactly "human" or "ai_fallback".
 *   - call_id (call_log) is the dedup key for dispositioned calls: the
 *     Cold/Gatekeeper Handler uses append-OR-update on it, so a re-edited
 *     disposition updates the same row instead of adding one. Must be
 *     non-empty and unique per dial. Missed-call rows leave it blank (they
 *     fire once, so they plain-append).
 *   - duration_sec / recording_url / call_transcript are captured per dial by
 *     Capture Call Record and threaded through Call Router Context. Only the
 *     DISPOSITION handlers write them; missed-call rows leave them blank.
 *     duration_sec must be a bare number-as-text ("47") so USER_ENTERED
 *     parses it — avg_call_duration_sec on `daily` averages this column.
 *   - call_transcript is free text: the handler prefixes a leading ' when the
 *     transcript starts with = + @ or -, so USER_ENTERED cannot read it as a
 *     formula, and truncates at 45k chars (Sheets caps a cell at 50k).
 */

// ---------------------------------------------------------------- CONFIG
const MAX_DAILY_ROWS = 400; // how many formula rows to pre-fill on `daily`
const TZ = 'America/Los_Angeles';

const HEADER_BG = '#1f3864';
const HEADER_FG = '#ffffff';

// Column sizing. autoResize hugs the text, so PAD buys a little breathing
// room; MIN keeps narrow numeric columns from collapsing.
const COL_MIN_WIDTH = 90;
const COL_MAX_WIDTH = 240;
const COL_PAD = 16;

// ---------------------------------------------------------------- SCHEMA
const CALL_LOG_HEADERS = [
  'timestamp_pt', 'date_pt', 'contact_id', 'company', 'city',
  'from_number', 'pipeline', 'stage_name', 'attempt_no', 'is_mgr',
  'is_missed_variant', 'picked_up', 'duration_sec', 'disposition_source',
  'disposition_slug', 'ai_outcome', 'final_outcome', 'resume_call_at',
  'recording_url', 'call_id', 'call_transcript'
];

const EMAIL_LOG_HEADERS = [
  'timestamp_pt', 'date_pt', 'contact_id', 'company', 'city',
  'campaign_id', 'step', 'event_type', 'reply_classification',
  'instantly_lead_id', 'email_id'
];

// call_log column refs:
//   B date_pt | C contact_id | I attempt_no | L picked_up
//   M duration_sec | N disposition_source | Q final_outcome
const C_DATE = 'call_log!$B$2:$B';
const C_CONTACT = 'call_log!$C$2:$C';
const C_ATTEMPT = 'call_log!$I$2:$I';
const C_PICKED = 'call_log!$L$2:$L';
const C_DUR = 'call_log!$M$2:$M';
const C_SRC = 'call_log!$N$2:$N';
const C_OUT = 'call_log!$Q$2:$Q';

// email_log column refs:
//   B date_pt | G step | H event_type | I reply_classification
const E_DATE = 'email_log!$B$2:$B';
const E_STEP = 'email_log!$G$2:$G';
const E_TYPE = 'email_log!$H$2:$H';
const E_CLASS = 'email_log!$I$2:$I';

// Every distinct date across both logs, newest first. Spills down column A.
const DATE_SPINE = `IFERROR(SORT(UNIQUE(FILTER(` +
  `{${C_DATE};${E_DATE}},{${C_DATE};${E_DATE}}<>"")),1,FALSE),"")`;

/** Count call_log rows on $A2 matching a final_outcome pattern. */
function outcomeCount_(pattern) {
  return `COUNTIFS(${C_DATE},$A2,${C_OUT},"${pattern}")`;
}

/** Trailing-7-day email event count ending on $A2. */
function email7d_(type) {
  return `COUNTIFS(${E_DATE},">="&$A2-6,${E_DATE},"<="&$A2,${E_TYPE},"${type}")`;
}

/** Same-day email event count. */
function emailDay_(type) {
  return `COUNTIFS(${E_DATE},$A2,${E_TYPE},"${type}")`;
}

/** Dials / connects for one cadence attempt number. */
function attemptDials_(n) {
  return `COUNTIFS(${C_DATE},$A2,${C_ATTEMPT},${n})`;
}
function attemptConnects_(n) {
  return `COUNTIFS(${C_DATE},$A2,${C_ATTEMPT},${n},${C_PICKED},TRUE)`;
}

/**
 * The daily tab. Order matters — formulas reference sibling columns by
 * letter, so inserting a column means fixing the ones after it.
 */
const DAILY_COLUMNS = [
  { header: 'date', format: 'yyyy-mm-dd', formula: null },

  // ---- calls, overall
  { header: 'dials', format: '0',
    formula: `COUNTIFS(${C_DATE},$A2)` },
  { header: 'unique_contacts_dialed', format: '0',
    formula: `IFERROR(COUNTA(UNIQUE(FILTER(${C_CONTACT},${C_DATE}=$A2))),0)` },
  { header: 'connects', format: '0',
    formula: `COUNTIFS(${C_DATE},$A2,${C_PICKED},TRUE)` },
  { header: 'connect_rate', format: '0.0%',
    formula: `IFERROR($D2/$B2,"")` },
  { header: 'voicemails', format: '0',
    formula: outcomeCount_('voicemail') },
  { header: 'voicemail_rate', format: '0.0%',
    formula: `IFERROR($F2/$D2,"")` },
  { header: 'humans_reached', format: '0',
    formula: `$D2-$F2` },
  { header: 'dm_reached', format: '0',
    formula: `$D2-$F2-${outcomeCount_('gatekeeper-*')}-${outcomeCount_('call-center')}` },
  { header: 'dm_rate', format: '0.0%',
    formula: `IFERROR($I2/$B2,"")` },

  // ---- calls, by cadence attempt
  { header: 'c1_dials', format: '0', formula: attemptDials_(1) },
  { header: 'c1_connects', format: '0', formula: attemptConnects_(1) },
  { header: 'c1_pickup_rate', format: '0.0%',
    formula: `IFERROR($L2/$K2,"")` },
  { header: 'c2_dials', format: '0', formula: attemptDials_(2) },
  { header: 'c2_connects', format: '0', formula: attemptConnects_(2) },
  { header: 'c2_pickup_rate', format: '0.0%',
    formula: `IFERROR($O2/$N2,"")` },
  { header: 'c3_dials', format: '0', formula: attemptDials_(3) },
  { header: 'c3_connects', format: '0', formula: attemptConnects_(3) },
  { header: 'c3_pickup_rate', format: '0.0%',
    formula: `IFERROR($R2/$Q2,"")` },

  // ---- call outcomes
  { header: 'conversations_started', format: '0',
    formula: outcomeCount_('conversation-active*') },
  { header: 'appointments_booked', format: '0',
    formula: outcomeCount_('appointment-booked') },
  { header: 'sales_calls', format: '0',
    formula: outcomeCount_('sales-call') },
  { header: 'callbacks_scheduled', format: '0',
    formula: outcomeCount_('*-on-hold') },
  { header: 'not_interested', format: '0',
    formula: outcomeCount_('not-interested-right-now-*') },
  { header: 'dnc', format: '0',
    formula: outcomeCount_('do-not-contact') },

  // ---- email volume (raw counts only; see rates below)
  { header: 'emails_sent', format: '0', formula: emailDay_('sent') },
  { header: 'e1_sent', format: '0',
    formula: `COUNTIFS(${E_DATE},$A2,${E_TYPE},"sent",${E_STEP},1)` },
  { header: 'e2_sent', format: '0',
    formula: `COUNTIFS(${E_DATE},$A2,${E_TYPE},"sent",${E_STEP},2)` },
  { header: 'e3_sent', format: '0',
    formula: `COUNTIFS(${E_DATE},$A2,${E_TYPE},"sent",${E_STEP},3)` },
  { header: 'e4_sent', format: '0',
    formula: `COUNTIFS(${E_DATE},$A2,${E_TYPE},"sent",${E_STEP},4)` },
  { header: 'opens', format: '0', formula: emailDay_('opened') },
  { header: 'bounces', format: '0', formula: emailDay_('bounced') },
  { header: 'replies', format: '0', formula: emailDay_('replied') },
  { header: 'positive_replies', format: '0',
    formula: `COUNTIFS(${E_DATE},$A2,${E_TYPE},"replied",${E_CLASS},"conversation_active")` },

  // ---- email rates, trailing 7d.
  // Deliberately NOT same-day: an email sent Monday is replied to Thursday,
  // so a same-day ratio compares two unrelated cohorts.
  { header: 'open_rate_7d', format: '0.0%',
    formula: `IFERROR(${email7d_('opened')}/${email7d_('sent')},"")` },
  { header: 'bounce_rate_7d', format: '0.0%',
    formula: `IFERROR(${email7d_('bounced')}/${email7d_('sent')},"")` },
  { header: 'reply_rate_7d', format: '0.0%',
    formula: `IFERROR(${email7d_('replied')}/${email7d_('sent')},"")` },
  { header: 'positive_reply_rate_7d', format: '0.0%',
    formula: `IFERROR(COUNTIFS(${E_DATE},">="&$A2-6,${E_DATE},"<="&$A2,${E_TYPE},"replied",${E_CLASS},"conversation_active")/${email7d_('replied')},"")` },

  // ---- automation health
  { header: 'fallback_rate', format: '0.0%',
    formula: `IFERROR(COUNTIFS(${C_DATE},$A2,${C_SRC},"ai_fallback")/$D2,"")` },
  { header: 'avg_call_duration_sec', format: '0',
    formula: `IFERROR(AVERAGEIFS(${C_DUR},${C_DATE},$A2,${C_PICKED},TRUE),"")` }
];

// ---------------------------------------------------------------- ENTRY
function setupMetricsWorkbook() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(TZ);

  buildLogSheet_(ss, 'call_log', CALL_LOG_HEADERS);
  buildLogSheet_(ss, 'email_log', EMAIL_LOG_HEADERS);
  buildDailySheet_(ss);

  // Drop the default empty tab if it is still around and unused.
  const leftover = ss.getSheetByName('Sheet1');
  if (leftover && ss.getSheets().length > 1) ss.deleteSheet(leftover);

  orderTabs_(ss, ['daily', 'call_log', 'email_log']);

  ss.setActiveSheet(ss.getSheetByName('daily'));
  SpreadsheetApp.getUi().alert(
    'Metrics workbook ready.\n\n' +
    'Tabs: call_log, email_log, daily\n' +
    'The daily tab fills itself as the logs receive rows, newest date first.'
  );
}

/** Rebuild only the daily tab — keeps logged data intact. */
function rebuildDailyOnly() {
  buildDailySheet_(SpreadsheetApp.getActiveSpreadsheet());
}

/**
 * Moves tabs into the given left-to-right order. moveActiveSheet() works on
 * whatever is active, so each sheet is activated in turn; any tab not named
 * here keeps its relative position after the listed ones.
 */
function orderTabs_(ss, names) {
  names.forEach((name, i) => {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    ss.setActiveSheet(sh);
    ss.moveActiveSheet(i + 1);
  });
}

/**
 * Sizes every column to its widest cell — which, since the data below is
 * short numbers, is effectively the header — then clamps into a sane band.
 * Headers must not be wrapped when this runs, or autoResize sizes to the
 * wrapped width instead of the full text.
 */
function fitColumns_(sh, n) {
  sh.autoResizeColumns(1, n);
  for (let i = 1; i <= n; i++) {
    const w = sh.getColumnWidth(i) + COL_PAD;
    sh.setColumnWidth(i, Math.max(COL_MIN_WIDTH, Math.min(COL_MAX_WIDTH, w)));
  }
}

// ---------------------------------------------------------------- BUILD
function createOrReset_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (sh) {
    // clear() leaves merges behind, which makes setValues throw on re-run.
    sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart();
    sh.clear();
    sh.clearConditionalFormatRules();
    if (sh.getFrozenRows()) sh.setFrozenRows(0);
    if (sh.getFrozenColumns()) sh.setFrozenColumns(0);
  } else {
    sh = ss.insertSheet(name);
  }
  return sh;
}

function buildLogSheet_(ss, name, headers) {
  const sh = createOrReset_(ss, name);

  sh.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground(HEADER_BG)
    .setFontColor(HEADER_FG)
    .setVerticalAlignment('middle');

  sh.setFrozenRows(1);
  sh.setFrozenColumns(2);
  sh.setRowHeight(1, 32);

  // timestamp_pt is column A, date_pt is column B, in both logs.
  sh.getRange(2, 1, sh.getMaxRows() - 1, 1)
    .setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sh.getRange(2, 2, sh.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd');

  // Trim unused columns so the tab does not sprawl.
  if (sh.getMaxColumns() > headers.length) {
    sh.deleteColumns(headers.length + 1, sh.getMaxColumns() - headers.length);
  }
  fitColumns_(sh, headers.length);
}

function buildDailySheet_(ss) {
  const sh = createOrReset_(ss, 'daily');
  const n = DAILY_COLUMNS.length;
  const rows = MAX_DAILY_ROWS;

  sh.getRange(1, 1, 1, n)
    .setValues([DAILY_COLUMNS.map(c => c.header)])
    .setFontWeight('bold')
    .setBackground(HEADER_BG)
    .setFontColor(HEADER_FG)
    .setVerticalAlignment('middle')
    .setWrap(false);

  sh.setFrozenRows(1);
  sh.setFrozenColumns(1);
  sh.setRowHeight(1, 34);

  // Column A generates itself from the logs, sorted newest-first.
  sh.getRange(2, 1).setFormula('=' + DATE_SPINE);

  // Metric columns are pre-filled down to MAX_DAILY_ROWS and stay blank
  // until the spine above delivers a date into their row.
  const firstRow = DAILY_COLUMNS.slice(1)
    .map(c => `=IF($A2="","",${c.formula})`);
  sh.getRange(2, 2, 1, n - 1).setFormulas([firstRow]);
  if (rows > 1) {
    sh.getRange(2, 2, 1, n - 1).copyTo(sh.getRange(3, 2, rows - 1, n - 1));
  }

  DAILY_COLUMNS.forEach((c, i) => {
    sh.getRange(2, i + 1, rows, 1).setNumberFormat(c.format);
  });

  // Highlight today's row.
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$A2=TODAY()')
    .setBackground('#fff2cc')
    .setRanges([sh.getRange(2, 1, rows, n)])
    .build();
  sh.setConditionalFormatRules([rule]);

  if (sh.getMaxColumns() > n) {
    sh.deleteColumns(n + 1, sh.getMaxColumns() - n);
  }
  fitColumns_(sh, n);
}
