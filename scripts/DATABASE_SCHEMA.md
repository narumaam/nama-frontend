# NAMA: Database Schema (v3.0 Extended)

## 1. Multi-Tenancy (L1-L5)
*   `tenants`: `id`, `parent_id` (for sub-agents), `name`, `type` (DMC, AGENCY, CORPORATE), `base_currency`, `org_code`, `status`.
*   `users`: `id`, `tenant_id`, `email`, `role` (R0-R7), `status`, `profile_data` (JSONB).

## 2. Core Modules Schema

### M1/M2: Leads & Queries
*   `queries`: `id`, `tenant_id`, `source` (WHATSAPP, EMAIL), `raw_content`, `extracted_data` (JSONB), `status`.
*   `leads`: `id`, `tenant_id`, `assigned_agent_id`, `status` (NEW, QUOTED, WON, LOST), `confidence_score`.

### M3/M8: Itineraries & Quotes
*   `itineraries`: `id`, `lead_id`, `tenant_id`, `title`, `duration`, `versions` (JSONB).
*   `itinerary_days`: `id`, `itinerary_id`, `day_number`, `description` (AI narrative).
*   `itinerary_blocks`: `id`, `day_id`, `type` (HOTEL, TRANSFER, ACTIVITY, FLIGHT), `vendor_id`, `cost_net`, `price_gross`, `currency`.

### M6: Supplier & Marketplace
*   `vendors`: `id`, `tenant_id`, `name`, `grade` (A, B, C), `category`, `kyc_status`.
*   `vendor_rates`: `id`, `vendor_id`, `product_name`, `base_price`, `currency`, `effective_from`, `effective_to`.

### M11/M13: Financials & Corporate
*   `transactions`: `id`, `tenant_id`, `booking_id`, `type` (INFLOW, OUTFLOW), `amount`, `currency`, `status`.
*   `corporate_pos`: `id`, `tenant_id`, `po_number`, `budget_threshold`, `approval_chain` (JSONB).

## 3. System Health & AI Cost
*   `ai_usage_logs`: `id`, `tenant_id`, `user_id`, `agent_type`, `tokens_used`, `cost_usd`, `timestamp`.
*   `ai_budgets`: `tenant_id`, `daily_cap_tokens`, `monthly_cap_usd`.
