# conDM - Internal Financial Builder (Phase 1)

## Quick Start (API key nelkul is)
1. Masold a `.env.example` fajlt `.env` nevvel.
2. Ellenorizd, hogy benne van:
   - `AI_ENABLED=false`
3. Telepites:
   - `npm install`
4. Inditas:
   - `npm run dev`
5. Nyisd meg:
   - `http://localhost:4000`

## Mi mukodik AI key nelkul
- Charting (Yahoo adat + kep generalas)
- PDF generalas
- Email builder + HTML export
- Health endpoint (`/api/health`) -> `ok`

## AI viselkedes AI_ENABLED=false eseten
- `/api/ai/instruction` -> 503 `SERVICE_DISABLED`
- `/api/ai/summarize-url` -> 503 `SERVICE_DISABLED`

## Docker First Run
1. `.env` kitoltese (AI key nem kotelezo, ha `AI_ENABLED=false`).
2. Build + run:
   - `docker compose up --build`
3. App:
   - `http://localhost:4000`
4. Health:
   - `http://localhost:4000/api/health`

## Implemented Endpoints
- `GET /api/finance/history?symbol=AAPL&range=1Y`
- `POST /api/charts/render`
- `POST /api/ai/instruction`
- `POST /api/ai/summarize-url`
- `POST /api/pdf/generate`
- `POST /api/email/export-html`
- `GET /api/health`

## Scope Constraint
Phase 1 builder/exporter only. No sending, tracking, analytics.

## Testing
- `npm run test`

