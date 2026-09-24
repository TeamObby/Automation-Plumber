// One screener_attempts row per event, whichever path ran. ok=false keeps a failed event visible
// (and a replay of a WAVV note retries it with the same attempt number).
const l = $('Ladder').first().json;
const pick = n => { try { return $(n).first().json; } catch (err) { return null; } };
const rep = pick('Ladder Report');
const cmp = l.force_compare ? pick('Screener: Compare Step') : null;
const failed = (rep && rep.failed) || [];
const ok = !l.retry && failed.length === 0 && (!l.force_compare || !!(cmp && cmp.ok === true));
return [{ json: {
  event_key: l.event_key, contact_id: l.contact_id, event: l.event, wavv_call_id: l.wavv_call_id,
  attempt_no: l.attempt_no, action: l.action,
  result_stage: cmp ? (cmp.result || cmp.action) : l.result_stage,
  ok, reason: [l.reason].concat(failed, cmp && cmp.reason ? ['compare: ' + cmp.reason] : []).filter(Boolean).join(' | '),
  at_ms: l.at_ms, received_at: l.received_at
} }];
