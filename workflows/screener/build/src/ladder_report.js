// Which ladder requests failed (GHL: Ladder Apply continues on error).
const sent = $('Split Ladder Ops').all().map(i => i.json);
const failed = $input.all().map((r, i) => ({ r: r.json, op: sent[i] }))
  .filter(x => x.r && x.r.error)
  .map(x => (x.op ? x.op.label : '?') + ': ' + (x.r.error.message || JSON.stringify(x.r.error)));
return [{ json: { failed, requests: sent.length, force_compare: $('Ladder').first().json.force_compare === true } }];
