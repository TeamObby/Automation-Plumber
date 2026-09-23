# Screener: Classifier Eval  [test harness]

- **n8n ID:** `FMUXvDBXsigHA4vb` · **URL:** https://n8n.meetobby.com/workflow/FMUXvDBXsigHA4vb · **File:** `Screener Classifier Eval.json`
- **Folder:** `workflows/screener/`
- **Status:** manual trigger only — not part of the live flow.

Runs the 8 hand-written transcripts in [`tests/fixtures/screener-transcripts.json`](../../tests/fixtures/screener-transcripts.json)
through `Screener: Classify Transcript` **3 times each** and returns one summary item:
`passed` (every case stable across its 3 runs **and** matching `expect`), `stable`, `correct`,
and per case the labels, confidences, `quotes_verified` and the evidence quote.

**Done-criterion for spec §10.2 item 2** ("verdicts are stable on the test set"):
`passed: true` — achieved 2026-09-23, execution `122342`.

To add a case: edit the fixtures file **and** `build/src/load_fixtures.js`, run `build/build.sh`, push
(the local test `tests/screener.test.js` fails if the two drift apart). Cost ≈ 24 small model calls per run.
