# JARVIS World Cup 2026 - Agent Reference

## Project Purpose
Public World Cup 2026 tracker. No auth. No database. Teams followed via localStorage.
AI predictor is rate limited to 5 requests per IP per hour to protect API costs.

## Stack
- Framework: Next.js 14 (App Router)
- Styling: Tailwind CSS plus app-level CSS matching the HTML mockup
- Football data: football-data.org, using `FOOTBALL_DATA_KEY` for matches, standings, and scorers
- Live scores fallback: API-FOOTBALL/API-SPORTS, only for in-progress matches
- AI predictions: HuggingFace Serverless Inference API
- Rate limiting: best-effort in-memory IP store in `/api/predict`
- State: localStorage only
- Deployment: Vercel

## Constraints
- No auth, no database, no Supabase
- All API keys are server-side only; never use `NEXT_PUBLIC_` for secrets
- HuggingFace model calls go through `/api/predict` only
- Rate limit is enforced before any model call
- Show explicit No data states whenever API keys or providers are unavailable
- Do not add dependencies outside the approved list

## Approved Dependencies
- next, react, react-dom
- tailwindcss, postcss, autoprefixer
- @types/node, @types/react, typescript

## Canonical Build Order
1. Project setup: Next.js 14, Tailwind, folder structure, `agent.md`
2. Static dashboard matching `worldcup_tracker_soft.html`
3. Responsive pass at 375px, 900px, and 1440px
4. localStorage helpers and `MyTeams`
5. In-memory rate limiter and `/api/predict`
6. `AiPredictor` prediction cache, remaining-count UI, and 429 feedback
7. football-data client and cached API routes
8. Live match, standings, schedule, bracket, and stats wired to live data or No data states
9. Loading, error, empty, and unavailable-key states
10. README setup guide

## Tournament Dates
Use the official opening kickoff as `2026-06-11T19:00:00Z`, which is 13:00 local time in Mexico City.

## localStorage Keys
- `wc2026_followed_teams`: string[] of team IDs
- `wc2026_prediction_cache`: Record<matchId, PredictionResult>
- `wc2026_dismissed`: string[] of dismissed notification IDs
