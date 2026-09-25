// screener_sweep_pending changes decided by Sweep Report: save half-failed contacts, clear finished ones.
const r = $input.first().json;
return (r.pending_save || []).map(p => ({ json: Object.assign({ op: 'save' }, p) }))
  .concat((r.pending_clear || []).map(contact_id => ({ json: { op: 'clear', contact_id } })));
