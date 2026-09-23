// Evaluates deployed SDK source against a mock SDK to emit an n8n-format workflow JSON.
const fs = require('fs');
function build(file, id, extra) {
  const nodes = [], conns = {};
  const link = (from, idx, to) => {
    const o = (conns[from.name] = conns[from.name] || { main: [] });
    while (o.main.length <= idx) o.main.push([]);
    o.main[idx].push({ node: to.name, type: 'main', index: 0 });
  };
  const head = x => x.head || x, tail = x => x.tail || x;
  const chain = (h, t) => ({ head: h, tail: t, to(x) { link(t, 0, head(x)); return chain(h, tail(x)); } });
  const mk = (type, version, config, isIf) => {
    const c = config || {};
    const n = { name: c.name, type, typeVersion: version, position: c.position || [0, 0], parameters: c.parameters || {} };
    for (const k of ['retryOnFail','maxTries','waitBetweenTries','onError','executeOnce','notes']) if (c[k] !== undefined) n[k] = c[k];
    if (c.credentials) n.credentials = c.credentials;
    nodes.push(n);
    const api = { name: n.name, to(x) { link(n, 0, head(x)); return chain(api, tail(x)); } };
    if (isIf) { api.onTrue = x => (link(n, 0, head(x)), api); api.onFalse = x => (link(n, 1, head(x)), api); }
    return api;
  };
  const SDK = {
    expr: s => '=' + s,
    node: d => mk(d.type, d.version, d.config),
    trigger: d => mk(d.type, d.version, d.config),
    ifElse: d => mk('n8n-nodes-base.if', d.version, d.config, true),
    sticky: (content, _nodes, opts) => { nodes.push({ name: 'Sticky Note', type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position: [0, 0], parameters: { content, color: (opts || {}).color } }); return { name: 'Sticky Note' }; },
    workflow: (_id, name) => { const w = { name, add() { return w; }, to() { return w; } };
      let cur = null; w.add = x => (cur = tail(x), w); w.to = x => (link(cur, 0, head(x)), cur = tail(x), w); return w; }
  };
  let src = fs.readFileSync(file, 'utf8').replace(/^import[^\n]*\n/, '').replace('export default', 'return');
  const w = new Function(...Object.keys(SDK), src)(...Object.values(SDK));
  return { id, name: w.name, active: false, nodes, connections: conns, settings: { executionOrder: 'v1' }, ...extra };
}
const out = require('path').join(__dirname, '..') + '/';
fs.mkdirSync(out, { recursive: true });
const note = { meta: { snapshot: 'Generated 2026-09-23 from the SDK source deployed via the n8n MCP (node ids and credentials omitted)' } };
fs.writeFileSync(out + 'Screener Classify Transcript.json', JSON.stringify(build(__dirname + '/out/classifier.sdk.js', 'LbGY5ptzldJjnTZJ', note), null, 2) + '\n');
fs.writeFileSync(out + 'Screener Capture Call.json',       JSON.stringify(build(__dirname + '/out/capture.sdk.js',    'jQaCWO08lddHg9fN', note), null, 2) + '\n');
fs.writeFileSync(out + 'Screener Classifier Eval.json',    JSON.stringify(build(__dirname + '/out/eval.sdk.js',       'FMUXvDBXsigHA4vb', note), null, 2) + '\n');
for (const f of fs.readdirSync(out).filter(f => f.endsWith(".json"))) { const j = JSON.parse(fs.readFileSync(out + f)); console.log(f, j.nodes.length, 'nodes', JSON.stringify(j.connections).length, 'conn-bytes'); }
