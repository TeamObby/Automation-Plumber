// The daily Slack summary (spec §10.2 item 7b): where the pipeline stands, the last 24 hours from the
// Supabase screener_log, what the stale sweep did, and anything that needs a human.
const DAY = 86400000, now = Date.now();
const pick = n => { try { return $(n).all().map(i => i.json); } catch (e) { return []; } };
const rep = pick('Sweep Report')[0] || {};
const names = pick('Stage count searches').map(j => j.name);
const counts = pick('GHL: stage counts').map((j, i) => ({ name: names[i], n: j && !j.error ? Number((j.meta && j.meta.total) != null ? j.meta.total : (j.opportunities || []).length) : null }));
const d24 = pick('Supabase: last 24h')[0] || {};
const rows = n => pick(n).filter(r => r && r.id);
const wb = rows('Failed write-backs').filter(r => now - Date.parse(r.received_at || r.createdAt) > 2 * DAY);
const grad = rows('Failed graduations').filter(r => now - Date.parse(r.first_failed_at || r.createdAt || r.at) > DAY);   // first failure, not the latest retry
const pend = rows('Pending log writes');
const n = x => (x == null || isNaN(Number(x)) ? 0 : Number(x));
const list = (a, f) => a.slice(0, 8).map(f).join(', ') + (a.length > 8 ? ' +' + (a.length - 8) + ' more' : '');
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date(now));

const L = ['*Screener daily summary, ' + today + ' (PT)*' + (rep.dry_run ? '  _(dry run: nothing written)_' : '')];
L.push('*Pipeline now:* ' + counts.map(c => c.name + ' ' + (c.n == null ? '?' : c.n)).join(' · '));
const a1 = counts.find(c => c.name === 'Attempt 1');
if (a1 && a1.n === 0) L.push(':warning: *Attempt 1 is empty* — nothing new to dial: load the next set.');
if (d24.error || d24.calls === undefined) L.push('*Last 24 h:* Supabase not readable' + (d24.error ? ' (' + String(d24.error.message || '').slice(0, 80) + ')' : ''));
else {
  const pct = n(d24.compared) ? Math.round(100 * n(d24.matched) / n(d24.compared)) + '%' : 'n/a';
  L.push('*Last 24 h:* ' + n(d24.calls) + ' answered calls · ' + n(d24.owners) + ' Owner Verified · match ' + n(d24.matched) + '/' + n(d24.compared) + ' (' + pct + ') · '
    + n(d24.no_answers) + ' no-answers · ' + n(d24.voicemails) + ' voicemails · ' + n(d24.bad_numbers) + ' bad numbers');
}
const ex = rep.expired || [], rs = rep.rescreened || [];
L.push('*Stale sweep:* ' + ex.length + ' dropped from the hour lists · ' + rs.length + ' back to Attempt 1'
  + ((rep.retried || []).length ? ' · ' + rep.retried.length + ' earlier half-done sweeps finished' : '')
  + ((rep.blocked || []).length ? ' · ' + rep.blocked.length + ' not re-screened (open Kevin opportunity / DND)' : '')
  + ((rep.deferred || []).length ? ' · ' + rep.deferred.length + ' deferred to tomorrow' : ''));
if (rs.length) L.push('   re-screened: ' + list(rs, d => d.company));
if (rs.some(d => /no screener assigned/.test(d.reason || ''))) L.push(':warning: re-screened leads have no screener assigned (set SCREENER_USER_ID in the sweep settings).');

const human = [];
if ((rep.pending_save || []).length) human.push(rep.pending_save.length + ' leads half changed by the sweep (writes failed): retried tomorrow — ' + list(rep.pending_save, p => p.contact_id + ' (' + p.error + ')'));
if ((rep.superseded || []).length) human.push(rep.superseded.length + ' leads moved after a half-failed sweep, not replayed — check by hand: ' + list(rep.superseded, d => d.company || d.contact_id));
if ((rep.errors || []).length) human.push(rep.errors.length + ' contacts not readable: ' + list(rep.errors, d => d.contact_id));
if ((rep.search_errors || []).length) human.push('searches failed: ' + rep.search_errors.join('; '));
if ((rep.truncated || []).length) human.push('more than 100 leads in: ' + rep.truncated.join(', ') + ' (only the first 100 were swept)');
if (wb.length) human.push(wb.length + ' GHL write-backs failing for 48 h+: ' + list(wb, r => r.contact_name || r.contact_id));
if (grad.length) human.push(grad.length + ' graduations failing for a day+: ' + list(grad, r => r.contact_id + ' (' + String(r.reason || '').slice(0, 60) + ')'));
if (pend.length) human.push(pend.length + ' Supabase log writes pending (Screener: Log Retry replays them)');
L.push(human.length ? '*Needs a human:*\n• ' + human.join('\n• ') : '*Needs a human:* nothing :white_check_mark:');
return [{ json: { text: L.join('\n'), needs_human: human.length > 0 } }];
