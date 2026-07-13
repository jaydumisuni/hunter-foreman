# ROSE browser runtime

These assets provide the continuing, client-facing ROSE experience used by the official Hunter Foreman Node and Docker clone on port 3000.

Runtime contract:

- the prepared judge request remains visible before the first Send;
- the first Send creates exactly one tracked request through `POST /api/requests`;
- the composer clears and becomes a continuing ROSE conversation;
- ROSE acknowledges the client warmly and offers useful event guidance;
- client bubbles never expose Fireworks, provider, model, classifier, fallback, API, or backend details;
- concrete event guidance does not claim unconnected external actions;
- dashboard state updates from the returned task;
- follow-up questions stay in the same conversation and do not create another request;
- the Apps view contains exactly one POS System card marked **Not connected**.

The inline `renderApps()` data is authoritative for Apps cards. The ROSE runtime does not inject a second POS card, which keeps Reset, refresh and tab navigation deterministic.

The clone may use Fireworks internally when `FIREWORKS_API_KEY` is configured, while verified client-safe guidance remains available without credentials. Provider details remain visible only in the operational proof surface, never in ROSE’s client conversation.

`.github/workflows/official-rose-browser-proof.yml` verifies this contract in a fresh checkout with the real Node server at `http://127.0.0.1:3000`. It captures screenshots before Send, after request creation, after a QR follow-up, and on the Apps view.