# Hunter Foreman Phase 1 Lock

## Status

Phase 1 is locked as a public-safe extraction of existing Hunter capability.

## Product

Hunter Foreman is the public operations-mode product powered by Hunter.

- Hunter: private core intelligence.
- Foreman: operations mode — gets work done.
- Pete: thinking mode — reasons and explores with the user.
- ROSE: customer-facing receptionist.

## Phase 1 Mission

Prove that Hunter Foreman can receive a business request, understand it, route it, create work, show progress, prepare notifications, and escalate to a human when needed.

## Phase 1 In Scope

- ROSE receptionist intake.
- Public-safe request analyzer.
- Intent classification.
- Confidence scoring.
- Workflow selection.
- Task creation.
- Dashboard visibility.
- Human escalation.
- Email and WhatsApp preview.
- Docker startup.
- Clear demo documentation.

## Explicitly Out of Scope

- Hunter Core internals.
- Pete internals.
- Device repair modules.
- Recovery/unlock workflows.
- Software Builder internals.
- Learning engine internals.
- Private prompts.
- Private client data.
- Production secrets.
- Advanced worker execution.
- Real money/payment flows.
- Full multi-tenant production deployment.

## Public / Shared / Private Rule

Every capability must be classified before implementation.

- PUBLIC: safe to publish in this repository.
- SHARED: public interface or simplified demo, private implementation remains inside THETECHGUY.
- PRIVATE: never published.

## Extraction Rule

Do not invent twice.

Before building any feature, check whether Hunter already has the capability. If it exists, extract the public-safe interface or demo version. If it does not exist, design only what Phase 1 requires.

## Completion Criteria

Phase 1 is complete only when:

- Docker startup works.
- Local startup works.
- A user can submit a request.
- ROSE handles intake.
- Foreman routes the request.
- A task is created.
- Dashboard updates.
- Escalation path works.
- Email/WhatsApp preview works.
- README and demo guide are complete.
- Repo remains public-safe.

## Scope Change Rule

Anything not required for Phase 1 goes into backlog. Phase 1 scope changes only when they are required to complete the locked mission.
