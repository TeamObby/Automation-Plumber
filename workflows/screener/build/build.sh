#!/bin/sh
# Regenerates the screener SDK code (out/*.sdk.js, what gets pasted into the n8n MCP's
# validate_workflow / update_workflow) and the repo snapshots (../*.json) from src/*.js.
set -e
cd "$(dirname "$0")"
node gen_classifier.js >/dev/null && node gen_capture.js && node gen_eval.js && node gen_compare.js && node gen_mark.js && node gen_retry.js && node gen_testrig.js && node snapshot.js
