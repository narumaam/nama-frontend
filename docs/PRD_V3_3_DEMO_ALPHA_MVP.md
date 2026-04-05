# NAMA PRD v3.3

## Purpose

This document replaces fragmented alpha and beta narratives with a single product definition for the current Demo, Alpha, and MVP trajectory on `codex/beta-foundations`.

## Product Statement

NAMA Travel OS is a tenant-aware travel operating system for agencies, DMCs, and internal operators. It combines onboarding, team access, CRM, deal shaping, finance visibility, bookings, branded traveler outputs, and supervisory controls into one shared workspace.

## Product Modes

### Demo

The Demo is a founder-safe, investor-safe operating walkthrough. It must feel coherent end to end and avoid dead ends, broken states, or misleading claims. It is optimized for rehearsal and presentation rather than production throughput.

### Alpha

Alpha is the controlled pre-release operating build. It must prove the main multi-user and multi-module journey, expose weak seams truthfully, and be stable enough for internal testing, seeded scenarios, and closeout review.

### MVP

MVP is the first customer-credible operating version. It requires durable data truth, real credential and session handling, authenticated write paths, clearer role boundaries, deploy-safe migrations, and reduced reliance on client-side demo state.

## User Types

- Founder / business owner
- Customer admin
- Sales user
- Operations user
- Finance user
- Viewer / restricted user
- Super Admin / internal NAMA operator
- Traveler receiving branded outputs

## Core Jobs

- Create and brand a travel workspace quickly
- Invite and activate team members securely
- Capture, qualify, and progress leads
- Shape deals and pricing with continuity across functions
- Track finance and booking release state clearly
- Generate branded invoice and traveler-facing artifacts
- Let Super Admin observe tenant health and control seeded demo states

## Demo Scope

### Must Work

- Registration and workspace entry
- Tenant login and Super Admin login
- Team import, invite, acceptance, and workspace access
- Leads to deals to finance to bookings continuity
- Invoice and traveler PDF artifact routes
- Super Admin access and audit/report routes
- Seeded scenario walkthroughs and smoke coverage

### Can Be Framed As Preview

- Analytics interpretation
- Content library
- Comms orchestration
- DMC workspace depth
- Autopilot / EKLA / Evolution

## Alpha Scope

### Done Or Strong

- Credential-backed access and session controls
- Team and invite lifecycle
- Founder-path workflow state continuity
- Artifact and audit/report surfaces
- Super Admin separation and visibility
- Build and smoke-testable seeded scenarios

### Partial

- CRM backend truth
- Proposal/deal depth
- Communications provider integration
- Supplier orchestration
- Analytics trustworthiness
- Itinerary editorial lifecycle
- Long-tail intelligence modules

## MVP Scope

### Required For MVP

- Durable backend truth for the main commercial workflow
- Authenticated contract-backed writes across core modules
- Reduced preview-only copy on customer-facing and operator-facing screens
- Clear environment/deployment posture
- Payment and supplier flows that are at least truthful sandbox implementations
- Documentation and handoff good enough for a new developer to continue

### Deferred Beyond MVP

- Full predictive decision graph layer
- Deep AI orchestration across all modules
- Enterprise-grade external ecosystem breadth

## Module Map

| Module | Working interpretation | Demo | Alpha | MVP target |
| --- | --- | --- | --- | --- |
| M1 | Registration and workspace provisioning | Must work | Strong | Productionize |
| M2 | Leads and CRM intake | Must feel real | Partial | Durable CRM truth |
| M3 | Deals and proposal shaping | Must feel real | Partial | Durable deal lifecycle |
| M4 | Finance and settlement visibility | Must work | Strong | Harden and persist |
| M5 | Bookings and execution release | Must work | Strong | Harden and persist |
| M6 | Team, invites, roles | Must work | Strong | Expand role governance |
| M7 | Admin / Super Admin / audit | Must work | Strong | Harden governance |
| M8 | Itineraries and traveler output | Must work visually | Partial | Editorial lifecycle |
| M9 | Content library | Can remain preview | Partial | Publish pipeline |
| M10 | Communications | Can remain preview | Partial | Provider-backed sends |
| M11 | DMC / supplier ops | Can remain preview | Partial | Truthful supplier flow |
| M12 | Analytics | Can remain preview | Partial | Trustworthy BI |
| M13 | Autopilot | Present as vision | Partial | Guided assistive workflow |
| M14 | EKLA | Present as vision | Partial | Knowledge operations |
| M15 | Evolution | Present as vision | Partial | System intelligence layer |

## Non-Functional Requirements

- No broken critical routes
- No misleading broken buttons in the main demo path
- Build must pass
- Lint must pass
- Founder, tenant-role, super-admin, and route-audit smokes must pass
- The same seeded cases must show continuity across modules

## Risks

- Several modules still rely on narrative-heavy preview framing
- Documentation in the repo has historically mixed multiple taxonomies
- Some backend surfaces remain mock/sandbox/readiness level
- Visual consistency outside the strengthened shell still needs more polish

## Exit Criteria

### Demo Exit

- Rehearsal-safe founder and admin path
- No critical dead ends
- Strong visual shell

### Alpha Exit

- Main multi-user path is stable and testable
- Weak modules are either improved or clearly contained
- Handoff docs exist and match repo truth

### MVP Exit

- Durable truth across core commercial flow
- Realistic sandbox operations for payments and suppliers
- Clear developer handoff and deployment posture
