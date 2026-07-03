# App Bridge Runbook

This runbook shows how to connect the main Hunter Foreman demo to the separate demo receiver app.

## Repositories

- Main app: `jaydumisuni/hunter-foreman`
- Receiver app: `jaydumisuni/hunter-foreman-demo`

## Run Receiver

In the receiver repo:

```bash
npm install
npm run dev
```

Receiver URL:

```text
http://localhost:3100
```

## Run Main App With Bridge

In the main repo:

```bash
FOREMAN_APP_WEBHOOK_URL=http://localhost:3100 npm run dev
```

Main app URL:

```text
http://localhost:3000
```

## Test Flow

1. Open the receiver app at port 3100.
2. Open the main app at port 3000.
3. Submit a request from ROSE intake.
4. The main app creates a Foreman task.
5. The bridge sends the task to the receiver app.
6. The receiver app displays the task.

## Bridge Contract

The main app sends:

```text
POST /foreman/tasks
```

Payload shape:

```json
{
  "task": {
    "id": "HF-...",
    "customerName": "Demo Customer",
    "intent": "business_automation",
    "workflow": {
      "label": "Business Automation Workflow",
      "owner": "Automation Team"
    },
    "status": "ready_to_assign"
  }
}
```

## Optional Token

For local protected demos, set the same `FOREMAN_APP_TOKEN` value in both apps. Do not commit real secrets.

## Public Safety

The bridge is public-safe. It sends demo task data only and does not expose private Hunter Core, production credentials, private prompts, or client data.
