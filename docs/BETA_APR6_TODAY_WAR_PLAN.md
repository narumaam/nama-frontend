# Beta April 6 Today War Plan

## Objective

Ship the strongest possible beta by April 6 morning IST with:

- no critical auth or route failures
- no dead-end core journey paths
- truthful deployment and env behavior
- a documented module map and execution backlog

## Track 1: Stability Lock

### Already completed

- branch baseline captured across `main`, `codex/apr6-alpha`, and `codex/beta-foundations`
- current beta branch validated clean and pushed
- local build, auth tests, and smoke suite validated
- production-start auth smoke added and passing

### Today actions

- [x] align env matrix with `SESSION_COOKIE_SECRET`, `NAMA_AUTO_MIGRATE`, and `SUPER_ADMIN_BOOTSTRAP_CODE`
- [ ] verify Railway and Vercel envs match the documented matrix
- [ ] validate backend production startup assumptions on Railway-style config

## Track 2: Product Truth Audit

### Already completed

- [x] create a grounded module status map in `docs/BETA_APR6_EXECUTION_AUDIT.md`
- [x] identify auth/access as the strongest beta-complete area
- [x] identify finance, bookings, comms, supplier ops, analytics, EKLA, and Evolution as still preview or partial

### Today actions

- [x] walk the founder flow and document each route, state transition, and backend dependency
- [ ] record every preview/mock seam that appears in investor-critical routes
- [ ] consolidate the M1–M15 taxonomy into one current beta truth

## Track 3: P0 Revenue Journey Hardening

Execution order:

1. Leads
2. Deals
3. Finance
4. Bookings
5. Confirmation / artifacts

### Concrete tasks

- [ ] verify lead-stage transitions are durable and not only local UI mutations
- [ ] verify deal/quote actions have backend-backed truth or clearly scoped beta-safe persistence
- [x] replace or harden finance paths that still rely on mocked backend data
- [x] replace or harden booking-confirmation paths that still rely on prototype backend behavior
- [x] confirm invoice, traveler PDF, and artifact routes never dead-end after a successful flow

## Track 4: Beta Module Completion

### Completed modules to preserve

- [x] M1 registration and auth bootstrap
- [x] M6 team, roles, invites, activation
- [x] M7 admin, sessions, audit

### Partial modules to upgrade next

- [ ] M2 leads
- [ ] M3 deals
- [ ] M4 finance
- [ ] M5 bookings
- [ ] M8 itineraries
- [ ] M9 content
- [ ] M10 comms
- [ ] M11 supplier / DMC ops
- [ ] M12 analytics

### Broken or narrative-heavy modules to de-risk

- [ ] M13 autopilot
- [ ] M14 EKLA
- [ ] M15 evolution

Rule:

- if a module cannot be made truly beta-functional in time, it must be reframed cleanly as non-blocking and isolated from the primary conversion journey

## Track 5: QA And Validation

### Already completed

- [x] `npm run lint`
- [x] backend auth and session tests
- [x] founder smoke
- [x] tenant-role smoke
- [x] super-admin smoke
- [x] deploy-auth smoke

### Today actions

- [x] add or run route-coverage checks for all dashboard entry pages
- [x] validate no obvious 404s across homepage, register, login, dashboard, invite, and admin paths
- [ ] create one issue list for all broken routes, failed actions, and inconsistent redirects
- [ ] rerun regression after each P0 fix

## Documentation Deliverables

- [x] `docs/BETA_APR6_EXECUTION_AUDIT.md`
- [ ] updated PRD aligned to the current beta architecture
- [ ] updated user manual aligned to the current beta flows
- [ ] before/after audit summary for the final handoff

## Today’s Immediate Next Coding Targets

1. audit finance and booking APIs for prototype/mock dependencies
2. harden the founder revenue path where backend truth is still weak
3. reduce preview-only copy on critical conversion surfaces where the flow is already more real than the messaging suggests
4. update the PRD and user manual after the product-truth pass
