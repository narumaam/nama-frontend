# NAMA Monday Demo Runbook

This runbook is the safe, repeatable demo path for Monday afternoon.

## Objective

Show NAMA as an AI-native travel operating system that can take a raw travel lead, convert it into structured intent, present a commercial deal view, and show operator control without depending on live third-party credentials.

## Demo Principle

Use deterministic demo cases only. Do not present external supplier, payment, WhatsApp, or email integrations as live production connections.

## Primary Demo URLs

1. Landing page  
   https://nama-frontend.vercel.app/

2. Demo section on landing page  
   https://nama-frontend.vercel.app/#demo

3. Dashboard  
   https://nama-frontend.vercel.app/dashboard

4. Leads  
   https://nama-frontend.vercel.app/dashboard/leads

5. Deal workspace  
   https://nama-frontend.vercel.app/dashboard/deals?lead=1

6. Autopilot  
   https://nama-frontend.vercel.app/dashboard/autopilot

7. Kinetic command center  
   https://nama-frontend.vercel.app/kinetic

## Primary Demo Case

Use `maldives-honeymoon` as the main storyline.

Why this case:

- strongest premium positioning
- clean commercial story
- quote, itinerary, and follow-up all read well live

Fallback cases:

- `dubai-bleisure`
- `kerala-family`

## Recommended 5-7 Minute Flow

### 1. Open on the landing page

Message:

"NAMA is an AI-native operating system for travel teams. This walkthrough shows how a raw lead becomes a structured, commercial travel workflow."

Action:

- open the homepage
- scroll to the live demo section
- point at the preset cases

### 2. Show lead triage

Message:

"We start with a raw inquiry. NAMA converts this into structured travel intent instantly: destination, duration, style, guest context, and a suggested reply."

Action:

- use the Maldives preset
- let the triage result populate

### 3. Move into the dashboard

Message:

"The dashboard turns those AI outputs into operator-ready business objects."

Action:

- show the dashboard briefly
- keep moving

### 4. Open leads

Message:

"This is where triaged demand becomes a working sales pipeline."

Action:

- open the leads page
- highlight the same case continuity

### 5. Open the deal workspace

Message:

"This is the center of gravity for the demo. In one place, the team sees guest context, itinerary, pricing, margin, deposit timing, communications, and execution status."

Action:

- open `/dashboard/deals?lead=1`
- show quote total
- show cost and margin
- show itinerary
- show suggested follow-up

### 6. Open autopilot

Message:

"This is where NAMA becomes operating software, not just workflow software. The system surfaces what it has already reasoned through and what still needs an operator."

Action:

- keep this section short
- treat it like a control room

### 7. Close on kinetic

Message:

"The value is not just itinerary generation. It is the operating layer: lead, itinerary, commercial visibility, and execution confidence in one system."

Action:

- open the kinetic view
- close on system orchestration and readiness

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

That is enough to still tell a complete story.

## Live Validation Targets

These should return successfully before demo time:

- `/`
- `/#demo`
- `/dashboard`
- `/dashboard/leads`
- `/dashboard/deals?lead=1`
- `/dashboard/autopilot`
- `/kinetic`
- backend `/api/v1/health`
- backend `/api/v1/demo/cases`

