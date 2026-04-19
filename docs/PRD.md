# NAMA OS — Product Requirements Document

> Version: 3.0 · Last updated: 2026-04-19
> This PRD reflects the current live product. It is updated each sprint to stay in sync with the codebase.

---

## 1. Vision

**"The OS for travel businesses — replace 6 disconnected tools with one intelligent platform."**

NAMA OS is an all-in-one operating system for travel agencies. It replaces the chaotic combination of WhatsApp, spreadsheets, generic CRMs, manual PDF builders, and disconnected accounting tools with a single, AI-powered platform purpose-built for how travel businesses actually work.

The North Star metric: every travel agency on NAMA should be able to close more bookings with the same team, in less time, with full visibility from first enquiry to final payment.

---

## 2. Target Users

### Primary: Small-to-Mid Travel DMCs and Boutique Tour Operators

**Geography:** India-first (pricing in INR, WhatsApp-centric communications), with global expansion planned.

**Size:** 5 to 50 staff. Owner-operated businesses where the founder is also the sales lead.

**Maturity:** Currently using some combination of: WhatsApp for leads, Excel/Sheets for quotes, email for documents, Tally for accounting, and nothing for CRM.

### User Roles Within the Agency

| Role | Daily Use Case |
|------|---------------|
| Agency Owner / Founder | Org intelligence, team performance, financial overview |
| Sales Manager | Lead pipeline, quotations, client communication |
| Ops Executive | Booking management, visa tracking, vendor coordination |
| Finance Admin | Invoice generation, payment tracking, revenue reports |

### Secondary: Holiday Package Agencies

Fixed-departure group travel companies that need package catalogue management, seat availability, and brochure generation on top of the core CRM.

---

## 3. Core Problems Solved

### Problem 1: Lead Chaos
Leads come in via WhatsApp, website forms, Instagram DMs, and Facebook Lead Ads — all to different people's phones. There's no single place to see the pipeline, no way to assign leads, and no history of what was said to whom.

**NAMA solves this with:** Unified Leads CRM with HOT/WARM/COLD pipeline, multi-channel inbound (WhatsApp, website widget, social webhooks), AI lead scoring, bulk CSV import, and assignment tracking.

### Problem 2: Slow, Manual Quoting
Building a travel quote takes 2–4 hours: look up vendor prices in multiple spreadsheets, copy-paste into a Word doc, export as PDF, attach to email. Every revision adds another hour.

**NAMA solves this with:** Itinerary builder with live vendor rate lookup, quotation module with one-click WeasyPrint PDF generation, and a "Send to Client" flow that emails the PDF directly from within NAMA.

### Problem 3: WhatsApp-Only Communication
All client communication happens on the founder's personal WhatsApp. There's no record, no templates, no threading, and it disappears when the phone is lost or the number changes.

**NAMA solves this with:** WhatsApp Business API (Meta Cloud API) with inbound/outbound messaging, 12-template message library, per-tenant SMTP/IMAP for branded email, and a Comms hub that centralises all communication.

### Problem 4: Zero Visibility
The owner has no idea which agent is performing well, which leads are going cold, which bookings are at risk, or what the month's revenue looks like without opening five different spreadsheets.

**NAMA solves this with:** Dashboard KPIs, Team Performance Reports, AI revenue-leak banners, Org & Control Room founder intelligence, and Infrastructure Sentinel for system health.

---

## 4. Feature Requirements (by Module)

### Leads CRM
The leads module must support inbound leads from all channels (WhatsApp, website widget, Facebook Lead Ads, Instagram DM, CSV import, and manual entry). Each lead must have a status (HOT/WARM/COLD/QUALIFIED/CONVERTED), an assigned agent, and a full activity timeline. AI lead scoring must run on demand via LLM with a heuristic fallback. Bulk CSV import must handle up to 500 rows with flexible column mapping and email-based deduplication. The UI must have an EmptyState for new users and seed data for demo mode.

### Quotations
The quotations module must produce itemised proposals with line items, taxes, and margins. PDF generation must be server-side (WeasyPrint) to produce consistent, printable output without browser involvement. Proposals must be sendable to clients via email directly from the UI. Payment deposit links (Razorpay, default 25%) must be generable and shareable via WhatsApp with one click. Quotations must link to itineraries and be revisionable.

### Itineraries
The itinerary builder must support structured, day-by-day trip plans with blocks (hotel, transfer, activity, meal). Each block must support vendor assignment with live rate lookup by vendor and travel date. When a rate is applied, a "Rate locked" badge must be shown. The builder must integrate with the NAMA Content Library for destination descriptions and images. Export to quotation must be one-click.

### Bookings
Bookings must represent confirmed trips with traveller details, supplier references, and payment status. Booking detail pages must show a full status timeline. Invoice auto-generation must produce a WeasyPrint PDF and support sending via Resend with the PDF attached. The Live Trip Tracker must show real-time trip status. Bookings must link to visas, documents, and communications.

### Visas
The visa module must track per-traveller visa applications linked to bookings. Each traveller must have an independent status (Applied / In Review / Approved / Rejected) and a document checklist with per-item completion status. Deadline tracking and reminder logic must be available.

### Documents
The documents module must be the central hub for all client-facing paperwork. It must support server-side generation of Invoices, Travel Vouchers, and Booking Confirmations using WeasyPrint. All document types must be sendable via email. The template library must support at least 12 document types. Branding customisation (logo, colours) must be supported.

### Contracts
The contracts module must support creation from templates, status tracking (Draft / Sent / Signed / Expired), and linking to both clients and vendors. Future requirement: e-signature integration (DocuSign or Digio API) is planned but not required for V1.

### Finance
The finance module must provide a revenue dashboard with KPI cards (total revenue, outstanding, collected, conversion value). Multi-currency support must be built in with live FX rates refreshed every hour. Payment records must link to quotations and bookings. Future requirement: GST computation and accounting software export (Tally, QuickBooks).

### Comms
The comms module must centralise all client and vendor communication. It must support WhatsApp Business API (Meta Cloud API) for inbound and outbound messaging. Per-tenant SMTP/IMAP must allow agencies to send from their own domain and receive replies. A 12-template message library must cover common travel scenarios. All communications must be linkable to leads, quotations, or bookings.

### Automations
The automations module must support configurable follow-up triggers: cold leads (no contact in 3 days), new leads (no contact in 1 day), and stale qualified leads (no update in 7 days). For each trigger, a digest email must be sent to the responsible agent via Resend. A schedule toggle and "Run Now" button must be available. Configuration must persist in tenant settings.

### Routines
The routines module is NAMA's workflow engine. A routine is a named sequence of steps. Each step is one of 9 types: `fetch_data`, `ai_summarise`, `send_email`, `send_whatsapp`, `ai_score_leads`, `update_records`, `generate_pdf`, `group_by`, `create_task`. Steps share a context dict. Execution returns a structured result with `success`, `output_summary`, `actions_log`, and `duration_ms`. The module must support template routines and custom routine creation.

### Vendors
The vendor module must support detailed supplier profiles with service categories, contact information, and rate cards. Rate cards must support seasonal pricing, adult/child pricing, markup overrides, and visibility settings (Private / Public / Invite-Only). DMC vendors can publish rates to the cross-tenant marketplace. Rate Card CSV/Excel import must handle flexible column aliases, upsert logic, and return an import summary. A "snap rate" action must copy a marketplace rate into the calling tenant's library.

### Content
The content library must provide a shared repository of destination pages, image assets, and copywriting blocks. Pexels API integration must enable live image search with quick-search chips. Selected images must save as `MediaAsset` records linked to destinations. The NAMA Master Library must be seeded with at least 10 curated destinations. An AI Enhance button must invoke the LLM to improve destination copy. Content blocks must be usable in itineraries with one click.

### Reports
The reports module must provide a team performance view with per-agent metrics: leads assigned, quotes sent, bookings confirmed, revenue generated, and conversion rate. A summary KPI row must sit above the sortable agent table. The top-performing agent must be highlighted. Data must come from the live `/api/v1/analytics/team-performance` endpoint with seed fallback.

### Integrations
The integrations module must manage all third-party connections. Outbound webhooks must support HMAC-SHA256 signing and 8 event types covering the full lead-to-booking lifecycle. Facebook Lead Ads and Instagram DM webhooks must be supported via Meta's webhook platform with HMAC validation. The webhook management UI must allow create, edit, test, and delete. Future integrations: Zapier native app, Google Sheets sync, Slack/Teams notifications.

### Widget
The lead capture widget must be a self-contained JavaScript IIFE deployable on any website with a single script tag. It must read configuration from `data-token`, `data-color`, and `data-label` attributes. The floating button and modal form must be fully responsive. Submissions must POST to `/api/v1/capture/lead?token=` and create leads in the correct tenant's CRM. Rate limiting must cap at 10 submissions per IP per hour. The dashboard must provide embed code generation, token management, and a live preview.

### Org & Control
The Org & Control module must consolidate all organisational management into one 5-tab page:
- Tab 1: Founder Intelligence (KPIs, revenue-leak AI banner, agent leaderboard, risk feed)
- Tab 2: Org Chart (CSS tree with ghost Add Member leaves)
- Tab 3: Role Builder (6-role selector, 22-permission matrix, inline role creation)
- Tab 4: Team Management (invite, table, bulk actions, per-member menus)
- Tab 5: Subscription (usage bars, plan comparison, upgrade CTA)

The Role Builder must be wired to the `/api/v1/roles` backend API.

### Copilot
The Copilot must be a floating AI assistant accessible from all dashboard pages. It must support context attachment via a Paperclip icon (leads, itineraries, quotations). AI Lead Scoring must call `POST /api/v1/copilot/score-lead` with LLM scoring via OpenRouter and a heuristic fallback. Agency Config generation must call `POST /api/v1/copilot/generate-config` to produce `AgencyConfig` JSON DSL from a plain-text agency description. The Copilot must degrade gracefully if the LLM is unavailable.

### Holidays
The holidays module must support a fixed-departure holiday package catalogue with package creation, pricing tiers, departure dates, seat availability, and PDF brochure generation. Packages must be shareable via public URLs. Full requirements to be finalised next sprint.

### Intel
The Intel Hub must aggregate market signals, pricing benchmarks, and trend data for strategic decision-making. It must provide destination demand forecasting, competitor price signals, and exportable intelligence reports. Full requirements to be finalised next sprint.

---

## 5. Non-Goals

NAMA OS explicitly does **not** build:

- **Flight booking engines** — GDS integration (Amadeus, Sabre) is out of scope. NAMA is not a booking OTA.
- **Hotel GDS / live inventory** — NAMA manages vendor relationships and rates, not live inventory lookups.
- **B2C consumer apps** — NAMA is a B2B SaaS tool for agencies, not a direct-to-consumer travel planning app.
- **Accounting software** — NAMA tracks revenue and payments but does not replace Tally, QuickBooks, or Zoho Books.
- **HR and payroll** — Org & Control covers team management and roles, not HR compliance or salary processing.

---

## 6. Success Metrics

### Primary Business Metrics
| Metric | Target |
|--------|--------|
| Lead → Booking conversion rate | +15% vs pre-NAMA baseline |
| Time-to-quote | Under 30 minutes (from 2–4 hours) |
| Revenue per agent per month | +20% within 90 days |
| Trial → Paid conversion | >25% of trials convert within 14 days |

### Product Health Metrics
| Metric | Target |
|--------|--------|
| Onboarding completion rate | >60% of signups complete all 7 steps |
| Daily active users / Monthly active users | >40% |
| Feature adoption (Copilot) | >50% of active users use Copilot in first 30 days |
| Churn rate | <5% monthly |

### Technical Health Metrics
| Metric | Target |
|--------|--------|
| API response time (p95) | Under 400ms |
| Uptime | 99.9% |
| E2E test pass rate | 100% (currently 27/27) |
| Sentry error rate | <0.1% of requests |

---

## 7. Pricing

| Plan | Price | Included |
|------|-------|----------|
| Trial | Free for 14 days | All features, 1 user, 50 leads |
| Starter | ₹4,999 / month | 3 users, 500 leads/month, all core modules |
| Growth | ₹12,999 / month | 10 users, unlimited leads, all modules + Routines + Sentinel |
| Enterprise | Custom pricing | Unlimited users, white-label, dedicated support, custom integrations |

### Add-ons (future)
- Extra user seats: ₹999/user/month
- Extra lead volume: ₹1,999 / 1,000 leads/month
- White-label domain: ₹2,999/month

---

*For the current implementation state of each module, see `MODULES.md`. For the technical implementation details, see `TECH_STACK.md` and `DEVELOPER_HANDOVER.md`.*
