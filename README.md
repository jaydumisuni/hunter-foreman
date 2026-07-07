# Hunter Foreman

AI operations foreman for small businesses — routes requests, escalates tasks, and coordinates workflows across web, email, WhatsApp, and dashboards.

## Hackathon Focus

Hunter Foreman is the public hackathon edition of the Hunter architecture. It demonstrates how a business request can move from ROSE, the AI receptionist, into routing, task creation, dashboard visibility, notification previews, optional app dispatch, and human escalation.

This repository is intentionally public-safe. It does **not** include private THETECHGUY repair engines, proprietary recovery workflows, private credentials, private prompts, client data, or internal production logic.

## Three-Repo Phase 1 Map

- Core app: `jaydumisuni/hunter-foreman`
- Demo receiver: `jaydumisuni/hunter-foreman-demo`
- Submission pack: `jaydumisuni/hunter-foreman-docs`

Review the three repositories together before the break/test phase.

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
Optional app bridge dispatch
    ↓
Human escalation when needed
```

## Repository Layout

```text
apps/
  demo/                 Public demo web app and API
packages/
  foreman-core/         Public-safe routing and task logic
  app-bridge/           Optional external app bridge
scripts/                Smoke tests
docs/                   Architecture, API, bridge, and submission notes
docker-compose.yml      Judge-friendly container startup
docker-compose.connected.yml  Two-app local demo startup
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

## Run Connected Two-App Demo

Place `hunter-foreman` and `hunter-foreman-demo` beside each other, then run from this repo:

```bash
docker compose -f docker-compose.connected.yml up --build
```

Open:

```text
http://localhost:3000
http://localhost:3100
```

See `docs/connected-local-run.md`.

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
- `GET /api/dispatch/:taskId`
- `GET /api/app-bridge/status`

See `docs/app-connection-api.md` and `docs/app-bridge-contract.md`.

## App Bridge

Hunter Foreman can dispatch created tasks to the separate receiver app using the versioned `foreman.app.task.v1` contract.

See `docs/app-bridge-runbook.md`.

## Public Safety Rules

- No secrets in the repository.
- No private Hunter production logic.
- No device repair or unlock modules.
- No private prompts.
- No client data.
- Demo data only.

## Related Project

Hunter Foreman also influenced the creation of **Sergeant** — an independent AI reviewer designed to inspect implementations rather than generate them.

While building, reviewing, and validating Hunter Foreman, the same engineering workflow evolved into a separate review system. Hunter Foreman became the first real-world project used to shape Sergeant's review workflow, while established open-source projects were later used to validate and refine its review process.

If you're interested in the engineering review approach behind this project, you can explore Sergeant here:

https://github.com/jaydumisuni/Sergeant

## Project Status

Phase 1 public demo implementation connected to optional app bridge.
