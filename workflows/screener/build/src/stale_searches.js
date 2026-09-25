// The screener opportunities the sweep looks at, one GHL search each (100 per search; a full page is
// reported as truncated so nobody mistakes it for "all done").
const BASE = 'https://services.leadconnectorhq.com/opportunities/search?location_id=rzaMhqeo2apNI1p6DG5z&pipeline_id=CvDwpavqkHSRhg5Bn3L4&limit=100';
return [
  { label: 'Gatekeeper', url: BASE + '&status=open&pipeline_stage_id=f83777fa-1dc0-4163-aa84-ef501126d82b' },
  { label: 'Not Sure', url: BASE + '&status=open&pipeline_stage_id=0c160182-e74d-4ace-9d3b-c4404043ef4b' },
  { label: 'Exhausted', url: BASE + '&status=open&pipeline_stage_id=c1db8172-84bf-45a1-8f0e-5625157574a5' },
  { label: 'graduated', url: BASE + '&status=won' }
].map(json => ({ json }));
