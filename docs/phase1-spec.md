# Financial Internal Builder - Phase 1 Specification (MVP/PoC)

## 1. Locked Decisions
- Auth: none in Phase 1.
- Storage: local only (`public/generated`).
- URL compliance restrictions: none required in Phase 1.
- Deployment baseline: Docker-first.
- Default content language: Hungarian.
- Branding source: user-provided token and asset pack.
- AI module can be disabled with `AI_ENABLED=false` for keyless local testing.

## 2. Scope
- In scope: internal builder for chart generation, AI drafting/summarization, PDF generation, visual email composition, and HTML export.
- Out of scope: email sending, tracking pixels, analytics, campaign scheduling.

## 3. Architecture Principles
- Next.js App Router full-stack app.
- API routes orchestrate all server workflows.
- Financial provider adapter pattern is mandatory.
- Core logic depends only on `FinancialDataProvider` interface.
- Standard API error envelope across endpoints:
  - `{ "error": { "code": "...", "message": "...", "details": {} } }`

## 4. Module Behavior
### 4.1 Financial Data + Charting
- `GET /api/finance/history` returns close series from adapter-backed provider.
- Finance provider errors are normalized:
  - `SYMBOL_NOT_FOUND`
  - `EMPTY_HISTORY`
  - `UPSTREAM_FAILURE`
- `POST /api/charts/render` generates deterministic branded PNGs.
- Optional benchmark overlay supported when benchmark points are provided.
- Filename metadata includes symbol/range/variant/timestamp.

### 4.2 AI Drafting and URL Summarization
- `POST /api/ai/instruction` generates Hungarian draft text.
- `POST /api/ai/summarize-url` extracts article text with Cheerio and summarizes in Hungarian.
- Hidden system prompts enforce neutral, risk-aware tone and avoid guarantee language.
- Input text is truncated through explicit pipeline limits.
- If `AI_ENABLED=false`, both endpoints return `503 SERVICE_DISABLED`.

### 4.3 PDF Generation
- `POST /api/pdf/generate` supports template families:
  - `market-update`
  - `portfolio-summary`
- Brand tokens are injected into rendered PDF HTML.
- Optional chart image block supported.
- Response includes local URL and metadata:
  - `pdfUrl`, `filename`, `generatedAt`, `template`

### 4.4 Visual Email Builder and HTML Export
- Unlayer-based editor with constrained toolset.
- Merge tags validated (`{{client_name}}`, `{{advisor_name}}`, `{{portfolio_name}}`, plus CTA/chart placeholders).
- `POST /api/email/export-html` returns normalized HTML and starter snippets for PDF CTA and chart image blocks.

## 5. Runtime and Operations
- Health check endpoint: `GET /api/health`.
- Startup env check script enforces required variables only when AI is enabled.
- Docker runtime includes Puppeteer-compatible system dependencies.
- Docker Compose mounts `./public/generated` to preserve generated assets.
