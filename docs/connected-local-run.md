# Connected Local Run

This guide starts the main Hunter Foreman app and the demo receiver app together.

## Folder Layout

Place both repositories beside each other:

```text
workspace/
  hunter-foreman/
  hunter-foreman-demo/
```

## Start Both Apps

From `hunter-foreman`:

```bash
docker compose -f docker-compose.connected.yml up --build
```

Open:

```text
http://localhost:3000
http://localhost:3100
```

## Test The Bridge

1. Open the receiver app on port 3100.
2. Open the main app on port 3000.
3. Submit a request from ROSE intake.
4. The main app creates a task.
5. The receiver app displays the bridged task.

## Notes

- The connected compose file expects the receiver repo at `../hunter-foreman-demo`.
- No production credentials are required.
- `FOREMAN_APP_TOKEN` is empty by default for local demo use.
