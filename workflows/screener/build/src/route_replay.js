// Dedupe on call_id, in three ways (the row is from Find Row; {} when the call is new):
//   done      — classified AND written back to GHL: stop.
//   writeback — classified, but the GHL write-back failed or never ran: reuse the stored verdict
//               and retry the compare, without paying for the AI again.
//   classify  — new call, or the AI failed last time: the full path.
const n = $('Normalize Call').first().json;
const row = $input.first().json || {};
const known = !!row.call_id;
const route = !known || row.ai_ok !== true ? 'classify' : (row.writeback_ok === true ? 'done' : 'writeback');
return [{ json: route === 'writeback' ? Object.assign({}, row, { route }) : Object.assign({}, n, { route }) }];
