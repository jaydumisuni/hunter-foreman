# Hunter Foreman

AI operations foreman for small businesses — routes requests, escalates tasks, and coordinates workflows across web, email, WhatsApp, and dashboards.

## Hackathon Focus

Hunter Foreman is the public hackathon edition of the Hunter architecture. It demonstrates how a business request can move from ROSE, the AI receptionist, into routing, task creation, dashboard visibility, notification previews, and human escalation.

This repository is intentionally public-safe. It does **not** include private THETECHGUY repair engines, proprietary recovery workflows, private credentials, private prompts, client data, or internal production logic.

## Phase 1 Demo

```text
Customer request
    ↓
ROSE receptionist intake
    ↓
Hunter Foreman request analyzer
    ↓
Intent + confidence
    ↓
Workflow + task creation
    ↓
Dashboard update
    ↓
Email / WhatsApp preview
    ↓
Human escalation when needed
```

## Repository Layout

```text
apps/
  demo/                 Public demo web app and API
packages/
  foreman-core/         Public-safe routing and task logic
scripts/                Smoke tests
docs/                   Architecture and submission notes
docker-compose.yml      Judge-friendly container startup
Dockerfile              Demo container
.env.example            Safe environment template
PHASE_1_LOCK.md         Locked scope
EXTRACTION_MATRIX.md    Public/shared/private extraction map
```

## Run with Docker

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

## Run locally

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

## Public API

- `GET /health`
- `POST /api/requests`
- `GET /api/tasks`

See `docs/public-api.md`.

## Public Safety Rules

- No secrets in the repository.
- No private Hunter production logic.
- No device repair or unlock modules.
- No private prompts.
- No client data.
- Demo data only.

## Project Status

Phase 1 public demo implementation in progress.
