// Pair each verdict with its fixture (Execute Sub-workflow in 'each' mode keeps item order).
const fx  = $('Load Fixtures').all().map(i => i.json);
const out = $input.all().map(i => i.json);
const byId = {};
fx.forEach((f, i) => { (byId[f.id] = byId[f.id] || { expect: f.expect, runs: [] }).runs.push(out[i] || {}); });

const cases = Object.entries(byId).map(([id, c]) => {
  const labels = c.runs.map(r => r.call_outcome + '/' + r.owner_reached);
  const stable = new Set(labels).size === 1;
  const correct = c.runs.every(r => c.expect.call_outcome.includes(r.call_outcome) && c.expect.owner_reached.includes(r.owner_reached));
  return {
    id, stable, correct,
    labels: [...new Set(labels)].join(' | '),
    expected: c.expect.call_outcome.join('|') + '/' + c.expect.owner_reached.join('|'),
    confidence: c.runs.map(r => r.confidence).join(', '),
    quotes_verified: c.runs.filter(r => r.quote_verified).length + '/' + c.runs.length,
    evidence_quote: c.runs[0].evidence_quote || '',
    ai_error: c.runs.map(r => r.ai_error).filter(Boolean).join('; ')
  };
});
return [{ json: {
  passed: cases.every(c => c.stable && c.correct),
  stable: cases.filter(c => c.stable).length,
  correct: cases.filter(c => c.correct).length,
  total: cases.length,
  cases
} }];
