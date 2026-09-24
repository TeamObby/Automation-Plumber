// One screener_graduations row per attempt. ok=false leaves the screener opportunity open in
// Owner Verified, so the next sweep retries it.
const d = $('Graduation Plan').first().json;
const pick = n => { try { return $(n).all().map(i => i.json); } catch (e) { return null; } };
const sent = pick('Graduation Ops') || [];
const res = pick('GHL: Graduation Apply') || [];
const failed = sent.map((o, i) => ({ o, r: res[i] }))
  .filter(x => x.o.failed_create || (x.r && x.r.error))
  .map(x => x.o.failed_create ? 'create Kevin opp: ' + x.o.error_text : x.o.label + ': ' + (x.r.error.message || JSON.stringify(x.r.error)));
const kevin = (sent[0] && sent[0].kevin_opp_id) || d.kevin_opp_id || '';
const now = new Date().toISOString();
return [{ json: {
  grad_key: d.contact_id + ':' + d.screener_opp_id, contact_id: d.contact_id, screener_opp_id: d.screener_opp_id,
  kevin_opp_id: kevin, kevin_pipeline: d.kevin_pipeline, created_new: !!d.create && !!kevin,
  pt_block: d.pt_block, action: d.action,
  ok: !d.retry && failed.length === 0 && (d.action !== 'graduate' || !!kevin),
  reason: [d.reason].concat(failed).filter(Boolean).join(' | '), at: now
} }];
