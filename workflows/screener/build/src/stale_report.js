// What the sweep did (or would do, on a dry run). Reached from every path, including "no candidates".
const pick = n => { try { return $(n).all().map(i => i.json); } catch (e) { return null; } };
const cand = (pick('Candidates') || [{}])[0] || {};
const plan = (pick('Plan Sweep') || [])[0] || { dry_run: false, planned: [], deferred: [], blocked: [], errors: [], ops: [] };
const sent = pick('Split Sweep Ops') || [];
const res = pick('GHL: Sweep Apply') || [];
const failed = sent.map((o, i) => ({ o, r: res[i] })).filter(x => x.r && x.r.error)
  .map(x => x.o.contact_id + ' ' + x.o.label + ': ' + String(x.r.error.message || JSON.stringify(x.r.error)).slice(0, 120));
const failedContacts = new Set(failed.map(f => f.split(' ')[0]));
const done = plan.planned.filter(d => !failedContacts.has(d.contact_id));
const set = (pick('Settings') || [{}])[0] || {};
return [{ json: {
  dry_run: set.dry_run === true,
  candidates: (cand.contact_ids || []).length,
  search_errors: cand.search_errors || [],
  truncated: cand.truncated || [],
  expired: done.filter(d => /expire/.test(d.action)),
  rescreened: done.filter(d => /rescreen/.test(d.action)),
  blocked: plan.blocked, errors: plan.errors, deferred: plan.deferred, failed
} }];
