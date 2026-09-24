// What the compare step did, for the caller and the execution log. A failed request does not
// stop the others (onError continue); it is listed here instead. ok=false leaves the call's row at
// writeback_ok=false, and Screener: Write-back Retry reruns the whole compare (save-first).
const plan = $('Decide').first().json;
const run_started_ms = $('Plan Save').first().json.run_started_ms;
let sent = [];
try { sent = $('Split Ops').all().map(i => i.json); } catch (e) { sent = []; }   // nothing to write
const failed = sent.length === 0 ? [] : $input.all().map((r, i) => ({ r: r.json, op: sent[i] }))
  .filter(x => x.r && x.r.error)
  .map(x => (x.op ? x.op.label : '?') + ': ' + (x.r.error.message || JSON.stringify(x.r.error)));
return [{ json: {
  contact_id: plan.contact_id, call_id: plan.call_id, action: plan.action, result: plan.result, reason: plan.reason,
  mismatch: plan.mismatch, notes: plan.notes, requests: sent.length, failed,
  ok: failed.length === 0 && !plan.retry, run_started_ms
} }];
