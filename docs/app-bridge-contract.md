# App Bridge Contract

Hunter Foreman sends created tasks to connected apps using a versioned event envelope.

## Version

```text
foreman.app.task.v1
```

The contract version is sent in the JSON body and the `x-foreman-contract` header.

## Event

```text
task.created
```

## Endpoint

```text
POST /foreman/tasks
```

## Envelope

```json
{
  "contract": "foreman.app.task.v1",
  "eventId": "HF-...-1234567890",
  "eventType": "task.created",
  "source": "hunter-foreman",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "task": {
    "id": "HF-...",
    "customerName": "Demo Customer",
    "message": "Customer request text",
    "workflow": {
      "label": "Business Automation Workflow",
      "owner": "Automation Team"
    },
    "status": "ready_to_assign"
  },
  "timeline": [
    { "actor": "ROSE", "action": "request_received" },
    { "actor": "Foreman", "action": "task_created" },
    { "actor": "AppBridge", "action": "dispatch_requested" }
  ]
}
```

## Safety

The envelope contains demo task data only. It must not include private prompts, credentials, private Hunter internals, or client secrets.
