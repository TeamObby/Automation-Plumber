// All contacts decided: which requests to send this run. At most MAX_CONTACTS contacts are changed per
// run (the rest are reported and picked up tomorrow); a dry run sends nothing.
// A contact in screener_sweep_pending had an earlier sweep half fail (codex review): if nothing new is
// planned for it, its saved writes are replayed (they are all safe to repeat) — unless its screener
// opportunity moved after the failure, i.e. a newer call or dial happened: then replaying would undo
// that, so the saved writes are dropped and the lead is reported for a human.
const set = $('Settings').first().json;
const pending = new Map((() => { try { return $('Pending sweeps').all().map(i => i.json); } catch (e) { return []; } })()
  .filter(r => r && r.contact_id).map(r => [r.contact_id, r]));
const superseded = [];
const all = $input.all().map(i => i.json).map(d => {
  const p = pending.get(d.contact_id);
  if (!p || (d.ops || []).length || d.action === 'error') return d;
  if (d.scr_stage_changed_at && Date.parse(d.scr_stage_changed_at) > Date.parse(p.queued_at)) {
    superseded.push({ contact_id: d.contact_id, company: d.company, error: p.error });
    return d;
  }
  let ops = [];
  try { ops = JSON.parse(p.ops_json) || []; } catch (e) { ops = []; }
  return Object.assign({}, d, { action: 'retry', reason: 'finishing an earlier sweep that half failed (' + String(p.error || '').slice(0, 80) + ')', ops });
});
const acting = all.filter(d => (d.ops || []).length);
const now = acting.slice(0, set.max_contacts);
const brief = d => ({ contact_id: d.contact_id, company: d.company, action: d.action, reason: d.reason, age_days: d.age_days, requests: (d.ops || []).length });
return [{ json: {
  dry_run: set.dry_run === true,
  planned: now.map(brief),
  deferred: acting.slice(set.max_contacts).map(d => d.contact_id),
  blocked: all.filter(d => /not re-screened/.test(d.reason || '')).map(brief),
  errors: all.filter(d => d.action === 'error').map(brief),
  superseded,
  ops: set.dry_run === true ? [] : now.flatMap(d => d.ops.map(o => Object.assign({ contact_id: d.contact_id }, o)))
} }];
