# NAMA: Networked Autonomous Marketplace Architecture
## Developer Handoff & Technical Blueprint (v3.0)

This document serves as the master technical guide for the NAMA Travel OS. It consolidates the architecture, data models, AI agent logic, and deployment workflows required to bring the platform from prototype to production.

---

### 1. Executive Summary
**NAMA** is an AI-native travel operating system that automates discovery, contracting, pricing, and fulfillment across global travel supply. 
*   **Primary Users:** DMCs (Destination Management Companies), Tour Operators, Travel Agencies.
*   **Core Goal:** 80%+ reduction in manual operations and < 2 min automated quotation generation.
*   **Key Design Philosophy:** "Autonomous-first" — the system replaces manual tasks using a swarm of 10 specialized AI agents.

---

### 2. Technical Stack
*   **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Framer Motion (for Kinetic animations).
*   **Backend:** FastAPI (Python 3.11+), Pydantic v2.
*   **Database:** PostgreSQL (with Row Level Security for multi-tenancy) + Pinecone (Vector DB for semantic supply search).
*   **AI Orchestration:** LangChain / LangGraph (Orchestrating Claude 3.5 Sonnet & GPT-4o fallback).
*   **Infrastructure:** AWS/GCP (Multi-region ready for data residency).

---

### 3. Architecture Overview
NAMA uses a **Modular Monolith** architecture designed for event-driven autonomous workflows.

#### 3.1 The 5-Level Hierarchy (L1-L5)
The multi-tenancy model is strictly enforced via `tenant_id` at the database level:
*   **L1 - NAMA Owner:** Platform-wide oversight.
*   **L2 - Super Admin:** Support and onboarding.
*   **L3 - Travel Company (The Org):** Primary billing unit (DMC/Agency).
*   **L4 - Internal Agents:** Employees of the L3 entity.
*   **L5 - External Sub-Agents:** Affiliates with white-label portal access.

#### 3.2 The 13 Core Modules (M1-M13)
All modules are implemented as independent service logic in the backend:
1.  **M1-M3:** Query Triage, Lead CRM, and Autonomous Quotation.
2.  **M4:** AI Document OCR (Passport/Visa).
3.  **M5:** Unified Client Comms (WhatsApp/Email).
4.  **M6-M7:** Global Supply Adapters (Amadeus/TBO) & Booking Lifecycle.
5.  **M8:** Itinerary Intelligence (Bento-grid engine).
6.  **M9:** Analytics & KPI Reporting.
7.  **M10:** White-Label Portal (CNAME support).
8.  **M11:** Financial Ledger (Real-time P&L).
9.  **M12:** Content & Media Asset Management.
10. **M13:** Corporate PO & Fixed Departures.

---

### 4. AI Agent Swarm (The Intelligence Layer)
NAMA is driven by 10 specialized agents. Developers should focus on the `backend/app/agents/` directory for the following:
*   **Itinerary Agent:** Decomposes preferences into travel blocks.
*   **Supplier Bidding Agent:** Automates broadcasts and counter-negotiations.
*   **Query Triage Agent:** Extracts structured leads from raw WhatsApp/Email text.
*   **Finance Agent:** Performs real-time reconciliation and P&L monitoring.
*   **Document Agent:** Uses Vision OCR for passport and visa validation.

---

### 5. Data Model & Schema
Refer to `backend/app/models/` for SQLAlchemy definitions:
*   **`tenants`:** Multi-tenant root.
*   **`itineraries` / `itinerary_blocks`:** Recursive structure for travel plans.
*   **`bookings` / `booking_items`:** Lifecycle and vendor tracking.
*   **`corporate_pos`:** B2B budget and policy enforcement.
*   **`transactions`:** Double-entry ledger for financial accuracy.

---

### 6. Integration Strategy
*   **Supply Adapters:** Implement the `BaseAdapter` interface (found in `backend/app/adapters/base.py`) for all new suppliers. Currently includes Amadeus and TBO Group.
*   **Communication:** WhatsApp Business API (via webhooks) and SendGrid/Postmark for email.

---

### 7. Frontend & UI/UX
*   **Design System:** Apple-style minimalist aesthetic.
*   **Theme Config:** Located in `frontend/tailwind.config.js`.
*   **Bento-Grid:** The core UI pattern for itineraries (reusable components in `frontend/src/components/`).
*   **Kinetic Mode:** High-fidelity dark theme for the autonomous command center.

---

### 8. Deployment Roadmap (Handoff Instructions)
1.  **Environment Setup:** Copy `.env.example` to `.env` and configure API keys (Anthropic, OpenAI, Amadeus, TBO).
2.  **Database:** Run migrations using Alembic (`alembic upgrade head`).
3.  **Backend:** Deploy FastAPI to Heroku/DigitalOcean/AWS ECS.
4.  **Frontend:** Deploy Next.js to Vercel (preferred for App Router and Edge Middleware).
5.  **CDN:** Use AWS S3 + CloudFront for the Media Asset library (M12).

---

### 9. Future Scalability (Roadmap)
*   **Hybrid LLM:** Move sensitive enterprise workflows to local/private LLMs.
*   **Native Mobile:** Flutter/React Native wrapper for field agents (Phase 2).
*   **Advanced Reconciliation:** Integration with local payment gateways (Razorpay/Stripe) and FEMA-compliant remittance modules.

---
**Document Status:** Final (v3.0)
**Handover Date:** March 24, 2026
**Prepared By:** Ecommerce Mind Agent (NAMA Technical Lead)
