// One item per GHL request, in order. GHL: Apply runs them one at a time (batch size 1).
const plan = $('Decide').first().json;
return plan.ops.map((o, i) => ({ json: Object.assign({ n: i + 1, contact_id: plan.contact_id }, o) }));
