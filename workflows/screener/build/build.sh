#!/bin/sh
# Regenerates the screener SDK code (out/*.sdk.js, what gets pasted into the n8n MCP's
# validate_workflow / update_workflow) and the repo snapshots (../*.json) from src/*.js.
set -e
cd "$(dirname "$0")"
node gen_classifier.js >/dev/null && node gen_capture.js && node gen_eval.js && node gen_compare.js && node gen_mark.js && node gen_retry.js && node gen_testrig.js && node gen_counter.js && node gen_eventhooks.js && node gen_graduate.js && node gen_logretry.js && node gen_dailysweep.js && node snapshot.js
node -e "const s=require('./supabase.json'); if(!s.url||!s.credential_id) console.error('WARNING: build/supabase.json is empty: Compare Step and Attempt Counter carry a placeholder Supabase URL/credential. Do not deploy them until it is filled.')"
node -e "const s=require('./slack.json'); if(!s.channel||!s.credential_id) console.error('WARNING: build/slack.json is empty: Screener: Daily Sweep has no Slack channel/credential yet.')"
