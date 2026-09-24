# Screener: Classify Transcript  [spec §4 · §10.2 item 2]

- **n8n ID:** `LbGY5ptzldJjnTZJ` · **URL:** https://n8n.meetobby.com/workflow/LbGY5ptzldJjnTZJ · **File:** `Screener Classify Transcript.json`
- **Folder:** `workflows/screener/`
- **Status:** sub-workflow (no trigger of its own) — called by `Screener: Capture Call` and `Screener: Classifier Eval`. **Published** 2026-09-24 — re-publish after every `update_workflow`.
- **Inputs:** `transcript`, `contact_name`. **Output:** one verdict item.

## What it decides
Only **who picked up** — the transcript-readable fact. Busy/quiet is the screener's mark and is
never asked of the AI (spec §4: "nobody is asked twice for the same thing").

| field | values |
|---|---|
| `call_outcome` | `owner` · `gatekeeper` · `voicemail` · `wrong_number` · `not_a_plumber` · `do_not_call` · `no_conversation` · `unclear` |
| `owner_reached` | `yes` · `no` · `unclear` |
| `confidence` | 0–1; ≥0.9 stated outright, 0.6–0.8 clear behaviour, <0.6 guessing |
| `evidence_quote` / `quote_verified` | shortest supporting phrase; `quote_verified` = it really occurs in the transcript |
| `owner_name`, `model`, `truncated`, `ai_error` | |

## Flow
**Prep Transcript** builds the whole OpenAI request (system prompt, strict JSON schema,
temperature 0, 12k-char cap) → **Has transcript?** (≥20 chars) →
**OpenAI: Classify Who Answered** (`gpt-4.1-mini`, `onError: continue`) → **Parse Verdict**.
A transcript with **no letter or digit in any script** (blank, `...`) → **No Transcript Verdict**
(`unclear`, no model call). There is deliberately **no length floor**: "Wrong number." is 13
characters and decisive (verified live: `wrong_number`, 0.95).

**Parse Verdict never trusts the model:** bad enum → `unclear`; `owner` without `yes` (or `yes`
without `owner`) → `owner_reached = unclear`; confidence clamped; an API error becomes an
`unclear` verdict with the reason in `ai_error`; a quote not found in the transcript is kept but
`quote_verified = false`. The quote match is **Unicode-aware**: letters, **combining marks**
(Bengali/Hindi vowel signs — `মালিক` ≠ `মুলুক`) and digits are kept; whole-word matching applies
only where the script uses spaces (`own` ≠ `owned`), while Chinese/Japanese/Thai-family excerpts
match anywhere inside unspaced text. A quote that normalizes to nothing (`...`, `-`) never
verifies. WAVV transcripts are not always English.

## How the prompt was tuned (2026-09-23, Classifier Eval runs)
| run | model | stable | correct | what was wrong |
|---|---|---|---|---|
| 1 | gpt-4o-mini | 8/8 | 7/8 | "we don't do that" (septic) → `not_a_plumber`; quotes copied from the prompt's examples; confidence 0.5 on explicit cases |
| 2 | gpt-4o-mini | 8/8 | 7/8 | quotes + confidence fixed; ambiguous call → `gatekeeper` |
| 3 | gpt-4o-mini | 8/8 | 7/8 | ambiguous call → `not_a_plumber` again despite an explicit rule |
| 4 | **gpt-4.1-mini** | **8/8** | **8/8** | — all quotes verified, ambiguous at 0.5 |

Lessons worth keeping: never put quotable example phrases in the prompt (the model echoes them);
say explicitly that **declining septic pumping is normal** for a plumber; require **evidence for
gatekeeper too**, not just for owner.

## Review fixes (Codex, 2026-09-23, two rounds)
1. Short meaningful answers were dropped by a 20-char floor → now any letter/digit is classified.
2. A failed verdict became a permanent dedupe hit → `ai_ok` column; only clean rows dedupe (Capture).
3. `"..."` / `"我是老板"` verified against any transcript (ASCII-only normalizer → empty string)
   → Unicode normalizer + non-empty requirement. All three have regression tests in `tests/screener.test.js`.
4. (round 2) The fix for 3 stripped combining marks — `আমি মুলুক` verified against `আমি মালিক` —
   and its space-boundary rule rejected real Chinese excerpts → keep `\p{M}`; boundary only for
   spaced scripts. Regression tests for Bengali, Chinese, Japanese, Spanish, Latin prefixes.

## TODOs / gotchas
- 8 hand-written transcripts prove the plumbing, not real-world accuracy. Spec §9 Phase 4: score
  the first 50 real calls against the screeners' marks before trusting it.
- Real WAVV transcripts are messier (see Capture Call Record exec 121389: multilingual garbage
  after a long call). Add one or two real screener transcripts to the fixtures once calls exist.
- Re-run the eval after **any** prompt or model change.
