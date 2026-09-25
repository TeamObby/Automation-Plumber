// One count per screener stage for the daily summary (GHL returns meta.total with limit=1).
const BASE = 'https://services.leadconnectorhq.com/opportunities/search?location_id=rzaMhqeo2apNI1p6DG5z&pipeline_id=CvDwpavqkHSRhg5Bn3L4&status=open&limit=1&pipeline_stage_id=';
return [['Attempt 1', '7ff9193f-1e0a-4c93-9626-a6aab22b666b'], ['Attempt 2', 'd3d8862e-bc2e-443f-97e6-f77e577ac09e'],
  ['Attempt 3', 'abb54fb0-dbfc-44d9-aa21-796b91b7540b'], ['Attempt 4', 'ec53d2ba-8322-45d6-9d60-283cc4fc016e'],
  ['Owner Verified', 'c8e33d9d-fd1b-46f6-87a6-7cc47841642f'], ['Gatekeeper', 'f83777fa-1dc0-4163-aa84-ef501126d82b'],
  ['Not Sure', '0c160182-e74d-4ace-9d3b-c4404043ef4b'], ['Exhausted', 'c1db8172-84bf-45a1-8f0e-5625157574a5'],
  ['Disqualified', '65f9e1b4-8688-456d-845e-ebe0781101b9']].map(([name, id]) => ({ json: { name, url: BASE + id } }));
