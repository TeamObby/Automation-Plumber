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
 *   - final_outcome must be one of the 19 known slugs, lowercase-hyphenated.
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
  'recording_url', 'call_id', 'call_transcript', 'ghl_link'
];

const EMAIL_LOG_HEADERS = [
  'timestamp_pt', 'date_pt', 'contact_id', 'company', 'city',
  'campaign_id', 'step', 'event_type', 'reply_classification',
  'instantly_lead_id', 'email_id'
];

// ---- Column refs — resolved from the REAL header row at build time --------
// Never hardcode column letters. The daily formulas used to assume a fixed
// order; when call_log was built with a different header set every outcome
// metric silently read the wrong column (and read 0). resolveRefs_() looks
// each column up by NAME and throws if it is missing, so drift fails loudly.
let C_DATE, C_CONTACT, C_ATTEMPT, C_PICKED, C_DUR, C_SRC, C_OUT;
let E_DATE, E_STEP, E_TYPE, E_CLASS;

/** 0-based index -> A1 column letter (A, B, ... Z, AA, ...). */
function colLetter_(i) {
  let s = '';
  for (i += 1; i > 0; i = Math.floor((i - 1) / 26)) {
    s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  }
  return s;
}

/** Full-column A1 ref for `header` on `sheetName`, located by name. */
function colRef_(ss, sheetName, header) {
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Missing sheet: ' + sheetName);
  const row1 = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
    .map(v => String(v).trim());
  const i = row1.indexOf(header);
  if (i < 0) {
    throw new Error('Column "' + header + '" not found in ' + sheetName +
      '. Header row is: ' + row1.join(' | '));
  }
  const L = colLetter_(i);
  return sheetName + '!$' + L + '$2:$' + L;
}

/** Resolve every column ref from the live header rows. Call before building. */
function resolveRefs_(ss) {
  C_DATE    = colRef_(ss, 'call_log',  'date_pt');
  C_CONTACT = colRef_(ss, 'call_log',  'contact_id');
  C_ATTEMPT = colRef_(ss, 'call_log',  'attempt_no');
  C_PICKED  = colRef_(ss, 'call_log',  'picked_up');
  C_DUR     = colRef_(ss, 'call_log',  'duration_sec');
  C_SRC     = colRef_(ss, 'call_log',  'disposition_source');
  C_OUT     = colRef_(ss, 'call_log',  'final_outcome');
  E_DATE    = colRef_(ss, 'email_log', 'date_pt');
  E_STEP    = colRef_(ss, 'email_log', 'step');
  E_TYPE    = colRef_(ss, 'email_log', 'event_type');
  E_CLASS   = colRef_(ss, 'email_log', 'reply_classification');
}

/** Every distinct date across both logs, newest first. Spills down column A. */
function dateSpine_() {
  return `IFERROR(SORT(UNIQUE(FILTER(` +
    `{${C_DATE};${E_DATE}},{${C_DATE};${E_DATE}}<>"")),1,FALSE),"")`;
}

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
function dailyColumns_() {
  return [
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
}

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
  resolveRefs_(ss);                 // locate every log column by header name
  const COLS = dailyColumns_();
  const sh = createOrReset_(ss, 'daily');
  const n = COLS.length;
  const rows = MAX_DAILY_ROWS;

  sh.getRange(1, 1, 1, n)
    .setValues([COLS.map(c => c.header)])
    .setFontWeight('bold')
    .setBackground(HEADER_BG)
    .setFontColor(HEADER_FG)
    .setVerticalAlignment('middle')
    .setWrap(false);

  sh.setFrozenRows(1);
  sh.setFrozenColumns(1);
  sh.setRowHeight(1, 34);

  // Column A generates itself from the logs, sorted newest-first.
  sh.getRange(2, 1).setFormula('=' + dateSpine_());

  // Metric columns are pre-filled down to MAX_DAILY_ROWS and stay blank
  // until the spine above delivers a date into their row.
  const firstRow = COLS.slice(1)
    .map(c => `=IF($A2="","",${c.formula})`);
  sh.getRange(2, 2, 1, n - 1).setFormulas([firstRow]);
  if (rows > 1) {
    sh.getRange(2, 2, 1, n - 1).copyTo(sh.getRange(3, 2, rows - 1, n - 1));
  }

  COLS.forEach((c, i) => {
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
