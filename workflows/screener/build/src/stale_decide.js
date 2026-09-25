// The daily sweep for one contact (spec §7 freshness, §8 re-screen trap; decisions 2026-09-25):
//  1. Expire: Date Screened older than STALE_DAYS -> owner-confirmed, the screened-pt tag and the block
//     followers come off (every open opportunity, Kevin's too), so the lead drops out of Kevin's
//     hour-block lists. It stays in his normal cadence.
//  2. Re-screen: Gatekeeper / Not Sure / graduated owner older than STALE_DAYS, or Exhausted for longer
//     than STALE_DAYS -> fields cleared, result tags off, screening on, screener opportunity back in
//     Attempt 1. Never with an open opportunity in Kevin's pipelines (it would switch his automations
//     off for the lead), never for a DND contact, never for Disqualified.
const SCREENER = 'CvDwpavqkHSRhg5Bn3L4';
const ST = { attempt1: '7ff9193f-1e0a-4c93-9626-a6aab22b666b', gatekeeper: 'f83777fa-1dc0-4163-aa84-ef501126d82b',
  notSure: '0c160182-e74d-4ace-9d3b-c4404043ef4b', exhausted: 'c1db8172-84bf-45a1-8f0e-5625157574a5' };
// Any open opportunity here blocks a re-screen, Manual Review included (a human is on it).
const KEVIN = ['O7LMZpDOFM2SYO65twC5', '1A1RkYaL93s2rqbQ3Opi', '9E6y34DlG1Imr8FV42RV', '3onA8GkJnSwgzIGTGSpI',
  'TwW6o0JdPXUlcwvX0EvI', 'smoNRUaagZYOElKFLwtp', 'OOu5TjgalfGZElEIoSbq'];
const F = { outcome: 'iTZa77JWntQs2QBuo9QU', verdict: 'boOwqb5qGOmbWBopWvTv', attempts: 'vcqKnq23gN5wIIHqRww4',
  date: 'MUkHW8R17PIksrSnpz6g', noise: 'AbbR6jH9PFMLJCRdCqMp' };
const BLOCK_USERS = ['ZU6NEmag5FFcYAYwtu75', 'QKMhxRVQX45dq2bxF5a5', 'u24gWdO3FlXhwjwhm6sE', 'hdIv63msJcYjhwfIJ4eg', 'T4p1bK3yo6Bl14OK1LP3',
  'nTHz8ZbvpMxoWqsyJsLs', 'u1v0arwCtQw8kr9FSYIT', '7KI79ZeuhHa1WrmFSaPH', 'j5w26gAQTznnaAgqRePi', 'QlDlzTUPYag7RxkJ2B5Q'];
const RESULT_TAGS = ['owner-confirmed', 'screen-busy', 'screen-quiet', 'screen-mismatch'];
const GHL = 'https://services.leadconnectorhq.com';
const DAY = 86400000;

const set = $('Settings').first().json;
const cid = String($('One contact').item.json.contact_id || '').trim();
const got = $('GHL: Get Contact').item.json;
const found = $('GHL: All Opps for Contact').item.json;
const s = v => String(v == null ? '' : v).trim();
const contact = (got && got.contact) || null;
const out = (action, reason, extra) => ({ json: Object.assign({ contact_id: cid, company: '', action, reason, age_days: null, ops: [] }, extra) });
if (!contact || !contact.id) return out('error', 'contact not readable: ' + s(got && got.error && (got.error.message || got.error.description)));
if (!found || found.error) return out('error', 'opportunity search failed');

const tags = (contact.tags || []).map(t => s(t).toLowerCase());
const cf = id => { const f = (contact.customFields || []).find(x => x.id === id); return f ? s(f.value) : ''; };
const company = s(contact.companyName) || s(contact.contactName) || cid;
const dateAge = d => /^\d{4}-\d{2}-\d{2}$/.test(d) ? Math.round((Date.parse(set.today_pt) - Date.parse(d)) / DAY) : null;
const tsAge = t => { const x = Date.parse(t); return isNaN(x) ? null : Math.floor((set.now_ms - x) / DAY); };
const isOpen = o => (o.status || 'open') === 'open';
const opps = found.opportunities || [];
const scr = opps.filter(o => o.pipelineId === SCREENER)
  .sort((a, b) => (isOpen(b) - isOpen(a)) || (Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0)))[0] || null;
const openKevin = opps.filter(o => KEVIN.includes(o.pipelineId) && isOpen(o));
const age = dateAge(cf(F.date));
const stale = n => n !== null && n > set.stale_days;

const ops = [], notes = [];
const op = (label, method, url, body) => ops.push({ label, method, url, body });

// 1. Expire the hour-block marks.
const hourTags = tags.filter(t => t === 'owner-confirmed' || /^screened-pt-\d\d-\d\d$/.test(t));
const expire = hourTags.length > 0 && stale(age);
if (expire) {
  op('remove hour-block tags', 'DELETE', GHL + '/contacts/' + cid + '/tags', { tags: hourTags });
  // Only where the screener puts block followers: its own opportunity and Kevin's (never e.g. a demo pipeline).
  opps.filter(o => isOpen(o) && (o.pipelineId === SCREENER || KEVIN.includes(o.pipelineId))).forEach(o => op('remove block followers (' + (o.pipelineId === SCREENER ? 'screener' : 'Kevin') + ' opp)',
    'DELETE', GHL + '/opportunities/' + o.id + '/followers', { followers: BLOCK_USERS }));
} else if (hourTags.length && age === null) notes.push('owner-confirmed without a Date Screened: left alone');

// 2. Re-screen.
let why = '';
if (scr && isOpen(scr) && (scr.pipelineStageId === ST.gatekeeper || scr.pipelineStageId === ST.notSure) && stale(age))
  why = (scr.pipelineStageId === ST.gatekeeper ? 'Gatekeeper' : 'Not Sure') + ', screened ' + age + ' days ago';
else if (scr && isOpen(scr) && scr.pipelineStageId === ST.exhausted && stale(tsAge(scr.lastStageChangeAt)))
  why = 'Exhausted for ' + tsAge(scr.lastStageChangeAt) + ' days';
else if (scr && s(scr.status) === 'won' && stale(age))
  why = 'graduated owner, screened ' + age + ' days ago';
const blocked = !why ? '' : openKevin.length ? 'open opportunity in Kevin pipeline (re-screen trap)' : contact.dnd === true ? 'contact is DND' : '';
const rescreen = !!why && !blocked;
if (rescreen) {
  const body = { customFields: Object.values(F).map(id => ({ id, value: '' })) };
  if (set.screener_user_id) body.assignedTo = set.screener_user_id; else notes.push('no screener assigned');
  op('clear screener fields', 'PUT', GHL + '/contacts/' + cid, body);
  const drop = tags.filter(t => (RESULT_TAGS.includes(t) || /^screened-pt-\d\d-\d\d$/.test(t)) && !(expire && hourTags.includes(t)));
  if (drop.length) op('remove result tags', 'DELETE', GHL + '/contacts/' + cid + '/tags', { tags: drop });
  if (!tags.includes('screening')) op('add screening tag', 'POST', GHL + '/contacts/' + cid + '/tags', { tags: ['screening'] });
  op('screener opp -> Attempt 1 (open)', 'PUT', GHL + '/opportunities/' + scr.id, { pipelineId: SCREENER, pipelineStageId: ST.attempt1, status: 'open' });
  if (!(expire && isOpen(scr))) op('remove block followers (screener opp)', 'DELETE', GHL + '/opportunities/' + scr.id + '/followers', { followers: BLOCK_USERS });
}

const action = rescreen ? (expire ? 'expire+rescreen' : 'rescreen') : (expire ? 'expire' : 'none');
const reason = [why, blocked && 'not re-screened: ' + blocked].concat(notes).filter(Boolean).join(' | ');
return out(action, reason, { company, age_days: age, ops, scr_stage_changed_at: scr ? s(scr.lastStageChangeAt) : '' });
