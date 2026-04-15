# NAMA Operational Costs & External API Guide

### 1. Recurring Costs (Subscriptions)
Building the platform is a one-time effort, but running the "Intelligence" requires recurring payments to service providers.

| Service | Estimated Cost | Why you need it |
| :--- | :--- | :--- |
| **Claude AI (Anthropic)** | \$0.01 - \$0.03 per itinerary | Powers the "Brain" (Itinerary Gen, Bidding). |
| **Vercel (Frontend)** | \$20/mo (Pro) | Hosts your website. |
| **Railway (Backend)** | \$5 - \$10/mo | Hosts your AI logic and Database. |
| **WhatsApp Business** | \$0.01 per conversation | Message costs for lead capture. |

---

### 2. Live API Integration (TBO, Amadeus, Bokun)
The system currently uses "Sandboxes" (test modes). To go live, you must complete the following:

#### 2.1 TBO & Amadeus (Flights/Hotels)
*   **Approval:** You must apply for a **Production API Key**. 
*   **Deposit:** Most B2B aggregators (like TBO) require a financial deposit (e.g., \$500 - \$2,000) to start booking.
*   **Certification:** They may ask your developer to show a screen recording of how their API is used to ensure it follows their branding guidelines.

#### 2.2 Bokun Integration (Tours/Activities)
*   **Connection:** NAMA is ready to connect to **Bokun**. 
*   **How it works:** Your developer will use the `Bokun API` to sync your local inventory. This allows NAMA to pull your specific "contracts" directly from Bokun into the Itinerary Builder.

---

### 3. Hiring a Developer (Handoff Instructions)
When you are ready to hire a team, hand them the **`DEVELOPER_HANDOFF.md`** file. 
**Tell them:**
1.  The project is a **Next.js + FastAPI** stack.
2.  It uses **PostgreSQL** with RLS.
3.  The core logic is in the **`backend/app/agents/`** folder.
4.  Their first task should be moving the **Sandboxes to Production** for TBO and Amadeus.
