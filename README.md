# World Cup 2026 Tracker

A public World Cup 2026 tracker with live scores, group standings, upcoming matches, AI match predictions, a projected knockout bracket, and personal team following. There is no auth and no database; followed teams and prediction cache live in the browser.

The app is truth-first for live results: live scores, stats, and predictions show `No data` when API keys are missing or a provider fails. Scheduled fixtures and pre-tournament group tables use the local official World Cup schedule data so the app is useful before kickoff.

Live demo: _coming soon_

Screenshot: _add deployment screenshot here_

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

| Name | Required | Description | Get it from |
| --- | --- | --- | --- |
| `FOOTBALL_DATA_KEY` | For live data | football-data.org token for World Cup results, standings, and scorers. Scheduled fixtures/groups still render from local official schedule data without it. | `football-data.org/client/register` |
| `API_FOOTBALL_KEY` | Optional live fallback | API-FOOTBALL/API-SPORTS key for live score fallback during in-progress matches. | `dashboard.api-football.com` |
| `RAPIDAPI_KEY` | Optional alias | Backwards-compatible alias for `API_FOOTBALL_KEY` if you already use that env var name. | Existing local config |
| `HF_API_KEY` | For AI predictions | HuggingFace token used only by `/api/predict`; it needs permission to make Inference Providers calls. Without it, the predictor shows No data. | `huggingface.co/settings/tokens` |
| `HF_MODEL` | Optional | HuggingFace router chat model. Defaults to `Qwen/Qwen2.5-7B-Instruct:fastest`. | HuggingFace Inference Providers |

## Rate Limiting

AI predictions are limited to 5 requests per IP per hour before any HuggingFace call is made. This is an in-memory, best-effort limit designed to keep public usage inexpensive on serverless hosts.

## Following Teams

Click `+ Follow a team`, search, and select a team. The app stores followed team IDs under `wc2026_followed_teams` in localStorage, so no account is needed. Predictions are cached for 24 hours under `wc2026_prediction_cache`.

## Tech Stack

- Next.js 14 App Router
- React and TypeScript
- Tailwind CSS plus app-level CSS matching the HTML mockup
- Local official group-stage fixture data for pre-tournament schedules
- football-data.org live data, with explicit No data states for live results on provider failure
- HuggingFace Inference Providers router through a server route

## Deployment

Deploy to Vercel and configure the environment variables above. API keys should stay server-side only and must not use `NEXT_PUBLIC_`.

## Contributing

Keep the no-auth, no-database constraint intact unless the product requirements change. Match the visual language in `worldcup_tracker_soft.html` before adding new behavior.

## Tests

```bash
npm test
npm run typecheck
npm run build
```
