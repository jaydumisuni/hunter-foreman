# ROSE browser runtime

These assets provide the continuing, client-facing ROSE experience used by the official Hunter Foreman clone on port 3000.

Runtime contract:

- the prepared judge request remains visible before the first Send;
- the first Send creates exactly one tracked request through `POST /api/requests`;
- the composer clears and becomes a continuing ROSE conversation;
- client bubbles never expose provider or backend details;
- concrete event guidance does not claim unconnected external actions;
- dashboard state updates from the returned task;
- follow-up questions do not create another request;
- the Apps view contains one POS System card marked **Not connected**.

The inline `renderApps()` data is authoritative for Apps cards. The ROSE runtime does not inject a second POS card, which keeps Reset, refresh and tab navigation deterministic.

`official-rose-browser-proof.yml` verifies this contract in a fresh checkout with the real Node server at `http://127.0.0.1:3000`.
