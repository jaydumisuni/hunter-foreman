# Live App Connection API

## `GET /api/app-bridge/status`

Returns the current app bridge configuration and latest dispatch result.

### Response

```json
{
  "configured": true,
  "target": "http://localhost:3100",
  "tokenConfigured": false,
  "lastDispatch": {
    "taskId": "HF-...",
    "sent": true
  }
}
```

## Usage

The demo UI polls this endpoint so judges can see whether Hunter Foreman is running in local-only mode or connected to the external receiver app.

## Safety

The status endpoint never returns token values. It only reports whether a token is configured.
