// One entry per contact the sweep must look at: tagged owner-confirmed (the hour-block lists), or with a
// screener opportunity in Gatekeeper / Not Sure / Exhausted, or graduated (won). A failed search is
// reported, never read as "nothing to do".
const s = v => String(v == null ? '' : v).trim();
const err = j => s(j.error.message || JSON.stringify(j.error)).slice(0, 200);
const PAGE = 100;
const found = new Map();
const add = (id, from) => { id = s(id); if (!id) return; if (!found.has(id)) found.set(id, []); if (!found.get(id).includes(from)) found.get(id).push(from); };
const search_errors = [], truncated = [];
const cs = $('GHL: owner-confirmed contacts').first().json || {};
if (cs.error) search_errors.push('owner-confirmed contacts: ' + err(cs));
else { (cs.contacts || []).forEach(c => add(c.id, 'owner-confirmed')); if ((cs.contacts || []).length >= PAGE) truncated.push('owner-confirmed'); }
const labels = $('Stale searches').all().map(i => i.json.label);
$('GHL: screener opps').all().forEach((it, i) => {
  const j = it.json || {}, label = labels[i] || '?';
  if (j.error) { search_errors.push(label + ': ' + err(j)); return; }
  const list = j.opportunities || [];
  list.forEach(o => add(o.contactId || (o.contact && o.contact.id), label));
  if (list.length >= PAGE) truncated.push(label);
});
return [{ json: { contact_ids: [...found.keys()], sources: Object.fromEntries(found), search_errors, truncated } }];
