# NAMA OS — Complete Screen Inventory

> **Total screens: 43** | Last updated: 2026-04-19 · Sprint 3+4
> Single source of truth for every page and route in the application. Updated each sprint.

---

## Quick Count by Category

| Category | Count |
|----------|-------|
| Public / Marketing | 7 |
| Marketing Tools | 2 |
| Onboarding | 1 |
| Dashboard — Operations | 15 |
| Dashboard — Documents & Finance | 4 |
| Dashboard — Config & Admin | 9 |
| Dashboard — Admin Only | 6 |
| External / Special | 4 |
| **Total** | **48** |

> Note: Count is 48 when including all sub-routes and special pages. The "43 screens" figure counts distinct user-facing experiences.

---

## Public Screens (7)

These screens are accessible without authentication.

| Route | Screen Name | Description | Auth |
|-------|-------------|-------------|------|
| `/` | Landing Page | Pain-focused hero, AI differentiators, Before/After comparison, demo CTA | None |
| `/register` | Register | New account creation; email + Google OAuth | None |
| `/login` | Login | Email + password + Google OAuth sign-in | None |
| `/forgot-password` | Forgot Password | Password reset request form | None |
| `/pricing` | Pricing | Plan comparison: Trial / Starter / Growth / Enterprise | None |
| `/terms` | Terms of Service | Legal terms | None |
| `/privacy` | Privacy Policy | Privacy policy | None |

---

## Marketing Tools (2)

Interactive tools for lead generation and product demos.

| Route | Screen Name | Description | Auth |
|-------|-------------|-------------|------|
| `/byok-calculator` | BYOK Calculator | Bring-Your-Own-Key cost savings calculator | None |
| `/demo` | Live Demo | Interactive product demo with triage animation | None |

---

## Onboarding (1)

| Route | Screen Name | Description | Auth |
|-------|-------------|-------------|------|
| `/onboarding` | Self-Onboarding Wizard | 7-step wizard: Welcome → AI Triage → AI Setup → Channels → Team → Workspace → Launch | Required |

**Onboarding Step Detail:**
- Step 1 Welcome — agency name + logo
- Step 2 AI Triage — WOW moment: WhatsApp bubble → 3-phase extraction → SVG ring 0→87%
- Step 3 AI Setup — describe agency → Claude generates `AgencyConfig` JSON DSL
- Step 4 Connect Channels — WhatsApp number, SMTP quick-connect, website widget embed code
- Step 5 Team — invite team members
- Step 6 Workspace — configure defaults
- Step 7 Launch — CSS confetti, elapsed time display, dual CTA (leads or dashboard)

---

## Dashboard — Operations (15)

Core day-to-day travel business operations. All require authentication.

| Route | Screen Name | Description | Min Role |
|-------|-------------|-------------|----------|
| `/dashboard` | Dashboard Home | KPI cards, pipeline summary, quick actions | R5 |
| `/dashboard/queries` | Queries | Incoming enquiry triage and quick-assign | R3 |
| `/dashboard/leads` | Leads CRM | HOT/WARM/COLD pipeline, AI scoring, bulk import | R3 |
| `/dashboard/quotations` | Quotations | Create proposals, generate PDF, collect deposits | R3 |
| `/dashboard/itineraries` | Itineraries | Day-by-day trip builder with vendor rate lookup | R3 |
| `/dashboard/bookings` | Bookings | Booking list with status, invoice generation | R4 |
| `/dashboard/bookings/[id]` | Booking Detail | Individual booking: travellers, timeline, docs | R4 |
| `/dashboard/visas` | Visas | Per-traveller visa application tracker | R4 |
| `/dashboard/holidays` | Holidays | Holiday package catalogue — NEW | R3 |
| `/dashboard/calendar` | Calendar | Reminders, trip timeline, iCal subscribe URL | R3 |
| `/dashboard/routines` | Routines | Multi-step AI workflow builder and executor | R2 |
| `/dashboard/clients` | Clients | Client database, history, EmptyState wired | R3 |
| `/dashboard/vendors` | Vendors | Supplier network + rate cards + DMC marketplace | R3 |
| `/dashboard/comms` | Comms | WhatsApp + email hub, 12-template library | R3 |
| `/dashboard/intentra` | Intentra | (Intent analysis view) | R2 |

---

## Dashboard — Documents & Finance (4)

| Route | Screen Name | Description | Min Role |
|-------|-------------|-------------|----------|
| `/dashboard/documents` | Documents | Generate and manage all client documents | R3 |
| `/dashboard/contracts` | Contracts | Client and vendor contract management | R2 |
| `/dashboard/finance` | Finance | Revenue, payments, expenses dashboard | R5 |
| `/dashboard/reports` | Reports | Team performance table + KPI summary | R3 |

---

## Dashboard — Config (9)

Configuration, setup, and management screens. Most require R2 or above.

| Route | Screen Name | Description | Min Role |
|-------|-------------|-------------|----------|
| `/dashboard/content` | Content Library | Destinations, images, NAMA master library | R2 |
| `/dashboard/automations` | Automations | Follow-up rules, reminder schedule, run-now | R2 |
| `/dashboard/integrations` | Integrations | Webhooks, Facebook Lead Ads, Instagram DM | R2 |
| `/dashboard/widget` | Lead Widget | Embed code, token, color picker, test preview | R2 |
| `/dashboard/org` | Org & Control | 5-tab: intelligence, org chart, roles, team, subscription | R0–R2 |
| `/dashboard/roles` | Roles | Role + permissions management (standalone page) | R0–R1 |
| `/dashboard/team` | Team | Team member table, invite, bulk actions | R0–R2 |
| `/dashboard/settings` | Settings | General workspace settings | R2 |
| `/dashboard/settings/email` | Email Settings | Per-tenant SMTP/IMAP with presets + test | R2 |

---

## Dashboard — Admin (6)

Restricted to R0 (Owner) or R0+R1 only. All have page-level role guards with redirect.

| Route | Screen Name | Description | Access |
|-------|-------------|-------------|--------|
| `/dashboard/intel` | Intel Hub | Intelligence aggregation — NEW | R0–R1 |
| `/dashboard/sentinel` | Sentinel | Infrastructure usage monitor (Vercel/Railway/Neon) | R0–R1 |
| `/dashboard/status` | System Status | Live system health and API status | R0–R1 |
| `/dashboard/audit` | Audit Agent | 16-check health score, auto-refresh 30s | R0–R1 |
| `/dashboard/investor` | Investor Dashboard | Aggregated business metrics for investors | R0 only |
| `/kinetic` | Kinetic | Special path — covered by middleware matcher | R0 |

---

## External / Special (4)

Pages accessible outside the main dashboard, some public.

| Route | Screen Name | Description | Auth |
|-------|-------------|-------------|------|
| `/portal/[bookingId]` | Customer Portal | Public trip view for travellers — no login required | None |
| `/owner` | Owner Panel | Multi-tenant owner management | R0 only |
| `/super-admin` | Super Admin | System-wide administration | R0–R1 |
| `/proposal` | Proposal View | Shareable proposal link for clients | None |

---

## Role Access Summary

| Role | Access Level | Visible Nav Items |
|------|-------------|-------------------|
| R0 Owner | All screens | Everything including Investor, Audit, Sentinel |
| R1 Org Admin | All except Investor | Audit, Sentinel, Status visible |
| R2 Org Admin | Operations + Config | No Admin screens |
| R3 Sales Manager | Leads, Quotations, Bookings, Comms | No Config or Admin |
| R4 Ops Executive | Bookings, Visas, Documents | Operational only |
| R5 Finance Admin | Finance, Documents | Finance-scoped |
| Demo | R3 view | Hides Investor, Audit Agent, System Status, Sentinel |

---

## API Routes (Next.js)

These are Next.js API routes — they run serverless on Vercel, not Railway.

| Route | Purpose |
|-------|---------|
| `/api/auth/set-cookie` | Sets HttpOnly JWT cookie after Railway login |
| `/api/email/drip` | Renders + sends drip email via Resend JS SDK |
| `/api/email/preview` | Preview any email template (`?day=0\|1\|3\|7`) |

---

*For auth and routing architecture, see `DEVELOPER_HANDOVER.md`. For module-level feature detail, see `MODULES.md`.*
