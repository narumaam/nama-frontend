# NAMA PRD v3.2 Alpha

## Document Intent

PRD v3.2 updates the older v3.0 product narrative to match the actual April alpha branch and its founder-demo scope.

## Product Statement

NAMA is a multi-surface operating system for travel businesses that brings registration, CRM, proposals, finance, bookings, team operations, branded traveler outputs, and supervisory audit visibility into one tenant-aware workspace.

## Alpha Scope

The current alpha is designed to prove:

- a coherent founder walkthrough
- believable tenant onboarding and white-label setup
- a shared case flow from lead through finance and booking
- branded traveler and finance artifacts
- a Super Admin view that can observe tenant health and lifecycle progress
- a separate Super Admin access path distinct from customer registration and tenant routes
- seeded scenarios and smoke-testable demos

## Primary User Types

- Founder or business owner
- Team admin
- Operations user
- Sales user
- Finance operator
- Super Admin / internal NAMA operator
- Traveler or customer receiving branded outputs

## Core Jobs To Be Done

- Set up a branded travel workspace quickly.
- Import employees and invite a team.
- Capture and progress travel opportunities.
- Maintain continuity from lead to quote to booking to settlement.
- Generate branded customer-facing outputs.
- Observe business health, lifecycle progress, and operating risk from an admin layer.

## Current Functional Scope

### Done For Alpha

- Workspace registration, branding, domain selection, and bank-detail capture
- Employee import and invite generation
- Invite acceptance route
- Shared workflow continuity from leads through artifacts
- Branded invoice and traveler PDF routes
- Audit reporting, proof artifact export, and demo pack assembly
- Demo Lab seeding and multi-scenario smoke validation

### Partial In Alpha

- CRM depth and true backend persistence
- Proposal lifecycle depth
- Communications with real provider delivery
- Content production and publishing pipeline
- Supplier operations and sourcing orchestration
- Analytics truthfulness against production data
- Autopilot, EKLA, and Evolution as productized modules

### Out Of Scope For Alpha

- Production-grade billing and webhooks
- Full OTA supplier transaction flows
- Hardened security and compliance operations
- Full role and permission architecture
- Production analytics and observability

## UX Principles

- Founder-safe clarity over systems complexity
- Strong cross-module continuity
- Visible tenant identity across shell and outputs
- Guided education using contextual help
- Exportable proof artifacts for demos and audits

## Module Requirements Snapshot

| Module | Requirement level in alpha |
| --- | --- |
| Registration and setup | Must work |
| Team and invites | Must work |
| Leads and workflow continuity | Must feel real |
| Finance and bookings continuity | Must work |
| Branded artifacts | Must work |
| Super Admin and audit | Must work |
| External integrations | Must report readiness |
| Deep operational modules | Can remain partial |

## Non-Functional Requirements

- Build must pass on the alpha branch.
- Lint must pass on the alpha branch.
- Founder smoke scenario must pass.
- Demo scenarios must be seedable without manual code edits.
- Artifact routes must be printable and presentable in live demos.

## Risks

- Demo-state continuity can be mistaken for production-grade backend truth.
- Security posture is not yet beta-ready.
- External integration claims must stay grounded in actual adapter and health status.
- Design adoption cannot be audited against an external reference until it is shared.

## Acceptance Criteria For Alpha Handoff

- Branch builds cleanly.
- Lint passes cleanly.
- Founder smoke passes.
- Alpha closeout documentation exists and matches the current repo.
- Seeded scenarios cover healthy and negative-path demos.
- Module status and integration readiness are explicitly documented.
