# NAMA OS — Visa Intelligence & Holiday Management Competitive Audit

**Audit Date:** 2026-04-20  
**Auditor:** Deep codebase + competitive research analysis  
**Scope:** `/dashboard/visas` and `/dashboard/holidays` — UI, backend endpoints, vs. Atlys and Travefy

---

## 1. Competitor Feature Matrix

### 1A. Visa Intelligence: NAMA vs. Atlys

| Feature | Atlys | NAMA OS | Gap |
|---|---|---|---|
| Visa checklist by nationality/destination | ✅ Dynamic, real-time, government-synced | ⚠️ Static mock (3 destinations hardcoded, fallback generic) | Critical |
| Passport OCR / data extraction | ✅ BoltOCR — 99.08% field accuracy, proprietary AI, runs in-house | ⚠️ Exists (`POST /upload/passport`) but broken — 405 response; no vision input to Claude | Critical |
| Real-time application status tracking | ✅ Live embassy sync, ETA, real-time updates | ❌ UI-only; all status is seed data (PENDING/APPROVED etc.) — no backend | Major |
| Bulk visa application (up to 500 at once) | ✅ One-click bulk apply | ❌ Not built | Major |
| Smart Document Vault (upload once, reuse) | ✅ Encrypted, AI-verified, 3-click repeat | ❌ Not built | Major |
| AI document verification (face match, photo standards) | ✅ Embassy lighting/background auto-adjust, face similarity | ❌ Not built | Major |
| Embassy API push / form submission | ✅ Automated form-fill, document submission | ❌ "Trigger Embassy Push" button is UI-only, no backend | Major |
| On-time delivery guarantee | ✅ 99.7% — full refund SLA | ❌ Not applicable (NAMA doesn't process visas itself) | N/A |
| Application priority queue | ✅ | ⚠️ UI only — no persistence | Moderate |
| Processing time analytics | ✅ | ⚠️ UI only — hardcoded seed analytics | Moderate |
| Group/family visa management | ✅ Up to 1,000 travelers per account | ❌ Not built | Major |
| GST invoicing for B2B agents | ✅ Automatic B2B invoices | ❌ Not built for visa module | Moderate |
| 24/7 concierge support integration | ✅ | ❌ Emergency button is UI-only | Minor |
| Country wait-time heatmap | ❌ | ✅ NAMA has this (UI-only but designed) | NAMA ahead |
| Compliance analytics tab | ❌ | ✅ NAMA has per-status breakdown UI | NAMA ahead |
| AI Policy Pulse / real-time alerts | ❌ | ⚠️ NAMA has UI panel — no live data | Nominal |

### 1B. Holiday Management: NAMA vs. Travefy

| Feature | Travefy | NAMA OS | Gap |
|---|---|---|---|
| Package catalogue (create/edit) | ✅ Itinerary builder, proposals, drag-drop | ✅ UI built — catalogue, form, departure dates | Moderate (no backend) |
| Multi-departure calendar | ✅ Group departures, dates, availability | ✅ UI built — calendar view, date dots, seat bars | Moderate (no backend) |
| Seat availability / inventory | ✅ Real-time from suppliers | ⚠️ UI-only, seed data only | Major |
| Client-facing booking / proposal | ✅ Shareable links, client approval flow | ❌ No public booking URL for packages | Major |
| CRM + client management | ✅ Built-in per booking | ⚠️ Bookings table is UI-only seed data | Major |
| Payment collection | ✅ Online payment links, commission tracking | ❌ No payment integration in Holiday module | Major |
| Smart Import (PDF/email → package) | ✅ AI parses PDFs, confirmation emails | ❌ Not built | Major |
| Supplier integrations (200+ suppliers) | ✅ 60+ cruise lines, 40+ tour operators | ❌ Not built (Amadeus/Bokun adapters exist but unused in Holiday) | Major |
| White-label client mobile app | ✅ (Travefy-branded; white-label costs extra) | ✅ Customer Portal exists at `/portal/[bookingId]` | Moderate |
| Package duplication | ✅ | ✅ "Duplicate" button — UI only | Minor |
| Cancellation policy tiers | ✅ | ✅ Flexible/Moderate/Strict — UI only | Minor |
| Child/infant pricing tiers | ✅ | ✅ UI form has adult/child/infant fields | Moderate |
| Single supplement pricing | ✅ | ✅ UI form | Minor |
| Markup calculator | ❌ | ✅ Slider with live sell price preview — unique feature | NAMA ahead |
| Inclusions matrix (flights/hotel/meals/etc.) | ✅ | ✅ Toggle chips — UI only | Moderate |
| Revenue per departure dashboard | ✅ | ✅ UI-only in calendar side panel | Moderate |
| 30-day departure pipeline view | ✅ | ✅ "Upcoming 30 Days" table — UI only | Moderate |
| Export bookings | ✅ | ⚠️ "Export" button wired to nothing | Moderate |
| Commission tracking | ✅ | ❌ Not built | Major |
| Automated client reminders | ✅ | ❌ Not in Holiday module | Moderate |
| Group collaboration / voting | ✅ | ❌ Not built | Minor |
| Marketing landing pages per package | ✅ | ❌ Not built | Major |

---

## 2. NAMA Current State — Honest Assessment

### 2A. Visa Intelligence (`/dashboard/visas`)

**What is built (frontend):**
- Complete "Visa Specialist Intelligence Hub" UI — arguably the most visually impressive page in the product
- Left sidebar with queue/priority/archived/policy/performance/settings nav
- Application queue table with traveler cards, AI doc score column, status badges, filtering
- Right-side "AI Real-time Analysis" panel with scanning animation and passport mock overlay
- Document checklist modal with per-document pass/fail indicators
- Global compliance heatmap (CSS + dots, 10 countries, hover tooltips with wait days)
- Analytics tab with status breakdown charts and AI performance stats

**What is built (backend):**
- `GET /api/v1/documents/visa-checklist?nationality=&destination=` — returns checklist, but backed by a 3-entry static dictionary; any destination outside UAE/Thailand/Singapore gets a generic 3-item list. No LLM, no real-time data.
- `POST /api/v1/documents/upload/passport` — handler exists in code but returns 405 (Method Not Allowed) in production, likely because the route expects a query param (`image_url`) but the frontend would send multipart. Not functional.

**What is NOT connected:**
- Every single button in the visa UI (Embassy Push, Request Documents, Finalize Application, Emergency Support) fires nothing
- Application status is hardcoded seed data — no database model for visa applications exists
- The "AI verification score" is a static property on each seed row — no inference runs
- Passport scanning animation is cosmetic only
- The analytics tab serves hardcoded numbers (1,240 throughput, 99.9% accuracy)

**Backend models for visa:** Zero. There is no `visa_application`, `passport`, or `document_checklist` table in any migration file.

### 2B. Holiday Management (`/dashboard/holidays`)

**What is built (frontend):**
- 4-tab layout: Package Catalogue, Departures Calendar, Package Bookings, Create Package
- Package Catalogue: card grid with gradient headers, inclusions chips, seat fill bar, departure dates
- Departures Calendar: full monthly calendar with dot markers per departure, right panel with revenue/passenger details
- Package Bookings: sortable table with booking ID, customer, payment status, KPI strip
- Create Package form: full form with pricing, inclusions toggle matrix, departure date management, markup slider

**What is built (backend):**
- Zero endpoints. Literally nothing. No routes registered in `main.py` or any router for `/holidays`, `/packages`, or `/departures`.

**What is NOT connected:**
- "New Package" → `handleSave()` calls `setSaved(true)` — purely local state. Nothing persists.
- "Publish Package" → sets React state to ACTIVE, never calls an API.
- The entire bookings table is `SEED_BOOKINGS` — 15 fake records defined inline.
- Package stats (7 active packages, 15 bookings) are computed from seed arrays.
- "Export" button is rendered but calls nothing.
- Edit and view booking buttons have click handlers that do nothing beyond icon display.

**Backend models for holidays:** Zero. No `holiday_package`, `package_departure`, or `package_booking` table exists.

---

## 3. Gap Analysis Summary

### Visa Intelligence — Priority Gaps

| Priority | Gap | Why It Matters |
|---|---|---|
| P0 | No database model — no persistence | Every visa case is lost on page reload |
| P0 | `POST /upload/passport` broken (405) | Core promised feature fails silently |
| P0 | Visa checklist returns static 3-destination dict | Indian agents query 50+ destinations daily |
| P1 | Embassy push / status tracking are empty buttons | Agents will try to use them, find nothing |
| P1 | No bulk application support | Atlys's strongest B2B selling point |
| P2 | Smart Document Vault not architected | Repeat-traveler workflow missing |
| P2 | Group visa management absent | High-value group tour use case unserved |
| P3 | Analytics shows hardcoded data | Metrics screen is misleading |

### Holiday Management — Priority Gaps

| Priority | Gap | Why It Matters |
|---|---|---|
| P0 | Zero backend — no CRUD for packages | Feature is pure demo, not shippable |
| P0 | No persistence — "Save Package" saves nothing | Will confuse or anger first users |
| P1 | No public booking URL for packages | Agents cannot send packages to clients |
| P1 | No payment collection | Revenue cannot flow through the module |
| P2 | No supplier integrations for package content | Manual data entry kills adoption |
| P2 | No commission tracking | Core metric for agency economics |
| P2 | Export button non-functional | Basic ops workflow broken |
| P3 | No automated client reminders for departures | Missed upsell / reminder opportunity |

---

## 4. Prioritized Roadmap to Reach Competitive Parity

### Phase A — Make Features Honest (1–2 days each)

These stop the product from actively misleading users.

1. **[1 day] Wire visa checklist to LLM.** Replace the 3-entry dictionary in `get_visa_checklist()` with a call to OpenRouter (Llama 3.3 via existing `call_agent_with_controls` pattern). Prompt: "You are a visa expert. Return a JSON checklist of requirements for a {nationality} passport holder visiting {destination}. Include document list, processing time estimate, fee estimate, visa-on-arrival/e-visa flag." Costs ~$0.0002/call.

2. **[0.5 days] Fix passport upload (405 bug).** Change `POST /upload/passport` signature from `image_url: str` (query param) to a `UploadFile` body parameter. Update the claude call to describe the file, not pass it directly (vision not yet supported via `call_agent_with_controls`). Make it return a structured mock until vision is wired.

3. **[1 day] Holiday backend skeleton — CRUD.** Create `HolidayPackage` SQLAlchemy model (id, tenant_id, name, destination, nights, days, price_adult, price_child, price_infant, single_supplement, inclusions, status, description, cancellation_policy, markup_pct, created_at). Add Alembic migration. Add `GET/POST /api/v1/holidays/packages`, `PUT/DELETE /api/v1/holidays/packages/{id}`. Wire the Create Package form's save button to `POST`.

4. **[1 day] Package Departures model + API.** Create `PackageDeparture` model (id, package_id, departure_date, total_seats, booked_seats). Add `GET/POST /api/v1/holidays/packages/{id}/departures`. Wire the calendar to fetch real data.

5. **[0.5 days] Package Bookings model + API.** Create `PackageBooking` model (id, package_id, departure_id, tenant_id, customer_name, email, pax_count, total_amount, payment_status, booked_on). Add `GET/POST /api/v1/holidays/bookings`. Wire bookings table to fetch from DB.

### Phase B — Close Critical Atlys Gaps (2–5 days each)

6. **[2 days] Visa Application database model.** Create `VisaApplication` table (id, tenant_id, lead_id, traveler_name, destination, visa_type, status, passport_expiry, doc_score, submitted_date, travel_date, priority, notes). Wire all CRUD endpoints. The visa queue table then shows real data.

7. **[1 day] AI document score — real inference.** When a visa application is created, fire `POST /api/v1/copilot/score-visa` (new endpoint) that calls OpenRouter with traveler details + document checklist completion. Store score in `VisaApplication.doc_score`. Show real score in queue table.

8. **[2 days] Public package booking page.** Create `/packages/[id]` public route (similar to `/portal/[bookingId]`). Show package details, departure calendar, pax selector, price calculator. Add `POST /api/v1/holidays/bookings` with Razorpay payment link generation (existing `create-link` endpoint). This closes Travefy's client-facing booking gap.

9. **[1 day] Wire visa checklist to real destination database.** Extend `get_visa_checklist()` to cache LLM responses per nationality+destination pair in `tenant.settings` JSONB. Populates fast after first query. Serves 100+ destinations without repeated API calls.

10. **[2 days] Bulk visa import.** Add `POST /api/v1/documents/visa-bulk-import` — accepts CSV with traveler list (same pandas pattern as lead import). Creates `VisaApplication` rows in bulk. Add "Import Travelers" button to visa page. Directly closes Atlys's bulk application gap.

### Phase C — Growth Features (5+ days each)

11. **Smart Document Vault.** `PassportDocument` model (id, tenant_id, lead_id, passport_number, extracted_data JSONB, verified_at, expiry_date). Store extracted passport data per lead. Auto-fill visa applications for returning travelers.

12. **Package marketing page generator.** Allow agent to generate a shareable URL for a package (like Travefy's landing pages). Use existing content library for images. WhatsApp-shareable link with OG preview.

13. **Commission tracking on holiday bookings.** Add `commission_rate`, `commission_amount`, `commission_paid_at` to `PackageBooking`. Show in finance dashboard. Wire into Reports page agent performance table.

14. **Departure reminder automation.** Extend existing `POST /api/v1/automations/run-reminders` to also scan upcoming package departures. Send WhatsApp/email reminders to confirmed pax 7 days before departure.

15. **Real-time embassy processing time.** Integrate a public visa API (e.g., Sherpa, iVisa API, or scrape consulate pages). Store processing time estimates per destination. Power the heatmap with real wait-day data.

---

## 5. Quick Wins (Achievable in 1–2 days)

These are high-signal, low-effort improvements that make NAMA look credible immediately:

| Item | Effort | Impact |
|---|---|---|
| Wire visa checklist to LLM (OpenRouter, existing pattern) | 4 hours | Transforms a 3-destination stub into a global tool |
| Holiday backend skeleton (package CRUD + migration) | 1 day | Makes "Create Package" actually save |
| Fix 405 on passport upload (change param signature) | 2 hours | Stops a broken endpoint from surfacing in demos |
| Add `data-tour` targets to visa and holiday pages | 1 hour | Product tour coverage on new modules |
| Replace hardcoded analytics numbers with DB queries | 4 hours | Analytics tab goes from "lies" to "live" |
| Wire "Export" button in bookings to CSV download | 2 hours | Trivial to implement, expected by every agent |
| Disable "Embassy Push" button with tooltip "Coming soon" | 30 mins | Stops agent confusion when clicking a dead button |
| Add EmptyState to visa queue when no applications | 1 hour | Graceful UX instead of empty table |

---

## 6. What NAMA Does Well (Honest Assessment)

- **UI design quality:** The visa hub is genuinely the most sophisticated-looking page in the product. The three-panel layout (sidebar + main + AI analysis pane), the scanning animation, the heatmap, and the AI verification widget are all more polished than Atlys's utilitarian interface.
- **Markup calculator:** The holiday package creation form's markup slider with live sell-price preview is not available in Travefy. Genuinely useful for agents setting margins.
- **Seat fill bar per departure:** Visual urgency indicator on cards (green → amber → red) is clean and actionable.
- **Departures calendar with revenue overlay:** Clicking a date shows revenue + passenger list in a side panel — a genuinely useful operational view.
- **Compliance heatmap concept:** Country-level wait time visualization is a differentiated feature. Atlys doesn't do this. With real data, this could be a compelling feature.
- **All-in-one context:** NAMA connects visas to leads, itineraries, and bookings in one platform. Atlys is visa-only. Travefy has no visa module at all. This integration story is NAMA's strongest competitive angle once the backends exist.

---

## 7. Competitive Positioning Summary

| Dimension | Atlys | Travefy | NAMA OS |
|---|---|---|---|
| Visa processing | World-class | None | Compelling UI, minimal backend |
| Holiday/package management | None | Strong | Impressive UI, zero backend |
| CRM + lead management | None | Basic | Strong (V1–V2 complete) |
| AI-native workflows | Strong (BoltOCR) | Limited (Smart Import) | Promising (OpenRouter wired, no visa/holiday AI yet) |
| Pricing | Pay-per-visa, no monthly fee | $39–$59/month | Unclear (not on landing page) |
| Indian market fit | High (B2B GST invoicing, INR) | Low (US-focused) | High (INR pricing, Indian destinations in seed data) |
| Backend completeness (visa) | 100% | N/A | ~5% |
| Backend completeness (holiday) | N/A | ~80% | 0% |

**Bottom line:** NAMA has built the most ambitious UI in both modules but neither feature is shippable in its current state. The fastest path to parity is: (1) wire the holiday CRUD backend in 1 day, (2) wire visa checklist to LLM in 4 hours, (3) fix the 405 passport bug in 2 hours. These three tasks alone would transform both pages from "impressive demo" to "minimum viable feature."

---

*Report generated: 2026-04-20 | Based on codebase audit of `/sessions/loving-eager-wright/mnt/nama-frontend` + competitive research*
