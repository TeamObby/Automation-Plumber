// What the sweep did (or would do, on a dry run). Reached from every path, including "no candidates".
// Also decides the screener_sweep_pending changes: a contact with any failed write is saved with all its
// writes (replayed next run); a pending contact that is now done, or superseded, is cleared.
const pick = n => { try { return $(n).all().map(i => i.json); } catch (e) { return null; } };
const set = (pick('Settings') || [{}])[0] || {};
const cand = (pick('Candidates') || [{}])[0] || {};
const plan = (pick('Plan Sweep') || [])[0] || { dry_run: false, planned: [], deferred: [], blocked: [], errors: [], superseded: [], ops: [] };
const pending = new Map((pick('Pending sweeps') || []).filter(r => r && r.contact_id).map(r => [r.contact_id, r]));
const sent = pick('Split Sweep Ops') || [];
const res = pick('GHL: Sweep Apply') || [];
const msg = r => String(r.error.message || JSON.stringify(r.error)).slice(0, 120);
const failedOps = sent.map((o, i) => ({ o, r: res[i] })).filter(x => !x.r || x.r.error);
const failed = failedOps.map(x => x.o.contact_id + ' ' + x.o.label + ': ' + (x.r ? msg(x.r) : 'no response'));
const failedContacts = new Set(failedOps.map(x => x.o.contact_id));
const done = plan.planned.filter(d => !failedContacts.has(d.contact_id));
const now = new Date().toISOString();
const pending_save = set.dry_run === true ? [] : [...failedContacts].map(cid => {
  const x = failedOps.find(f => f.o.contact_id === cid);
  const prev = pending.get(cid);
  return { contact_id: cid, ops_json: JSON.stringify(sent.filter(o => o.contact_id === cid).map(({ kind, label, method, url, body }) => ({ kind, label, method, url, body }))),
    error: x.o.label + ': ' + (x.r ? msg(x.r) : 'no response'), queued_at: now, first_failed_at: (prev && prev.first_failed_at) || now };
});
const pending_clear = set.dry_run === true ? [] : [...pending.keys()].filter(cid =>
  (done.some(d => d.contact_id === cid) || (plan.superseded || []).some(d => d.contact_id === cid) || (plan.stopped || []).some(d => d.contact_id === cid)) && !failedContacts.has(cid));
return [{ json: {
  dry_run: set.dry_run === true,
  candidates: (cand.contact_ids || []).length,
  search_errors: cand.search_errors || [],
  truncated: cand.truncated || [],
  expired: done.filter(d => /expire/.test(d.action)),
  rescreened: done.filter(d => /rescreen/.test(d.action)),
  retried: done.filter(d => d.action === 'retry'),
  blocked: plan.blocked, errors: plan.errors, deferred: plan.deferred, superseded: plan.superseded || [], stopped: plan.stopped || [], failed,
  pending_save, pending_clear
} }];
