# Hunter Foreman Extraction Matrix

This file tracks what already exists in the private Hunter ecosystem and what is safe to extract into the public Hunter Foreman hackathon product.

## Classification

- PUBLIC: safe to publish.
- SHARED: public interface or demo version only; private implementation stays in THETECHGUY.
- PRIVATE: never published.

| Capability | Source / Evidence | Exists | Classification | Phase 1 Action | Notes |
|---|---|:---:|---|---|---|
| Hunter core intelligence | Existing Hunter architecture | Yes | PRIVATE | Do not publish | Mention only at high level. |
| Foreman operations mode | Current product decision | Yes | PUBLIC / SHARED | Publish product role and public-safe interfaces | Foreman is Hunter in operations mode. |
| Pete thinking mode | Pilot/copilot analogy and prior design | Yes | PRIVATE | Mention only in docs if needed | Pete is thinking mode, not the public hackathon product. |
| ROSE receptionist | Existing ROSE/event request work | Yes | PUBLIC / SHARED | Extract public-safe intake flow | Customer-facing entry point. |
| Request routing | Existing Hunter routing/orchestration | Yes | SHARED | Implement simplified public router | Keep private routing internals out. |
| Confidence scoring | Existing routing/safety pattern | Yes | SHARED | Publish simple scoring model | Private heuristics remain private. |
| Worker router | Hunter PR Watch | Yes | SHARED | Phase 1 simplified task/workflow router | Advanced workers remain private. |
| Evidence engine | Hunter PR Watch | Yes | SHARED / PRIVATE | Backlog | Useful later for audits/reviews. |
| Review engine | Hunter PR Watch | Yes | SHARED / PRIVATE | Backlog | Not required for Phase 1 demo. |
| Safety net | Hunter PR Watch | Yes | SHARED | Use public safety rules and guardrails | Keep internal enforcement private. |
| Project constitution | Hunter PR Watch | Yes | PRIVATE | Do not publish | Convert only to public-safe project rules. |
| Claw execution | Hunter Claw Code Usage | Yes | PRIVATE / SHARED | Backlog | Public may mention adapter pattern only. |
| Purple mode / A12+ limitations | Purple Mode Limitations A12+ | Yes | PRIVATE | Do not publish | Device-specific constraints stay private. |
| Device repair/recovery | Existing THETECHGUY Tool work | Yes | PRIVATE | Exclude | Never part of Phase 1 public repo. |
| Software Builder | Existing Builder work | Yes | PRIVATE | Exclude | Separate internal product. |
| Dashboard | Existing site/dashboard patterns | Yes | PUBLIC | Build public demo dashboard | Public-safe demo data only. |
| Email notification preview | Existing messaging plans | Yes | PUBLIC | Build preview only | No production secrets. |
| WhatsApp notification preview | Existing messaging plans | Yes | PUBLIC | Build preview only | No production Meta credentials. |
| Docker startup | Hackathon requirement | Partial | PUBLIC | Make required judge path | `docker compose up --build`. |

## Current Phase 1 Extraction Target

1. ROSE intake.
2. Public-safe request analyzer.
3. Foreman router.
4. Task/workflow creation.
5. Dashboard update.
6. Human escalation.
7. Notification previews.
8. Docker and docs.
