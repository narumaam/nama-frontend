# NAMA OS — All Modules Reference

> Last updated: 2026-04-19 · Sprint 3+4
> This is the canonical reference for every product module. Updated each sprint.

---

## Module Summary Table

| # | Module Name | Route | Utility | Status | Completion |
|---|-------------|-------|---------|--------|------------|
| 1 | Leads | `/dashboard/leads` | Manage inbound enquiries and pipeline | Live | 90% |
| 2 | Quotations | `/dashboard/quotations` | Create and send travel price proposals | Live | 85% |
| 3 | Itineraries | `/dashboard/itineraries` | Build day-by-day trip plans with rate cards | Live | 80% |
| 4 | Bookings | `/dashboard/bookings` | Confirm trips and track booking lifecycle | Live | 85% |
| 5 | Visas | `/dashboard/visas` | Track visa applications per traveller | Live | 70% |
| 6 | Documents | `/dashboard/documents` | Generate invoices, vouchers, and confirmations | Live | 90% |
| 7 | Contracts | `/dashboard/contracts` | Create and manage client agreements | Live | 60% |
| 8 | Finance | `/dashboard/finance` | Track payments, revenue, and expenses | Live | 75% |
| 9 | Comms | `/dashboard/comms` | WhatsApp and email communication hub | Live | 80% |
| 10 | Automations | `/dashboard/automations` | Configure auto-reminders and follow-up rules | Live | 75% |
| 11 | Routines | `/dashboard/routines` | Multi-step AI-powered workflow engine | Live | 85% |
| 12 | Vendors | `/dashboard/vendors` | Manage supplier network and rate cards | Live | 85% |
| 13 | Content | `/dashboard/content` | Destinations, images, and copy library | Live | 70% |
| 14 | Reports | `/dashboard/reports` | Team performance analytics and KPIs | Live | 75% |
| 15 | Integrations | `/dashboard/integrations` | Webhooks, social, and third-party connectors | Live | 70% |
| 16 | Widget | `/dashboard/widget` | Embeddable lead capture widget for your website | Live | 90% |
| 17 | Org & Control | `/dashboard/org` | Team management, roles, and org chart | Live | 80% |
| 18 | Copilot | (floating) | AI assistant with contextual suggestions | Live | 65% |
| 19 | Holidays | `/dashboard/holidays` | Holiday package catalogue and management | New | — |
| 20 | Intel | `/dashboard/intel` | Intelligence Hub — aggregated market signals | New | — |

---

## Module Detail

---

### 1. Leads — 90%

**Route:** `/dashboard/leads`
**Utility:** Central CRM for managing all inbound travel enquiries, from first contact to qualified pipeline.

**Key Features:**
- HOT/WARM/COLD pipeline with AI lead scoring via OpenRouter LLM + heuristic fallback (`POST /api/v1/copilot/score-lead`)
- Bulk CSV import with 12-field alias map, dedup by email, max 500 rows per upload
- EmptyState component wired in; full seed data fallback when backend is unreachable

**Remaining:**
- Deeper AI enrichment (company/social lookup)
- Kanban drag-and-drop board view

---

### 2. Quotations — 85%

**Route:** `/dashboard/quotations`
**Utility:** Compose itemised travel price proposals and deliver them to clients as PDF or shareable link.

**Key Features:**
- Server-side PDF generation via WeasyPrint (`POST /api/v1/documents/quotation-pdf`) — no browser print dialog
- "Send to Client" modal: generates PDF and emails it via Resend API (`POST /api/v1/documents/send-quotation`)
- Razorpay payment link for 25% deposit — one-click copy or WhatsApp share

**Remaining:**
- Version history and revision tracking
- Proposal open/click analytics

---

### 3. Itineraries — 80%

**Route:** `/dashboard/itineraries`
**Utility:** Build structured, day-by-day trip itineraries with live vendor rate card lookups.

**Key Features:**
- Vendor dropdown triggers live rate lookup (`GET /api/v1/itineraries/rate-lookup?vendor_id=&date=`)
- "Rate locked" badge displayed on blocks where a vendor rate has been applied
- NAMA Master Content Library with 10 curated destinations and Pexels image search integration

**Remaining:**
- Drag-and-drop day reordering
- Multi-currency pricing per itinerary block

---

### 4. Bookings — 85%

**Route:** `/dashboard/bookings` · `/dashboard/bookings/[id]`
**Utility:** Confirm travel bookings, manage traveller details, and track the full trip lifecycle.

**Key Features:**
- Live Trip Tracker — real-time status view embedded per booking record
- Invoice auto-generation: `POST /api/v1/documents/invoice-pdf` (WeasyPrint) + `POST /api/v1/documents/send-invoice` (PDF via Resend)
- Booking detail page (`/[id]`) with traveller manifest, status timeline, and per-traveller notes

**Remaining:**
- Traveller document upload (passport scan, visa copy)
- Supplier confirmation auto-email on booking creation

---

### 5. Visas — 70%

**Route:** `/dashboard/visas`
**Utility:** Track visa application status and document checklist per traveller across all bookings.

**Key Features:**
- Per-traveller visa status board: Applied / In Review / Approved / Rejected
- Document checklist with per-item completion status
- Visa records linked to parent booking for end-to-end trip management

**Remaining:**
- Visa processing agency integrations
- Automated deadline and expiry reminders
- Embassy appointment scheduling support

---

### 6. Documents — 90%

**Route:** `/dashboard/documents`
**Utility:** Central hub for generating and managing all client-facing documents across trips.

**Key Features:**
- 12-template document library: Invoice, Voucher, Booking Confirmation, and more
- WeasyPrint server-side PDF rendering for all document types (replaces browser print)
- Send Invoice via Resend with PDF attached; triggered from confirmed bookings page

**Remaining:**
- E-signature integration (DocuSign or Digio)
- Custom branding / watermark per document type

---

### 7. Contracts — 60%

**Route:** `/dashboard/contracts`
**Utility:** Create, manage, and track signed client agreements and vendor contracts.

**Key Features:**
- Contract creation from pre-built templates
- Status tracking: Draft / Sent / Signed / Expired
- Client and vendor contract records linked to relevant bookings

**Remaining:**
- E-signature flow (DocuSign / Digio API)
- Automated contract renewal reminders
- Contract version diffing and comparison
- Digital signature audit trail

---

### 8. Finance — 75%

**Route:** `/dashboard/finance`
**Utility:** Track all incoming payments, outgoing expenses, and overall agency financial health.

**Key Features:**
- Revenue dashboard with KPI cards: total revenue, outstanding, collected
- Multi-currency support — live FX rates from open.er-api.com with 1-hour Redis cache; fallback rates baked in
- Payment status tracking linked to quotations and confirmed bookings

**Remaining:**
- Tally / QuickBooks export
- GST computation and tax reporting
- P&L breakdown by trip or agent

---

### 9. Comms — 80%

**Route:** `/dashboard/comms`
**Utility:** Centralised communication hub for WhatsApp, email threads, and templated client messages.

**Key Features:**
- 12-template message library covering common travel communication scenarios
- WhatsApp Business API (Meta Cloud API) with inbound DM ingestion and outbound messaging
- Per-tenant SMTP/IMAP: send from own domain, poll IMAP for reply ingestion and threading

**Remaining:**
- Unified inbox combining WhatsApp + email in a single thread view
- AI-suggested reply drafts based on conversation context

---

### 10. Automations — 75%

**Route:** `/dashboard/automations`
**Utility:** Configure trigger-based follow-up rules that run automatically without agent intervention.

**Key Features:**
- Automated follow-up reminders: cold leads (3 days), new leads (1 day), stale qualified (7 days)
- Per-agent digest email via Resend grouping all overdue leads into one notification
- Schedule toggle + "Run Now" button; config persisted in `tenant.settings`

**Remaining:**
- Visual trigger/action builder UI
- Multi-channel automation combining WhatsApp and email in one flow
- A/B testing for follow-up message variants

---

### 11. Routines — 85%

**Route:** `/dashboard/routines`
**Utility:** Multi-step AI-powered workflow engine — chain data fetches, AI summaries, emails, WhatsApp messages, and record updates into repeatable routines.

**Key Features:**
- 9 live step handlers: `fetch_data` (real DB), `ai_summarise` (OpenRouter Llama 3.3), `send_email` (Resend), `send_whatsapp` (Meta API), `ai_score_leads`, `update_records`, `generate_pdf`, `group_by`, `create_task`
- Shared context dict passes data between steps; execution returns `{ success, output_summary, actions_log, duration_ms }`
- `RoutineExecutor` class handles live execution via `execute()` method per routine run

**Remaining:**
- Visual drag-and-drop step builder
- Cron-based scheduling for routine triggers

---

### 12. Vendors — 85%

**Route:** `/dashboard/vendors`
**Utility:** Manage your full supplier network with profiles, pricing, and access to a cross-tenant DMC marketplace.

**Key Features:**
- Rate Card CSV/Excel import: flexible column alias matching, pandas parser, upsert logic, import summary
- DMC Rate Marketplace: browse cross-tenant public rates (cost_net masked), snap rates to own library
- Child pricing fields (`cost_net_child`, `child_age_min/max`) and flat markup override (`markup_amount`)

**Remaining:**
- Vendor performance scoring based on booking history
- Automated RFQ (Request for Quotation) workflow

---

### 13. Content — 70%

**Route:** `/dashboard/content`
**Utility:** Shared library of destination pages, image assets, and copywriting blocks for faster itinerary production.

**Key Features:**
- Pexels image search with quick-search chips; saves selected image as `MediaAsset` record
- NAMA Master Library with 10 shared, curated destinations seeded at launch
- AI Enhance button on destination editor; "Use in itinerary" clipboard shortcut on content blocks

**Remaining:**
- Video asset support
- Multi-language content variants per destination
- Content usage analytics (how often each block is used in itineraries)

---

### 14. Reports — 75%

**Route:** `/dashboard/reports`
**Utility:** Analyse team performance and business KPIs with sortable per-agent breakdowns.

**Key Features:**
- 4 summary KPI cards + sortable agent performance table with leads, quotes, bookings, revenue, and conversion %
- Crown badge highlighting top-performing agent of the period
- Live data from `GET /api/v1/analytics/team-performance`; seed fallback for demo mode

**Remaining:**
- Date-range and period filtering on all metrics
- Exportable CSV and PDF report download
- Cohort and funnel analysis views

---

### 15. Integrations — 70%

**Route:** `/dashboard/integrations`
**Utility:** Connect NAMA to external tools via outbound webhooks, social platforms, and third-party CRM connectors.

**Key Features:**
- Outbound Webhooks: HMAC-SHA256 signed payloads, 8 events including `lead.created`, `lead.status_changed`, `booking.confirmed`
- Facebook Lead Ads + Instagram DM inbound (Meta webhook verification, HMAC validation, lead auto-creation)
- Social Media tab with guided setup cards for Facebook and Instagram connections

**Remaining:**
- Native Zapier app listing in Zapier marketplace
- Google Sheets two-way sync
- Slack and Microsoft Teams notifications

---

### 16. Widget — 90%

**Route:** `/dashboard/widget`
**Utility:** Self-contained embeddable JavaScript widget for any website — drops in with one script tag, captures leads directly into NAMA.

**Key Features:**
- `public/widget.js`: IIFE, reads `data-token` + `data-color` + `data-label`; floating button + modal with full lead form; POSTs to `/api/v1/capture/lead?token=`
- Dashboard: color picker, embed code with one-click copy, live test preview, token regeneration
- Rate limited: 10 submissions per IP per hour; tenant resolved via `capture_token` in tenant settings

**Remaining:**
- Multi-step qualification flow within the widget
- Submission analytics dashboard (impressions, conversion rate)

---

### 17. Org & Control — 80%

**Route:** `/dashboard/org`
**Utility:** Full organisational control room — manage team structure, roles, permissions, and view founder-level intelligence in one place.

**Key Features:**
- Tab 1 Founder Intelligence: KPI cards, AI revenue-leak banner, agent leaderboard, risk feed
- Tab 3 Role Builder: 6-role selector + 22-permission toggle matrix; inline role creation wired to `POST /api/v1/roles`
- Tab 4 Team Management: inline invite, table with filters, bulk actions, per-member context menus

**Remaining:**
- Approval workflows (multi-level quote approval chains)
- Activity feed per team member

---

### 18. Copilot — 65%

**Route:** Floating widget (available on all dashboard pages)
**Utility:** Contextual AI assistant that answers questions, scores leads, and surfaces actionable suggestions inline.

**Key Features:**
- Floating AI bubble with Paperclip context attachment (attach leads, itineraries, or quotations)
- AI Lead Scoring: `POST /api/v1/copilot/score-lead` with LLM scoring via OpenRouter + heuristic fallback
- Agency config generation: `POST /api/v1/copilot/generate-config` creates `AgencyConfig` JSON DSL from plain-text description

**Remaining:**
- Persistent conversation history across sessions
- Proactive surface suggestions based on pipeline state and deadlines
- Voice input mode (deferred to V6)

---

### 19. Holidays — NEW

**Route:** `/dashboard/holidays`
**Utility:** Holiday package catalogue — create, price, and publish fixed-departure group travel packages.

**Status:** Freshly built this sprint. Full feature detail to be documented in next sprint update.

---

### 20. Intel — NEW

**Route:** `/dashboard/intel`
**Utility:** Intelligence Hub — aggregated market signals, pricing benchmarks, and competitor insights for strategic decision-making.

**Status:** Freshly built this sprint. Full feature detail to be documented in next sprint update.

---

*This document is the living module reference for NAMA OS. Updated every sprint. For deployment context, see `DEVELOPER_HANDOVER.md`. For screen-level routes, see `SCREENS_INVENTORY.md`.*
