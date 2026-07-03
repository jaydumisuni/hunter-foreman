# Hunter Foreman Phase 1 Demo Guide

## Goal

Show that Hunter Foreman can receive a business request through ROSE, classify it, create a workflow task, update a dashboard, prepare notification previews, and escalate when human review is needed.

## Run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Docker Run

```bash
docker compose up --build
```

## Suggested 3-Minute Walkthrough

1. Open the demo and explain the public/private boundary.
2. Click **Load Automation Example**.
3. Send it to Hunter Foreman.
4. Show the dashboard task, intent, confidence, owner, workflow steps, and notification previews.
5. Click **Load Events Example** and submit it.
6. Show that the workflow owner changes to Events Team.
7. Click **Load Escalation Example** and submit it.
8. Show that human review is required.

## Demo Examples

- Events: invitations, tickets, QR check-in, approval flow.
- Support: website/contact form issue routed to support.
- Automation: AI receptionist and business workflow routing.
- Escalation: urgent/sensitive owner review.

## Judge Message

Hunter Foreman is not another chatbot. It is an AI operations foreman that organizes incoming business requests into workflows and keeps humans in control where judgement is required.
