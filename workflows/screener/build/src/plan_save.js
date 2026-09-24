// Persist-then-read (spec §4.1 ordering): save the new verdict BEFORE the read Decide uses — but
// only on a contact being screened, only if it changed, and never over a NEWER call's verdict
// (a retry of an old call must not rewind the contact). Decide applies the same 'older' rule.
const input = $('When Called by Screener').first().json;
const contact = ($json && $json.contact) || null;
const s = v => String(v == null ? '' : v).trim();
const parse = raw => { try { const v = JSON.parse(raw); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch (e) { return null; } };
const tags = ((contact && contact.tags) || []).map(t => s(t).toLowerCase());
const f = ((contact && contact.customFields) || []).find(x => x.id === 'boOwqb5qGOmbWBopWvTv');
const storedRaw = s(f && f.value);
const incoming = s(input.verdict_json) ? parse(input.verdict_json) : null;
const stored = parse(storedRaw);
const older = !!incoming && !!stored && incoming.call_id !== stored.call_id && Date.parse(stored.answered_at) > Date.parse(incoming.answered_at);
return { json: {
  // Version of this run's outcome: taken BEFORE the save and the read, so a success can only clear
  // a failure recorded before this run looked at GHL (Record Write-back filters on it).
  run_started_ms: Date.now(),
  save: !!incoming && tags.includes('screening') && !older && storedRaw !== s(input.verdict_json),
  older
}};
