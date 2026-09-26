// The success gate before the close. GHL: Graduation Apply continues on error, so it always hands on
// one result per write; close the screener opportunity only if every write came back without an error.
// Otherwise the lead stays open in Owner Verified and the next sweep retries the whole graduation
// (it reuses the Kevin opportunity it already made; the follower and tag writes are repeatable).
const d = $('Graduation Plan').first().json;
const sent = $('Graduation Ops').all().map(i => i.json);
const res = $input.all().map(i => i.json);
const failed = sent.filter((o, i) => !res[i] || res[i].error).map(o => o.label);
return [{ json: {
  close: failed.length === 0 && res.length === sent.length,
  failed,
  url: 'https://services.leadconnectorhq.com/opportunities/' + d.screener_opp_id,
  body: { status: 'won' }
} }];
