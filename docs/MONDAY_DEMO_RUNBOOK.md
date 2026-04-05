# NAMA Monday Demo Runbook

> Superseded by [HOSTED_DEMO_PACKAGE.md](/Users/radhika/Documents/New%20project/nama-live/docs/HOSTED_DEMO_PACKAGE.md) for the final hosted-demo path.

This runbook is the safe, repeatable demo path for Monday afternoon.

## Objective

Show NAMA as an AI-native travel operating system that can take a raw travel lead, convert it into structured intent, present a commercial deal view, and show operator control without depending on live third-party credentials.

## Demo Principle

Use deterministic demo cases only. Do not present external supplier, payment, WhatsApp, or email integrations as live production connections.

## Route Order

1. Landing page  
   https://nama-frontend.vercel.app/

2. Register  
   https://nama-frontend.vercel.app/register

3. Dashboard  
   https://nama-frontend.vercel.app/dashboard

4. Leads  
   https://nama-frontend.vercel.app/dashboard/leads

5. Deal workspace  
   https://nama-frontend.vercel.app/dashboard/deals?lead=1

6. Ekla autonomous operator
   https://nama-frontend.vercel.app/dashboard/ekla

7. Autopilot  
   https://nama-frontend.vercel.app/dashboard/autopilot

8. Kinetic command center  
   https://nama-frontend.vercel.app/kinetic

## Optional Appendix

If time remains after the core walkthrough, show the DMC and control surfaces as the platform-operator layer.

1. Super Admin control tower
   https://nama-frontend.vercel.app/dashboard/admin

2. Team & Access appendix
   https://nama-frontend.vercel.app/dashboard/team

3. DMC contract workspace
   Use the DMC surface to show messy contract intake, supplier communication, and operations handoff.

Why this matters:

- One company can be a travel agent, DMC, and tour operator at the same time.
- The platform should let the entity shape its own nomenclature, hierarchy, teams, and responsibilities.
- Contract files do not arrive standardized. They come as PDFs, scans, emails, images, and chat attachments.
- Supplier communication should cover hotels, guides, car or cab vendors, drivers, city tours, and activity companies.

## Fast Demo Timing

- Homepage: 45-60 seconds
- Register: 20-30 seconds
- Dashboard: 30-45 seconds
- Leads: 45-60 seconds
- Deals: 2-3 minutes
- Ekla: 45-60 seconds
- Autopilot: 45-60 seconds
- Kinetic close: 30-45 seconds

## Primary Demo Case

Use `maldives-honeymoon` as the main storyline.

Why this case:

- strongest premium positioning
- clean commercial story
- quote, itinerary, and follow-up all read well live

Fallback cases:

- `dubai-bleisure`
- `kerala-family`

## Omnichannel Capture Talk Track

Use this exactly on the homepage and leads sections.

"NAMA captures demand from every commercial channel the travel team already uses. That includes the website form, phone conversations converted into a sales transcript, inbound email, WhatsApp as the messaging rail, and manually pasted sales transcripts from the team. The point is not the channel. The point is that every raw inquiry becomes one structured operating object."

If asked to break that down:

- Website: "A web inquiry enters the same operating flow immediately."
- Phone: "A call summary or agent-entered transcript is treated as structured sales input."
- Email: "An inbound email is parsed into destination, dates, budget, and intent."
- WhatsApp placeholder: "WhatsApp is represented in the demo workflow, but not presented as a live production connection."
- Sales transcript: "Any freeform transcript can be dropped into the same triage engine and normalized."

## DMC Appendix Talk Track

Use this only after the core lead-to-deal flow is already stable.

"This platform is also built for DMCs. That means one business can operate as a travel agent, a DMC, and a tour operator at the same time. Their contracts are rarely standardized, so the DMC workspace is designed to intake messy files and supplier notes, normalize the important parts, and keep the supplier conversation moving."

If you want to break that down:

- Contracts: "PDFs, scans, emails, screenshots, and Word docs all belong in the same intake lane."
- Normalization: "The demo shows AI-assisted extraction of the practical fields, but we do not claim live OCR perfection."
- Travel agents: "The same workspace can send the cleaned outcome back to the agent side of the business."
- Operations: "The ops team can keep a clear thread for hotels, guides, cab owners, drivers, city tours, and activity vendors."
- Safe wording: "Use 'demo-safe contract normalization' and 'supplier ops handoff' rather than claiming live provider automation."

## Recommended 5-7 Minute Flow

### 1. Open on the landing page

Route:

`/`

Message:

"NAMA is an AI-native operating system for travel teams. This walkthrough shows how a raw lead becomes a structured, commercial travel workflow."

Action:

- open the homepage
- point to the system status and core positioning
- say the omnichannel capture talk track
- scroll to the live demo section
- select the `Maldives Honeymoon` preset

### 2. Show lead triage

Route:

`/#demo`

Message:

"We start with a raw inquiry. NAMA converts this into structured travel intent instantly: destination, duration, style, guest context, and a suggested reply."

Action:

- use the Maldives preset
- let the triage result populate

Fallback if this section is slow:

"The homepage triage widget is the lightest demo surface, so if it lags for a second the workflow is still the same: raw inquiry in, structured lead out. I’ll move into the operator workspace where the same case is already loaded."

### 3. Open register

Route:

`/register`

Message:

"This is not just a signup screen. It is the onboarding layer: what kind of business this is, which market it serves, and how the workspace should behave before live credentials are connected."

Action:

- show the company name and operator fields
- point to the hybrid business profile selection: travel agency, DMC, tour operator
- point to country-aware defaults: language, base currency, additional currencies, and gateway routing
- mention that FX can come from the currency converter API, with a safety buffer or a manual locked rate if the business prefers
- keep it to 30-45 seconds, then enter the demo workspace

Fallback if unavailable:

"Registration is just the front door. The important part is the operating workspace behind it, so I’ll move straight into the dashboard."

### 4. Move into the dashboard

Route:

`/dashboard`

Message:

"The dashboard turns those AI outputs into operator-ready business objects."

Action:

- show the dashboard briefly
- keep moving

Fallback if this section is slow:

"The dashboard is the portfolio view. The real commercial depth is in the case workspace, so I’ll move directly into leads and the live deal."

### 5. Open leads

Route:

`/dashboard/leads`

Message:

"This is where omnichannel demand becomes a working sales pipeline. The same Maldives case now exists as a sales object instead of just a message."

Action:

- open the leads page
- highlight the same case continuity

Fallback if this section is slow:

"The leads layer is mainly proving continuity. I’ll jump into the live deal where the commercial picture is fully assembled."

### 6. Open the deal workspace

Route:

`/dashboard/deals?lead=1`

Message:

"This is the center of gravity for the demo. In one place, the team sees guest context, itinerary, pricing, margin, deposit timing, communications, and execution status."

Action:

- open `/dashboard/deals?lead=1`
- show quote total
- show cost and margin
- show itinerary
- show suggested follow-up

Fallback if this section is slow:

"The deal view is the most important screen in the system. If one panel is slow, the operating logic is still visible here: guest context, itinerary, commercials, and follow-up are unified in one workspace."

### 7. Open autopilot

Route:

`/dashboard/autopilot`

Message:

"This is where NAMA becomes operating software, not just workflow software. The system surfaces what it has already reasoned through and what still needs an operator."

Action:

- keep this section short
- treat it like a control room

### 7A. Optional but recommended: show Ekla before Autopilot

Route:

`/dashboard/ekla`

Message:

"This is the impact statement behind NAMA. Ekla is the autonomous agency operator. It captures routine work, assembles the commercial response, sequences follow-up, and only escalates what still needs human judgment."

Action:

- open `/dashboard/ekla`
- point to the four operating loops
- use the phrase "human only where needed"
- then move to Autopilot as the visible control room for what Ekla has prepared

Fallback if time is short:

"Ekla is the conceptual and operating layer that lets the agency run itself. Autopilot is the operator-facing surface of that same idea, so I’ll move there directly."

Fallback if this section is unavailable:

"Autopilot is the orchestration layer, but the core idea is already visible in the deal workspace. I’ll close on the command-center view."

### 8. Close on kinetic

Route:

`/kinetic`

Message:

"The value is not just itinerary generation. It is the operating layer: lead, itinerary, commercial visibility, and execution confidence in one system."

Action:

- open the kinetic view
- close on system orchestration and readiness

Fallback if unavailable:

"Kinetic is the visual command-center layer. The commercial story is already complete without it: NAMA captured the lead, structured it, turned it into an itinerary, priced it, and prepared the follow-up."

## Safe Language

Use:

- "deterministic operating cases"
- "demo-safe workflow"
- "production workflow shown with controlled data"
- "integration-ready architecture"

Avoid:

- "These are live Amadeus results"
- "Payments are fully live"
- "WhatsApp is sending in production"
- "This system is self-optimizing in production today"

## If You Get Asked About Integrations

Use this answer:

"The demo uses deterministic travel cases so the workflow is stable. The platform is already structured for live providers like Amadeus, TBO, Bokun, payments, and messaging, and those are enabled by credentials and provider approvals."

## Emergency Fallback

If any page feels slow or awkward, return to:

- homepage demo section
- deals page
- kinetic page
- admin control tower
- team appendix

## Optional Admin Appendix

Only show this if the main flow is already smooth and time remains.

Route:

`/dashboard/team`

Use this message:

"After the commercial workflow, the next question is usually admin control. This appendix shows how a customer admin can invite users one by one, preview bulk imports, assign roles, define hierarchy, and map ownership without changing the core operating flow."

What to point at:

- individual invite preview
- bulk CSV import preview
- role matrix
- hierarchy from L1 to L5
- assignment board tying owners to live demo leads

Safe language:

- "demo-safe admin workspace"
- "customer admin control surface"
- "credential-independent access model"

Avoid:

- "live identity provisioning is already active"
- "bulk invites are sending in production right now"
- "RBAC is fully audited for enterprise today"

## Repeatable Smoke Check

Run this before Monday if you want a fast route and API check from the repo:

`bash scripts/monday_demo_smoke_check.sh`

That is enough to still tell a complete story.

## Fallback Matrix

| Section | Primary Route | If Slow or Unavailable | Use This Language |
|---|---|---|---|
| Homepage | `/` | Stay on hero, then go to deals | "The homepage is framing the operating model. I’ll move into the live workspace where the same case is already loaded." |
| Demo widget | `/#demo` | Skip to leads or deals | "The triage layer turns freeform demand into structure. That same output is already visible downstream, so I’ll move forward." |
| Register | `/register` | Skip entirely | "Registration is not the product story. The operating workflow is." |
| Dashboard | `/dashboard` | Skip to leads | "Dashboard is the portfolio layer. Leads and deals show the commercial depth more clearly." |
| Leads | `/dashboard/leads` | Skip to deals | "Leads proves continuity. The real value is how that lead becomes a priced deal." |
| Deals | `/dashboard/deals?lead=1` | Refresh once, then fall back to homepage preset + kinetic | "This is the key workspace. If one panel hangs, the operating logic remains the same: lead, itinerary, commercials, and follow-up in one place." |
| Autopilot | `/dashboard/autopilot` | Skip to kinetic | "Autopilot is the orchestration view. I’ll close on the command layer instead." |
| Kinetic | `/kinetic` | End on deals | "The command-center view is additive. The main business story is already complete in the deal workspace." |

## Live Validation Targets

These should return successfully before demo time:

- `/`
- `/register`
- `/dashboard`
- `/dashboard/leads`
- `/dashboard/deals?lead=1`
- `/dashboard/autopilot`
- `/kinetic`
- backend `/api/v1/health`
- backend `/api/v1/demo/cases`
