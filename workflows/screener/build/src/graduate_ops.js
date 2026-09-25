// The writes that must all succeed before the screener opportunity is closed. The close itself is a
// separate node behind Close Gate: if any write here fails, the lead stays in Owner Verified and the
// next sweep retries, finding the Kevin opportunity it already made instead of creating another.
const GHL = 'https://services.leadconnectorhq.com';
const d = $('Graduation Plan').first().json;
let created = null;
try { created = $('GHL: Create Kevin Opp').first().json; } catch (e) { created = null; }
const kevin_opp_id = d.kevin_opp_id || String((created && created.opportunity && created.opportunity.id) || (created && created.id) || '');
if (!kevin_opp_id) return [{ json: { label: 'no Kevin opportunity: create failed', method: 'SKIP', failed_create: true,
  error_text: (created && created.error && (created.error.message || JSON.stringify(created.error))) || 'no id returned' } }];
const ops = [];
const op = (label, method, url, body) => ops.push({ json: { label, method, url, body, kevin_opp_id } });
if (d.block_user) op('block follower on Kevin opp', 'POST', GHL + '/opportunities/' + kevin_opp_id + '/followers', { followers: [d.block_user] });
// The contact owner is left alone (decided 2026-09-25): Topu has normal access and nothing assigns leads to him,
// so clearing it would only wipe an owner the lead already had. The tag removal always goes out, even on a
// retry where the tags are already gone (GHL answers 200 for an absent tag): Close Gate and the log run only
// after at least one write, so a graduation must never have zero writes.
op('remove screening + wavv tags', 'DELETE', GHL + '/contacts/' + d.contact_id + '/tags',
  { tags: d.remove_tags.includes('screening') ? d.remove_tags : ['screening'].concat(d.remove_tags) });
return ops;
