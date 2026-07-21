# Call Disposition (subsystem)

Post-call handling for the **Call Campaign - Plumbers** outbound campaign
(selling an AI receptionist — "WaterLine" — to US plumbing companies).

## Workflows in this folder
| File | n8n ID | Role |
|---|---|---|
| [dispatcher](./dispatcher.context.md) | `SfI5Hx6mlc4Qh3D1` | Webhook entry point; normalize → transcribe → route |
| [Cold Handler](./Cold%20Handler.context.md) | `toFDNpFhy0ZyxfxN` | Cold-route handler; classify → log → move opp |

## Flow at a glance
```
GHL (WAVV call recorded)
      │  webhook
      ▼
┌─────────────────────────┐
│  Dispatcher             │  normalize → (Whisper if needed) → strip wavv- tags
│  SfI5Hx6mlc4Qh3D1       │  → fetch opps → route by call pipeline
└───────────┬─────────────┘
            │ route == cold  (rebooking / conversation / none = stubs)
            ▼
┌─────────────────────────┐
│  Cold Handler           │  classify outcome → write GHL logs
│  toFDNpFhy0ZyxfxN       │  → move opp to next pipeline/stage
└─────────────────────────┘
```

## Not yet pulled (dependencies)
- `GHL Pipeline Stages (Cached)` — `ny7jwqGX1Du9aXNC` (used by Cold Handler's Cached Values).

## Conventions
- `*.json` = faithful snapshot pulled from n8n (source of truth for structure).
- `*.context.md` = intent / why / gotchas (the part the code can't tell you).
- Secrets are **redacted** in local `.json`; real values stay in live n8n.

## ⚠️ Security
- Cold Handler has a hardcoded **Instantly** bearer token — move to an n8n credential and rotate.
