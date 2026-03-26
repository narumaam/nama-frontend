# NAMA: Networked Autonomous Marketplace Architecture
## Master Technical PRD (Updated v3.0)

### 1. Vision & Strategy
NAMA is an **AI-native travel operating system** designed to automate the full operational lifecycle of travel businesses (DMCs, Tour Operators, Agencies). 

**Core Goal:** 80%+ reduction in manual ops and **< 2 min** end-to-end quotation generation.

### 2. Platform Hierarchy (L1-L5)
NAMA implements a strict 5-level multi-tenancy model:
*   **L1 - NAMA Owner:** Platform configuration and global health.
*   **L2 - Super Admin:** Internal operations and tenant support.
*   **L3 - Travel Company Admin:** The primary billing unit (DMC/Agency).
*   **L4 - Sub Users/Agents:** Employees of the L3 entity.
*   **L5 - Sub-Agents/Partners:** External affiliates with white-label portal access.

### 3. Core Modules (M1-M13)
1.  **M1: Query Management:** Multi-channel capture (WhatsApp, Email).
2.  **M2: Lead Pipeline CRM:** Kanban sales funnel with AI scoring.
3.  **M3: Quotation Generator:** 3-tier (Budget/Standard/Luxury) assembly.
4.  **M4: Document Management:** Passport OCR and visa checklists.
5.  **M5: Client Communication:** Unified WhatsApp/Email threads.
6.  **M6: Supplier Registry:** KYC, AI grading, and rate sheet parsing.
7.  **M7: Booking Management:** Vouchers and lifecycle tracking.
8.  **M8: Itinerary Builder:** Drag-and-drop editor with AI narrative.
9.  **M9: Analytics & Reporting:** Real-time KPIs and forecasting.
10. **M10: White-Label Portal:** CNAME-ready client portals.
11. **M11: Finance Dashboard:** P&L per booking and cash forecasting.
12. **M12: Content Management:** Destination and image libraries.
13. **M13: Corporate & Fixed Departures:** PO workflows and seat inventory.

### 4. AI Agentic Layer (10 Specialized Agents)
NAMA uses a swarm of 10 specialized agents powered by **Claude 3.5 Sonnet** (Primary) and **OpenAI GPT-4o** (Fallback):
*   **Query Triage Agent:** Extracts structured leads from raw text.
*   **Lead Intelligence Agent:** Assigns conversion probabilities.
*   **Pricing Agent:** Assembles quotes from supplier rates.
*   **Document Agent:** Processes vision-based OCR for passports.
*   **Comms Agent:** Drafts personalized messages.
*   **Supplier Intelligence Agent:** Benchmarks rates and grades vendors.
*   **Finance Monitoring Agent:** Tracks real-time P&L and risk.
*   **Corporate Booking Agent:** Manages policy-compliant PO workflows.
*   **Itinerary Agent:** Generates day-by-day narratives.
*   **Analytics Agent:** Detects anomalies in business performance.

### 5. Compliance & Security
*   **RLS:** Row Level Security enforced by `org_id`.
*   **Privacy:** Compliance with GDPR and India DPDP Act 2023.
*   **Financials:** FEMA/RBI compliance for international remittances.
