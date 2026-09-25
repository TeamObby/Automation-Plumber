// All contacts decided: which requests to send this run. At most MAX_CONTACTS contacts are changed per
// run (the rest are reported and picked up tomorrow); a dry run sends nothing.
const set = $('Settings').first().json;
const all = $input.all().map(i => i.json);
const acting = all.filter(d => (d.ops || []).length);
const now = acting.slice(0, set.max_contacts);
const brief = d => ({ contact_id: d.contact_id, company: d.company, action: d.action, reason: d.reason, age_days: d.age_days, requests: (d.ops || []).length });
return [{ json: {
  dry_run: set.dry_run === true,
  planned: now.map(brief),
  deferred: acting.slice(set.max_contacts).map(d => d.contact_id),
  blocked: all.filter(d => /not re-screened/.test(d.reason || '')).map(brief),
  errors: all.filter(d => d.action === 'error').map(brief),
  ops: set.dry_run === true ? [] : now.flatMap(d => d.ops.map(o => Object.assign({ contact_id: d.contact_id }, o)))
} }];
