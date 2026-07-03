# Hunter Foreman

AI operations foreman for small businesses — routes requests, escalates tasks, and coordinates workflows across web, email, WhatsApp, and dashboards.

## Hackathon Focus

Hunter Foreman is the public hackathon edition of the Hunter architecture. It demonstrates how a business request can move from an AI receptionist into routing, task creation, dashboard visibility, and human escalation.

This repository is intentionally public-safe. It does **not** include private THETECHGUY repair engines, proprietary recovery workflows, private credentials, or internal production logic.

## Demo Flow

```text
Customer request
    ↓
AI receptionist
    ↓
Hunter Foreman intent router
    ↓
Task workflow + dashboard
    ↓
Email / WhatsApp handoff
    ↓
Human escalation when confidence is low
```

## Repository Layout

```text
apps/
  demo/                 Public demo app
packages/
  orchestrator/         Public-safe routing/orchestration layer
docs/                   Architecture and submission notes
docker-compose.yml      Judge-friendly container startup
Dockerfile              Demo container
.env.example            Safe environment template
```

## Run with Docker

```bash
docker compose up --build
```

## Run locally

```bash
npm install
npm run dev
```

## Public Safety Rules

- No secrets in the repository.
- No private Hunter production logic.
- No device repair or unlock modules.
- No client data.
- Demo data only.

## Project Status

Initial public hackathon scaffold.
