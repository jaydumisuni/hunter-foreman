# Hunter Foreman

> AI-powered business operations orchestration.

ROSE receives customer requests. Fireworks AI understands intent. Hunter Foreman creates structured ownership. Connected business applications execute the work.

**One request. One owner. Complete visibility.**

| Category | Summary |
| --- | --- |
| Purpose | AI-powered business operations orchestration |
| AI | Fireworks AI for intent understanding and classification |
| Frontend | ROSE AI Receptionist plus live operations dashboard |
| Backend | Hunter Foreman task ownership engine and App Bridge |
| Output | Structured business tasks, ownership, and workflow visibility |
| Status | Working demo with evidence-backed proof |

---

## The Problem

Businesses receive customer requests through websites, email, WhatsApp, social media, staff members, and walk-ins.

Without structured ownership, requests can be forgotten, duplicated, delayed, or handled by the wrong person.

Hunter Foreman is designed to make every request immediately become owned, traceable work.

---

## The Solution

Hunter Foreman is an AI operations foreman for business workflows.

It starts with ROSE, an AI receptionist interface for request intake. Fireworks AI classifies the request and identifies the likely workflow. Hunter Foreman then creates a structured task that can be tracked on the dashboard and dispatched through the App Bridge to connected business applications.

The goal is not to replace people. The goal is to make sure work is understood, assigned, visible, and followed through.

---

## Workflow

```text
Customer
   │
   ▼
ROSE AI Receptionist
   │
   ▼
Fireworks AI
Intent Understanding
   │
   ▼
Hunter Foreman
Task Ownership Engine
   │
   ▼
Operations Dashboard
   │
   ▼
App Bridge
   │
   ▼
Connected Business Applications
```

---

## Fireworks AI Integration

Fireworks AI performs semantic understanding of incoming customer requests.

It is responsible for:

- intent classification,
- workflow recommendation,
- confidence scoring,
- escalation detection,
- returning structured output that Hunter Foreman can turn into business work.

Hunter Foreman then converts the AI result into a task with ownership, lifecycle information, dashboard visibility, and optional App Bridge dispatch.

The verified live model used for the Fireworks proof is:

```text
accounts/fireworks/models/gpt-oss-120b
```

The project also keeps fallback behavior explicit so the demo can continue safely if provider credentials are not configured.

---

## Why Hunter Foreman?

Hunter Foreman is not another AI chatbot.

Most AI demos end with a conversation. Hunter Foreman begins with one.

The conversation is only the entry point. The objective is ensuring work is understood, owned, tracked, and delivered across business operations.

---

## Available Today

- ROSE AI Receptionist interface.
- Fireworks-backed request classification.
- Rule-based fallback for demo safety.
- Structured task ownership.
- Live operations dashboard.
- Request log.
- Task board.
- Analytics view.
- System health view.
- App Bridge status tracking.
- Resettable demo workflow.
- Regional settings, currency, timezone, language, and preferences.
- Honest integration states for planned or unavailable modules.

---

## Planned / Intentionally Not Connected Yet

These are shown as planned, under maintenance, or not connected in the demo rather than presented as finished production integrations.

- WhatsApp automation.
- Payment gateway connection.
- Event Manager connector.
- Invitation System connector.
- QR Access connector.
- Multi-business deployment.
- Additional production App Bridge receivers.

This is intentional: planned business modules are visible for product direction, but unfinished integrations are not presented as live.

---

## Engineering Principles

Hunter Foreman follows a simple engineering standard:

- Understand the objective before changing code.
- Claims must match implementation.
- Planned functionality must be clearly identified.
- AI decisions should remain observable.
- Fallback behavior should be explicit.
- Evidence should accompany demonstrations.
- Business workflows take priority over chat interactions.

---

## Repository Structure

```text
apps/
  demo/                 Local demo server and browser UI
packages/
  foreman-core/         Classification, routing, task creation
  app-bridge/           Dispatch boundary for external apps
scripts/                Smoke tests and live provider checks
docs/                   Supporting documentation
proof/                  Local evidence runs and generated proof packages
```

---

## Quick Start

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Run the smoke tests:

```bash
npm test
```

Check the demo server syntax:

```bash
node --check apps/demo/server.js
```

---

## Fireworks Live Test

Set a Fireworks API key and model, then run the live provider check.

```bash
set FIREWORKS_MODEL=accounts/fireworks/models/gpt-oss-120b
node scripts/test-fireworks-live.js
```

Expected evidence from a successful run:

```text
provider=fireworks
fallbackUsed=false
```

Do not commit API keys or provider secrets.

---

## Verification

The project is prepared around evidence-backed claims. A proof run can capture:

- screenshots of all major tabs,
- a demo walkthrough GIF,
- API health output,
- App Bridge status output,
- task state after a demo request,
- Fireworks classification proof,
- test results,
- Node syntax checks,
- Docker Compose config validation,
- git state,
- SHA256 checksums.

The proof folder is used as evidence for submission packaging and final review.

---

## Related Projects

Building Hunter Foreman also led to **Sergeant**, an independent AI implementation reviewer focused on inspecting software implementations rather than generating them.

Hunter Foreman served as the first project used to shape and validate that review workflow.

Sergeant: https://github.com/jaydumisuni/Sergeant

---

## Roadmap

### Current

Working AI operations demo with ROSE intake, Fireworks classification, task ownership, dashboard visibility, and proof artifacts.

### Business Integrations

Connect real WhatsApp, payment, event, invitation, QR access, and business-specific application receivers.

### Platform Expansion

Move toward multi-business deployment, stronger App Bridge contracts, additional AI providers, and production-grade monitoring.

---

## About THETECHGUY DIGITAL SOLUTIONS

Hunter Foreman is developed by **THETECHGUY DIGITAL SOLUTIONS**, a Zambian software engineering business focused on practical business automation, repair tools, AI systems, and connected software platforms.

---

## License

License details should be reviewed before public production use.
