/**
 * WaterLine Growth — Screener Log Workbook Setup
 * ----------------------------------------------
 * Deliberately a SEPARATE spreadsheet from "Plumber Campaign Metrics". The
 * screener system is isolated from Kevin's campaign everywhere else (own
 * pipeline, own tags, own n8n workflows, no writes into his objects) and its
 * reporting is isolated too: this log answers "is the screener marking calls
 * correctly", not "how is the campaign doing". It can be retired once
 * screening is proven without touching the campaign workbook.
 *
 * Creates two tabs:
 *   screen_log — one row per screener event (append-only, written by n8n)
 *   accuracy   — 100% formulas over screen_log: per-screener match rate and
 *                the owner-verified count per Pacific hour block
 *
 * Run setupScreenerLog() once. Safe to re-run ONLY before there is live data:
 * it rebuilds both tabs and CLEARS screen_log. Use rebuildAccuracyOnly()
 * afterwards.
 *
 * DATA CONTRACT (n8n must honor these or the accuracy formulas silently
 * return 0 — the same trap as the campaign workbook):
 *   - Write with valueInputMode USER_ENTERED.
 *   - date_pt / timestamp_pt must be real dates, not text ("2026-09-23").
 *   - match and ai_quote_verified must be boolean TRUE / FALSE, never the
 *     strings "true"/"yes". match is !mismatch from the Compare Step's
 *     Decide node; leave it BLANK while the compare is still waiting for the
 *     other half, so a pending row is not counted as a miss.
 *   - attempt_no / duration_sec / ai_confidence must be numbers.
 *   - event is exactly one of: call, no-answer, voicemail, bad-number.
 *     Only "call" rows carry a transcript-backed AI verdict; the attempt
 *     ladder writes the other three, and they are what make an unanswered
 *     dial visible here at all.
 *   - screener_outcome is the screener's own pick, spelled exactly as the
 *     GHL dropdown: "Owner - Busy", "Owner - Quiet", "Gatekeeper",
 *     "Not Sure", "Wrong Number", "Not A Plumber", "Do Not Call".
 *   - pt_block is "PT 09-10" style; blank when the call landed outside
 *     06:00-16:00 Pacific.
 *   - result_stage is the stage the Compare Step moved the opportunity to.
 *   - call_id is the dedup key: n8n appends-OR-updates on it, so a screener
 *     who re-marks a call updates that row instead of adding one. The
 *     no-answer path has no call_id — those rows plain-append.
 */

// ---------------------------------------------------------------- CONFIG
const TZ = 'America/Los_Angeles';

const HEADER_BG = '#1f3864';
const HEADER_FG = '#ffffff';
const SECTION_BG = '#d9e2f3';

const COL_MIN_WIDTH = 90;
const COL_MAX_WIDTH = 240;
const COL_PAD = 16;

// The ten Pacific hour blocks the screener buckets a call into (spec §6).
const PT_BLOCKS = [
  'PT 06-07', 'PT 07-08', 'PT 08-09', 'PT 09-10', 'PT 10-11',
  'PT 11-12', 'PT 12-13', 'PT 13-14', 'PT 14-15', 'PT 15-16'
];

// ---------------------------------------------------------------- SCHEMA
const SCREEN_LOG_HEADERS = [
  'timestamp_pt', 'date_pt', 'contact_id', 'company', 'screener',
  'screener_user_id', 'attempt_no', 'event', 'duration_sec', 'pt_block',
  'screener_outcome', 'noise', 'ai_call_outcome', 'ai_owner_reached',
  'ai_confidence', 'ai_quote_verified', 'match', 'result_stage', 'reason',
  'recording_url', 'call_id', 'ghl_link'
];

// ---- Column refs — resolved from the REAL header row at build time -------
// Never hardcode column letters: the campaign workbook once read the wrong
// column for every outcome metric because the header order had drifted, and
// it reported 0 rather than failing. Look each one up by NAME and throw.
let S_DATE, S_SCREENER, S_EVENT, S_BLOCK, S_OUTCOME, S_MATCH, S_STAGE;

/** 0-based index -> A1 column letter (A, B, ... Z, AA, ...). */
function colLetter_(i) {
  let s = '';
  i += 1;
  while (i > 0) {
    const r = (i - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    i = (i - r - 1) / 26;
  }
  return s;
}

/** "screen_log!$E" for the column whose header is `header`. Throws if gone. */
function colRef_(ss, sheetName, header) {
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Missing sheet: ' + sheetName);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const i = headers.indexOf(header);
  if (i < 0) throw new Error('Missing column "' + header + '" in ' + sheetName);
  return sheetName + '!$' + colLetter_(i);
}

function resolveRefs_(ss) {
  S_DATE     = colRef_(ss, 'screen_log', 'date_pt');
  S_SCREENER = colRef_(ss, 'screen_log', 'screener');
  S_EVENT    = colRef_(ss, 'screen_log', 'event');
  S_BLOCK    = colRef_(ss, 'screen_log', 'pt_block');
  S_OUTCOME  = colRef_(ss, 'screen_log', 'screener_outcome');
  S_MATCH    = colRef_(ss, 'screen_log', 'match');
  S_STAGE    = colRef_(ss, 'screen_log', 'result_stage');
}

/** Whole-column range, e.g. "screen_log!$E:$E". */
function col_(ref) { return ref + ':' + ref.split('!')[1]; }

// ---------------------------------------------------------------- SETUP
function setupScreenerLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(TZ);

  buildLogSheet_(ss, 'screen_log', SCREEN_LOG_HEADERS);
  buildAccuracySheet_(ss);

  const leftover = ss.getSheetByName('Sheet1');
  if (leftover && ss.getSheets().length > 1) ss.deleteSheet(leftover);

  orderTabs_(ss, ['accuracy', 'screen_log']);
  ss.setActiveSheet(ss.getSheetByName('accuracy'));
  Logger.log('Screener log ready: screen_log + accuracy');
}

/** Rebuild only the accuracy tab — keeps logged rows intact. */
function rebuildAccuracyOnly() {
  buildAccuracySheet_(SpreadsheetApp.getActiveSpreadsheet());
}

/**
 * Moves tabs into the given left-to-right order. moveActiveSheet() works on
 * whatever is active, so each sheet is activated in turn.
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
 * Sizes every column to its widest cell, then clamps into a sane band.
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

  // timestamp_pt is column A, date_pt is column B.
  sh.getRange(2, 1, sh.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sh.getRange(2, 2, sh.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd');

  if (sh.getMaxColumns() > headers.length) {
    sh.deleteColumns(headers.length + 1, sh.getMaxColumns() - headers.length);
  }
  fitColumns_(sh, headers.length);
}

/**
 * The accuracy tab: three blocks of formulas over screen_log.
 *
 *   1. Per screener — the number Kevin asked for: how often the screener's
 *      own mark survived the AI cross-check. A blank `match` (the compare is
 *      still waiting for the other half) counts in neither column, so a
 *      pending row cannot look like a miss.
 *   2. Per Pacific hour block — how many owner-verified leads each block
 *      holds. This is the same population Kevin filters his board by, so the
 *      two should agree; a block stuck at 0 means nobody reaches owners then.
 *   3. Events — how the dials ended, including the unanswered ones that
 *      never reach the AI at all.
 *
 * Layout note: the per-screener block is the only one that GROWS (UNIQUE
 * spills down column A), so it sits last-but-one in the sheet's vertical
 * budget: BLOCK_ROW leaves it room for MAX_SCREENERS before the next block.
 */
function buildAccuracySheet_(ss) {
  resolveRefs_(ss);
  const sh = createOrReset_(ss, 'accuracy');

  const screener = col_(S_SCREENER);
  const event    = col_(S_EVENT);
  const block    = col_(S_BLOCK);
  const outcome  = col_(S_OUTCOME);
  const match    = col_(S_MATCH);
  const stage    = col_(S_STAGE);

  const HEAD_ROW = 5;          // per-screener header
  const FIRST    = 6;          // where the UNIQUE spill starts
  const MAX_SCREENERS = 12;    // two now; room to grow without a rebuild

  sh.getRange('A1').setValue('Screener accuracy');
  sh.getRange('A2').setValue(
    'Formulas only — every number comes from screen_log. A blank match means the compare step is still waiting.');

  // ---- 1. per screener --------------------------------------------------
  sh.getRange(4, 1, 1, 6).setValues([['Per screener', '', '', '', '', '']]);
  sh.getRange(HEAD_ROW, 1, 1, 6)
    .setValues([['screener', 'dials', 'marked owner', 'owner verified', 'mismatches', 'match rate']]);

  const spill = '$A' + FIRST + ':$A' + (FIRST + MAX_SCREENERS - 1);
  const countBy = extra =>
    '=ARRAYFORMULA(IF(' + spill + '="","",COUNTIFS(' + screener + ',' + spill + (extra || '') + ')))';
  const matched = v => 'COUNTIFS(' + screener + ',' + spill + ',' + match + ',' + v + ')';

  sh.getRange(FIRST, 1, 1, 6).setFormulas([[
    '=IFERROR(SORT(UNIQUE(FILTER(' + screener + ',' + screener + '<>"",ROW(' + screener + ')>1))),"")',
    countBy(),
    countBy(',' + outcome + ',"Owner -*"'),
    countBy(',' + stage + ',"Owner Verified"'),
    countBy(',' + match + ',FALSE'),
    '=ARRAYFORMULA(IF(' + spill + '="","",IFERROR(' + matched('TRUE') + '/(' +
      matched('TRUE') + '+' + matched('FALSE') + '),"")))'
  ]]);

  // ---- 2. per Pacific hour block ---------------------------------------
  const B0 = FIRST + MAX_SCREENERS + 1;
  sh.getRange(B0, 1, 1, 6).setValues([['Per Pacific hour block', '', '', '', '', '']]);
  sh.getRange(B0 + 1, 1, 1, 6)
    .setValues([['block', 'owner verified', 'dials', 'owner rate', '', '']]);
  PT_BLOCKS.forEach((b, i) => {
    const row = B0 + 2 + i;
    sh.getRange(row, 1).setValue(b);
    sh.getRange(row, 2).setFormula('=COUNTIFS(' + block + ',"' + b + '",' + stage + ',"Owner Verified")');
    sh.getRange(row, 3).setFormula('=COUNTIF(' + block + ',"' + b + '")');
    sh.getRange(row, 4).setFormula('=IFERROR(B' + row + '/C' + row + ',"")');
  });

  // ---- 3. how the dials ended ------------------------------------------
  const EVENTS = ['call', 'no-answer', 'voicemail', 'bad-number'];
  const E0 = B0 + 2 + PT_BLOCKS.length + 1;
  sh.getRange(E0, 1, 1, 6).setValues([['How the dials ended', '', '', '', '', '']]);
  sh.getRange(E0 + 1, 1, 1, 6).setValues([['event', 'count', '', '', '', '']]);
  EVENTS.forEach((e, i) => {
    sh.getRange(E0 + 2 + i, 1).setValue(e);
    sh.getRange(E0 + 2 + i, 2).setFormula('=COUNTIF(' + event + ',"' + e + '")');
  });
  const T = E0 + 2 + EVENTS.length;
  sh.getRange(T, 1).setValue('rows logged');
  sh.getRange(T, 2).setFormula('=MAX(0,COUNTA(' + col_(S_DATE) + ')-1)');

  // ---- cosmetics --------------------------------------------------------
  sh.getRange('A1').setFontSize(14).setFontWeight('bold');
  sh.getRange('A2').setFontColor('#666666').setFontStyle('italic');
  [4, B0, E0].forEach(r => sh.getRange(r, 1, 1, 6).setBackground(SECTION_BG).setFontWeight('bold'));
  [HEAD_ROW, B0 + 1, E0 + 1].forEach(r =>
    sh.getRange(r, 1, 1, 6).setFontWeight('bold').setBackground(HEADER_BG).setFontColor(HEADER_FG));
  sh.getRange(T, 1, 1, 2).setFontWeight('bold');
  sh.getRange(FIRST, 6, MAX_SCREENERS, 1).setNumberFormat('0.0%');
  sh.getRange(B0 + 2, 4, PT_BLOCKS.length, 1).setNumberFormat('0.0%');
  sh.setFrozenRows(1);
  if (sh.getMaxColumns() > 6) sh.deleteColumns(7, sh.getMaxColumns() - 6);
  fitColumns_(sh, 6);
}
