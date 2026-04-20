# NAMA OS — Dynamic Subscription Management: Implementation Plan

**Prepared:** 2026-04-20  
**Stack:** FastAPI + Neon PostgreSQL (backend) · Next.js 14 App Router (frontend)  
**Scope:** Plan definitions, tenant subscription management, pro-rata billing, Owner admin panel, Stripe integration recommendation

---

## 1. Research Summary: How Top SaaS Handles Plan Changes

### 1.1 Stripe Billing (Industry Standard)

Stripe's subscription API is the most widely copied model in SaaS billing. Key behaviors:

**Upgrades (moving to a higher-priced plan):**
- Effective **immediately** by default (`proration_behavior: "create_prorations"`)
- Stripe creates a proration credit for the unused portion of the current plan
- Stripe creates a proration charge for the new plan from today to the next billing date
- The net difference appears on the **next invoice** (or can be charged immediately with `billing_cycle_anchor: "unchanged"` + `payment_behavior: "default_incomplete"`)
- The `proration_date` parameter locks in the exact calculation moment to prevent race conditions

**Downgrades (moving to a lower-priced plan):**
- Stripe supports immediate downgrade with credit issuance, but most SaaS products override this behavior
- Best practice: schedule for **end of billing cycle** (`proration_behavior: "none"`, `effective_date: "next_billing_period"`)
- Reason: avoids partial refunds, avoids access permission complexity mid-cycle
- Stripe's own dashboard product pages (like Netlify, Vercel, Linear) all schedule downgrades for end-of-cycle

**Proration formula (Stripe's exact method):**
```
daily_rate = plan_price / days_in_billing_period
unused_credit = daily_rate × days_remaining_on_old_plan
new_charge = daily_rate_new × days_remaining_in_period
net_charge = new_charge − unused_credit
```

**Credits:**
- Stripe holds credits as a `customer.balance` (negative balance = credit)
- Applied automatically on next invoice
- Never issued as cash refunds unless explicitly requested via `create_refund()`

**Key Stripe parameters:**
- `proration_behavior`: `"create_prorations"` | `"none"` | `"always_invoice"`
- `billing_cycle_anchor`: `"unchanged"` (keep same renewal date) | `"now"` (reset to today)
- Recommendation: keep `billing_cycle_anchor: "unchanged"` to avoid confusing customers with mid-month billing shifts

---

### 1.2 Paddle Billing

Paddle is a Merchant of Record (handles tax, VAT, compliance). Key behaviors:

**Upgrades:**
- Immediate by default with proration
- Paddle calculates credit for unused time on old plan
- New plan charges net amount (difference) immediately
- Remaining billing cycle length is preserved (anchor date unchanged)

**Downgrades:**
- Paddle supports `effective_from: "next_billing_period"` — the industry standard approach
- Immediately grants the downgrade or waits until next cycle depending on `effective_from` field
- Credit balance accumulates in customer wallet for future invoices

**Key difference from Stripe:**
- Paddle is a full MOR — it handles GST/VAT calculation automatically per country
- Important for NAMA if it ever sells internationally
- Paddle's webhook model is more opaque than Stripe's

---

### 1.3 General SaaS Best Practices (Verified across Stripe, Paddle, Chargebee, Recurly, Linear, Notion)

| Scenario | Best Practice | Rationale |
|---|---|---|
| Upgrade | Immediate, pro-rata charge | Customer gets value immediately; charge feels fair |
| Downgrade | End of billing cycle | Avoids mid-cycle access confusion; simpler refund logic |
| Annual → Monthly | End of billing cycle | Protects revenue; customer already committed |
| Credits | Apply to next invoice (not cash refund) | Keeps cash flow predictable |
| Billing anchor | Preserve original date | Customers expect consistent billing dates |
| Failed upgrade payment | Revert to old plan immediately | Never grant access without payment |

---

## 2. NAMA Best Practice Recommendation

### Decision: Stripe-style proration with end-of-cycle downgrades

**For NAMA specifically:**

1. **Upgrades: Immediate with proration** — charge the difference for remaining days, grant access instantly. Travel agencies evaluating vendors and closing deals cannot wait until next month for upgraded features.

2. **Downgrades: Schedule for end of billing cycle** — no partial refund, no permission confusion. The tenant keeps their current plan until the next renewal date, then switches. Show a clear "Downgrade scheduled for [date]" banner.

3. **Billing anchor: Unchanged** — all tenants renew on the same calendar day they first subscribed. Avoid resetting anchor on upgrades.

4. **Credits: Apply to next invoice** — add a `credit_balance_paise` column to the subscriptions table. Credits applied automatically at next renewal.

5. **Stripe over custom billing** — see Section 6 for full justification.

---

## 3. Pro-Rata Formula and Worked Examples

### Formula

```
days_in_period     = total days in the current billing period (28, 30, or 31)
days_remaining     = days from today to next renewal date (inclusive of today)
daily_rate_old     = current_plan_price / days_in_period
daily_rate_new     = new_plan_price / days_in_period

credit_for_old     = daily_rate_old × days_remaining
charge_for_new     = daily_rate_new × days_remaining
net_charge         = charge_for_new − credit_for_old

# If net_charge < 0 → it's a downgrade: schedule for EOC, no charge today
# If net_charge > 0 → it's an upgrade: charge net_charge today
```

### Example A: Starter → Growth, Day 15 of a 30-day cycle

```
Billing period: 30 days  
Days remaining: 16 (days 15 through 30, inclusive)

daily_rate_old (Starter ₹4,999)  = ₹4,999 / 30 = ₹166.63/day
daily_rate_new (Growth ₹14,999)  = ₹14,999 / 30 = ₹499.97/day

credit_for_old   = ₹166.63 × 16 = ₹2,666.08
charge_for_new   = ₹499.97 × 16 = ₹7,999.52
net_charge today = ₹7,999.52 − ₹2,666.08 = ₹5,333.44

Next renewal: full ₹14,999 charged on original renewal date
```

### Example B: Growth → Scale, Day 25 of a 31-day cycle

```
Billing period: 31 days  
Days remaining: 7

daily_rate_old (Growth ₹14,999)  = ₹14,999 / 31 = ₹483.84/day
daily_rate_new (Scale ₹39,999)   = ₹39,999 / 31 = ₹1,290.29/day

credit_for_old   = ₹483.84 × 7 = ₹3,386.88
charge_for_new   = ₹1,290.29 × 7 = ₹9,032.03
net_charge today = ₹9,032.03 − ₹3,386.88 = ₹5,645.15

Next renewal: full ₹39,999
```

### Example C: Growth → Starter (Downgrade), Day 10 of 30

```
net_charge = negative → scheduled for end of cycle  
Tenant keeps Growth access until Day 30  
On Day 30: switches to Starter, charged ₹4,999  
No refund issued (standard practice)
```

### Example D: Credit balance applied on renewal

```
Tenant on Growth (₹14,999) has ₹1,200 credit from a past promo  
Next renewal: ₹14,999 − ₹1,200 = ₹13,799 charged  
Credit balance resets to ₹0
```

---

## 4. Backend Changes

### 4.1 New DB Schema

#### Migration: `m0n1o2p3q4r5_add_subscription_tables.py`
**Chain position:** after `l9m0n1o2p3q4`

```python
# New tables to create:

# 1. subscription_plans — source of truth for plan definitions (replaces hardcoded JS)
CREATE TABLE subscription_plans (
    id              SERIAL PRIMARY KEY,
    slug            VARCHAR(50) UNIQUE NOT NULL,         -- 'starter', 'growth', 'scale'
    name            VARCHAR(100) NOT NULL,
    price_monthly   INTEGER NOT NULL,                    -- in paise (₹4,999 = 499900)
    price_annual    INTEGER,                             -- optional annual pricing
    currency        VARCHAR(10) DEFAULT 'INR',
    seat_limit      INTEGER NOT NULL DEFAULT 1,
    ai_calls_limit  INTEGER NOT NULL DEFAULT 50,
    storage_gb      INTEGER NOT NULL DEFAULT 5,
    modules         JSONB DEFAULT '[]',                  -- ["M1","M2",...,"M9"]
    features        JSONB DEFAULT '[]',                  -- display strings
    is_active       BOOLEAN DEFAULT TRUE,
    sort_order      INTEGER DEFAULT 0,
    stripe_price_id VARCHAR(100),                        -- populated once Stripe integrated
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);

# 2. tenant_subscriptions — one active row per tenant
CREATE TABLE tenant_subscriptions (
    id                      SERIAL PRIMARY KEY,
    tenant_id               INTEGER NOT NULL REFERENCES tenants(id),
    plan_id                 INTEGER NOT NULL REFERENCES subscription_plans(id),
    status                  VARCHAR(30) DEFAULT 'ACTIVE',
    -- ACTIVE | TRIALING | PAST_DUE | CANCELLED | PENDING_DOWNGRADE
    billing_cycle_start     DATE NOT NULL,               -- day the current period started
    billing_cycle_end       DATE NOT NULL,               -- day the current period ends (renewal date − 1)
    next_renewal_date       DATE NOT NULL,
    trial_ends_at           TIMESTAMPTZ,
    stripe_subscription_id  VARCHAR(100),                -- null until Stripe integrated
    stripe_customer_id      VARCHAR(100),
    pending_plan_id         INTEGER REFERENCES subscription_plans(id),
    -- set when downgrade is scheduled; applied on next_renewal_date
    pending_change_date     DATE,
    credit_balance_paise    INTEGER DEFAULT 0,           -- accumulated credits
    discount_pct            INTEGER DEFAULT 0,           -- 0–100, custom discount applied by Owner
    discount_expires_at     DATE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ,
    CONSTRAINT uq_tenant_active_sub UNIQUE (tenant_id)   -- one active subscription per tenant
);

# 3. subscription_events — full billing history + audit log
CREATE TABLE subscription_events (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER NOT NULL REFERENCES tenants(id),
    subscription_id INTEGER REFERENCES tenant_subscriptions(id),
    event_type      VARCHAR(50) NOT NULL,
    -- PLAN_CHANGED | PLAN_DOWNGRADE_SCHEDULED | RENEWAL | CREDIT_APPLIED
    -- DISCOUNT_APPLIED | PAYMENT_COLLECTED | PAYMENT_FAILED | TRIAL_STARTED | CANCELLED
    from_plan_id    INTEGER REFERENCES subscription_plans(id),
    to_plan_id      INTEGER REFERENCES subscription_plans(id),
    amount_paise    INTEGER,                             -- charge or credit amount
    proration_days  INTEGER,
    credit_applied  INTEGER DEFAULT 0,
    discount_applied INTEGER DEFAULT 0,
    notes           TEXT,
    performed_by    INTEGER REFERENCES users(id),        -- null = system/Stripe webhook
    stripe_invoice_id VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_sub_events_tenant ON subscription_events(tenant_id);
CREATE INDEX ix_sub_events_type ON subscription_events(event_type);
CREATE INDEX ix_tenant_subs_tenant ON tenant_subscriptions(tenant_id);
```

**Seed data for subscription_plans** (insert during migration):

| slug | name | price_monthly (paise) | seats | ai_calls | storage_gb | modules |
|---|---|---|---|---|---|---|
| starter | Starter | 499900 | 1 | 50 | 5 | M1–M9 |
| growth | Growth | 1499900 | 5 | 200 | 10 | M1–M13 |
| scale | Scale | 3999900 | 15 | -1 (unlimited) | 50 | M1–M19 |

---

### 4.2 New Python Model: `backend/app/models/subscriptions.py`

```python
class SubscriptionStatus(str, enum.Enum):
    ACTIVE            = "ACTIVE"
    TRIALING          = "TRIALING"
    PAST_DUE          = "PAST_DUE"
    CANCELLED         = "CANCELLED"
    PENDING_DOWNGRADE = "PENDING_DOWNGRADE"

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    # columns as above

class TenantSubscription(Base):
    __tablename__ = "tenant_subscriptions"
    # columns as above

class SubscriptionEvent(Base):
    __tablename__ = "subscription_events"
    # columns as above
```

---

### 4.3 New API Endpoints: `backend/app/api/v1/subscriptions.py`

#### Public / Tenant-facing endpoints

```
GET  /api/v1/subscriptions/plans
    → Returns all active plans (no auth required, used on landing page + onboarding)
    → Response: List[PlanSchema]

GET  /api/v1/subscriptions/current
    → Auth: requireSession (any role)
    → Returns current tenant's subscription + plan + usage
    → Response: TenantSubscriptionSchema

POST /api/v1/subscriptions/preview-change
    → Auth: requireSession (R0/R1/R2 only)
    → Body: { target_plan_slug: str }
    → Returns: proration calculation without committing
    → Response: {
        direction: "upgrade" | "downgrade" | "same",
        days_remaining: int,
        credit_for_old_paise: int,
        charge_for_new_paise: int,
        net_charge_paise: int,
        effective_date: date,   # "today" for upgrades, next_renewal for downgrades
        next_renewal_amount_paise: int
      }

POST /api/v1/subscriptions/change-plan
    → Auth: requireSession (R2_ORG_ADMIN or above)
    → Body: { target_plan_slug: str, confirm: bool }
    → Executes upgrade (immediate) or schedules downgrade (EOC)
    → Creates subscription_event row
    → If Stripe: calls Stripe API; otherwise records as MANUAL payment
    → Response: TenantSubscriptionSchema

DELETE /api/v1/subscriptions/cancel
    → Auth: R2_ORG_ADMIN or above
    → Schedules cancellation at end of cycle
```

#### Owner/Admin-only endpoints (R0 / R1 only, use `can("subscriptions", "admin")`)

```
GET  /api/v1/admin/subscriptions
    → List all tenant subscriptions with plan names, statuses, renewal dates
    → Query params: status, plan_slug, page, limit
    → Response: paginated list

GET  /api/v1/admin/subscriptions/{tenant_id}
    → Full detail: subscription, events history, usage, credits

POST /api/v1/admin/subscriptions/{tenant_id}/change-plan
    → Body: { target_plan_slug: str, apply_proration: bool, notes: str }
    → Owner can force any plan change on behalf of any tenant
    → Override proration if needed (e.g. move to paid tier for free during trial)

POST /api/v1/admin/subscriptions/{tenant_id}/apply-credit
    → Body: { amount_paise: int, reason: str }
    → Adds credit to tenant's credit_balance_paise
    → Creates CREDIT_APPLIED event

POST /api/v1/admin/subscriptions/{tenant_id}/apply-discount
    → Body: { discount_pct: int, expires_at: date | null, notes: str }
    → Sets discount_pct on subscription (applied at next renewal)
    → Creates DISCOUNT_APPLIED event

GET  /api/v1/admin/subscriptions/{tenant_id}/events
    → Full billing history for a tenant

PUT  /api/v1/admin/plans/{plan_id}
    → Update plan definition (price, features, limits)
    → Auth: R0 only (NAMA Owner)

POST /api/v1/admin/plans
    → Create a new plan
    → Auth: R0 only
```

#### Core proration helper function (in `backend/app/core/billing.py`):

```python
from datetime import date
from dataclasses import dataclass

@dataclass
class ProrationResult:
    direction: str          # "upgrade" | "downgrade" | "same"
    days_in_period: int
    days_remaining: int
    credit_for_old_paise: int
    charge_for_new_paise: int
    net_charge_paise: int
    effective_date: date
    next_renewal_amount_paise: int

def calculate_proration(
    current_plan_price: int,   # paise
    new_plan_price: int,       # paise
    cycle_start: date,
    cycle_end: date,
    today: date,
    credit_balance: int = 0,
    discount_pct: int = 0,
) -> ProrationResult:
    days_in_period = (cycle_end - cycle_start).days + 1
    days_remaining = (cycle_end - today).days + 1
    days_remaining = max(days_remaining, 1)  # safety floor

    daily_old = current_plan_price / days_in_period
    daily_new = new_plan_price / days_in_period

    credit_for_old = round(daily_old * days_remaining)
    charge_for_new = round(daily_new * days_remaining)
    net_charge = charge_for_new - credit_for_old - credit_balance

    direction = "upgrade" if new_plan_price > current_plan_price else (
        "downgrade" if new_plan_price < current_plan_price else "same"
    )

    if direction == "upgrade":
        effective_date = today
        net_after_discount = round(net_charge * (1 - discount_pct / 100))
        next_renewal_amount = round(new_plan_price * (1 - discount_pct / 100))
    else:
        effective_date = cycle_end + timedelta(days=1)  # first day of next cycle
        net_after_discount = 0  # no charge today for downgrade
        next_renewal_amount = round(new_plan_price * (1 - discount_pct / 100))

    return ProrationResult(
        direction=direction,
        days_in_period=days_in_period,
        days_remaining=days_remaining,
        credit_for_old_paise=credit_for_old,
        charge_for_new_paise=charge_for_new,
        net_charge_paise=max(net_after_discount, 0),
        effective_date=effective_date,
        next_renewal_amount_paise=next_renewal_amount,
    )
```

#### Renewal cron job: `backend/app/core/billing_cron.py`

```python
# Called daily by a Railway cron job or APScheduler
# POST /api/v1/admin/billing/run-renewals  (R0 or internal API key only)

async def process_renewals(db: Session):
    today = date.today()
    due = db.query(TenantSubscription).filter(
        TenantSubscription.next_renewal_date == today,
        TenantSubscription.status.in_(["ACTIVE", "PENDING_DOWNGRADE"])
    ).all()
    
    for sub in due:
        if sub.status == "PENDING_DOWNGRADE" and sub.pending_plan_id:
            # Apply scheduled downgrade
            sub.plan_id = sub.pending_plan_id
            sub.pending_plan_id = None
            sub.pending_change_date = None
            sub.status = "ACTIVE"
        
        # Apply credit balance to renewal
        renewal_amount = sub.plan.price_monthly - sub.credit_balance_paise
        renewal_amount = max(renewal_amount, 0)
        
        if sub.discount_pct > 0 and (not sub.discount_expires_at or sub.discount_expires_at >= today):
            renewal_amount = round(renewal_amount * (1 - sub.discount_pct / 100))
        
        # Reset cycle dates
        sub.billing_cycle_start = today
        sub.billing_cycle_end = today + relativedelta(months=1) - timedelta(days=1)
        sub.next_renewal_date = today + relativedelta(months=1)
        sub.credit_balance_paise = 0
        
        # Create RENEWAL event
        event = SubscriptionEvent(
            tenant_id=sub.tenant_id,
            subscription_id=sub.id,
            event_type="RENEWAL",
            from_plan_id=sub.plan_id,
            to_plan_id=sub.plan_id,
            amount_paise=renewal_amount,
        )
        db.add(event)
    
    db.commit()
```

---

### 4.4 Enforcing Limits (Quota Guards)

Add a `check_plan_limit()` dependency in `backend/app/core/deps.py`:

```python
def check_seat_limit():
    """Raises 402 if tenant is at seat limit for their plan."""
    # Called in POST /api/v1/users (invite team member)
    
def check_ai_calls_limit():
    """Raises 402 if tenant has exceeded AI calls this month."""
    # Called in POST /api/v1/copilot/* endpoints
    # Count from subscription_events WHERE event_type='AI_CALL' AND this month
```

Usage counts can be tracked in the existing `tenant.settings` JSONB short-term, then migrated to a proper `usage_metrics` table in a future sprint.

---

## 5. Frontend Changes

### 5.1 Replace Hardcoded Plans in TabSubscription

**File:** `src/app/dashboard/org/page.tsx`

Current `PLANS` array (lines 1193–1212) is hardcoded. Replace with:

```typescript
// In TabSubscription component:
const [plans, setPlans] = useState<Plan[]>([])
const [currentSub, setCurrentSub] = useState<TenantSubscription | null>(null)

useEffect(() => {
  Promise.all([
    api.get<Plan[]>('/api/v1/subscriptions/plans'),
    api.get<TenantSubscription>('/api/v1/subscriptions/current')
  ]).then(([p, s]) => { setPlans(p); setCurrentSub(s) })
    .catch(() => { setPlans(SEED_PLANS); setCurrentSub(SEED_SUB) })  // fallback to seed
}, [])
```

Add a `PlanChangeModal` component that:
1. On click "Upgrade": calls `POST /api/v1/subscriptions/preview-change` → shows proration breakdown
2. User confirms → calls `POST /api/v1/subscriptions/change-plan`
3. On click "Downgrade": shows "Downgrade scheduled for [date]" confirmation, no payment step

```typescript
interface ProrationPreview {
  direction: 'upgrade' | 'downgrade' | 'same'
  days_remaining: number
  credit_for_old_paise: number
  charge_for_new_paise: number
  net_charge_paise: number
  effective_date: string
  next_renewal_amount_paise: number
}

function PlanChangeModal({ from, to, onConfirm, onClose }) {
  const [preview, setPreview] = useState<ProrationPreview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.post<ProrationPreview>('/api/v1/subscriptions/preview-change', {
      target_plan_slug: to.slug
    }).then(setPreview).finally(() => setLoading(false))
  }, [to.slug])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-xl font-black text-[#0F172A] mb-2">
          {preview?.direction === 'upgrade' ? 'Upgrade' : 'Schedule Downgrade'} to {to.name}
        </h2>
        {loading ? <Loader2 className="animate-spin" /> : preview && (
          <>
            {preview.direction === 'upgrade' ? (
              <div className="space-y-3 text-sm">
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Credit for unused {from.name} days</span>
                    <span className="text-emerald-600 font-bold">−{fmt(preview.credit_for_old_paise)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Charge for {to.name} ({preview.days_remaining} days)</span>
                    <span className="font-bold">+{fmt(preview.charge_for_new_paise)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-black">
                    <span>Due today</span>
                    <span className="text-[#14B8A6]">{fmt(preview.net_charge_paise)}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Next renewal: {fmt(preview.next_renewal_amount_paise)}/mo on your regular billing date
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                <p className="font-bold text-amber-800">Downgrade scheduled</p>
                <p className="text-amber-700 mt-1">
                  You keep {from.name} access until {formatDate(preview.effective_date)}.
                  Your plan switches to {to.name} at your next renewal. No charge today.
                </p>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="flex-1 border-2 border-slate-200 rounded-xl py-2.5 text-sm font-bold">
                Cancel
              </button>
              <button onClick={() => onConfirm(preview)} className="flex-1 bg-[#14B8A6] text-white rounded-xl py-2.5 text-sm font-black">
                {preview.direction === 'upgrade' ? `Pay ${fmt(preview.net_charge_paise)}` : 'Confirm Downgrade'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

Helper:
```typescript
function fmt(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}
```

### 5.2 New Owner Admin Panel: `/owner/subscriptions`

**New file:** `src/app/owner/subscriptions/page.tsx`

Role guard: R0_NAMA_OWNER only (redirect otherwise).

**Three tabs:**

#### Tab 1: All Tenants
- Table: Tenant name, Plan, Status, Seats used, Renewal date, MRR, Actions
- Actions per row: "Change Plan", "Apply Credit", "Apply Discount", "View History"
- Filter by plan, status
- Summary cards: Total MRR, Active tenants, Trials, Past Due

```typescript
// API call
const subs = await api.get<AdminSubscriptionList>('/api/v1/admin/subscriptions')
```

#### Tab 2: Plan Editor
- Table of all `subscription_plans` rows
- Inline edit: name, price, seat_limit, ai_calls_limit, storage_gb, features array
- "Save Changes" calls `PUT /api/v1/admin/plans/{id}`
- "Add Plan" button → modal → `POST /api/v1/admin/plans`
- Warning: "Changing price affects new billing cycles only. Existing subscribers keep current price until next renewal unless forced."

```typescript
// Plan editor row
<input value={plan.price_monthly / 100} onChange={...} className="..." />
// Renders as ₹4,999 but stores as 499900 paise internally
```

#### Tab 3: Billing History (global)
- Table of all `subscription_events` across all tenants
- Columns: Date, Tenant, Event type, From plan, To plan, Amount, Performed by
- Filter by event type and date range
- Export to CSV button

### 5.3 Plan Change Modal in Tenant Dashboard

Add "Change Plan" button to the current plan card in `TabSubscription`. The button opens `PlanChangeModal`. After successful change:
- Show toast: "Upgraded to Scale Plan — access granted immediately"
- Refresh `currentSub` state
- If downgrade: show persistent banner at top of subscription tab:
  ```
  Downgrade to Starter scheduled for May 16, 2026. You have full Growth access until then.
  [Cancel Downgrade]
  ```

### 5.4 API types to add to `src/lib/api.ts`

```typescript
export interface SubscriptionPlan {
  id: number
  slug: string
  name: string
  price_monthly: number      // paise
  seat_limit: number
  ai_calls_limit: number
  storage_gb: number
  features: string[]
  modules: string[]
  is_active: boolean
  stripe_price_id?: string
}

export interface TenantSubscription {
  id: number
  tenant_id: number
  plan: SubscriptionPlan
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'PENDING_DOWNGRADE'
  billing_cycle_start: string
  billing_cycle_end: string
  next_renewal_date: string
  pending_plan?: SubscriptionPlan | null
  pending_change_date?: string | null
  credit_balance_paise: number
  discount_pct: number
  discount_expires_at?: string | null
}

export interface ProrationPreview {
  direction: 'upgrade' | 'downgrade' | 'same'
  days_in_period: number
  days_remaining: number
  credit_for_old_paise: number
  charge_for_new_paise: number
  net_charge_paise: number
  effective_date: string
  next_renewal_amount_paise: number
}

export const subscriptionsApi = {
  getPlans: () => api.get<SubscriptionPlan[]>('/api/v1/subscriptions/plans'),
  getCurrent: () => api.get<TenantSubscription>('/api/v1/subscriptions/current'),
  previewChange: (slug: string) =>
    api.post<ProrationPreview>('/api/v1/subscriptions/preview-change', { target_plan_slug: slug }),
  changePlan: (slug: string) =>
    api.post<TenantSubscription>('/api/v1/subscriptions/change-plan', { target_plan_slug: slug, confirm: true }),
}

export const adminSubscriptionsApi = {
  list: (params?: Record<string, string>) =>
    api.get<any>(`/api/v1/admin/subscriptions?${new URLSearchParams(params)}`),
  getTenant: (tenantId: number) =>
    api.get<any>(`/api/v1/admin/subscriptions/${tenantId}`),
  changeTenantPlan: (tenantId: number, slug: string, notes: string) =>
    api.post<any>(`/api/v1/admin/subscriptions/${tenantId}/change-plan`, { target_plan_slug: slug, apply_proration: true, notes }),
  applyCredit: (tenantId: number, paise: number, reason: string) =>
    api.post<any>(`/api/v1/admin/subscriptions/${tenantId}/apply-credit`, { amount_paise: paise, reason }),
  applyDiscount: (tenantId: number, pct: number, expiresAt: string | null, notes: string) =>
    api.post<any>(`/api/v1/admin/subscriptions/${tenantId}/apply-discount`, { discount_pct: pct, expires_at: expiresAt, notes }),
  getEvents: (tenantId: number) =>
    api.get<any>(`/api/v1/admin/subscriptions/${tenantId}/events`),
  updatePlan: (planId: number, data: Partial<SubscriptionPlan>) =>
    api.put<SubscriptionPlan>(`/api/v1/admin/plans/${planId}`, data),
  createPlan: (data: Partial<SubscriptionPlan>) =>
    api.post<SubscriptionPlan>('/api/v1/admin/plans', data),
}
```

---

## 6. Stripe Integration Recommendation

### Should NAMA use Stripe for billing or build custom?

**Recommendation: Start with manual/custom billing, plan Stripe integration in Sprint 5.**

### Rationale

**Right now (manual billing is fine because):**
- NAMA has ~0–50 paying tenants — the operator (Narayan) can manually create Razorpay links, collect payments, and update subscription rows via the Owner admin panel
- NAMA already has Razorpay integrated for booking payments — same UX can collect plan payments
- Custom billing avoids the overhead of Stripe account setup, webhook verification, and compliance in Phase 1
- The database schema above is designed to be Stripe-ready (has `stripe_subscription_id`, `stripe_customer_id`, `stripe_price_id` columns) — dropping in Stripe later is a clean migration

**When to add Stripe (trigger conditions):**
- >50 paying tenants (manual renewal tracking becomes error-prone)
- Need to offer credit card self-serve checkout without a sales call
- Need automated dunning (retry failed payments automatically)
- Need to issue formal VAT invoices to international customers

**How Stripe fits into the schema above:**
1. Create Stripe products + prices for each plan (set `stripe_price_id` on `subscription_plans` rows)
2. On `POST /change-plan`, call `stripe.subscriptions.update(sub_id, { items: [{price: new_price_id}], proration_behavior: "create_prorations" })` instead of manual calculation
3. Replace the cron renewal job with Stripe webhook handler at `POST /api/v1/webhooks/stripe`:
   - `invoice.paid` → update `subscription_events` with RENEWAL
   - `invoice.payment_failed` → set status to PAST_DUE, send email
   - `customer.subscription.updated` → sync plan changes
4. The `calculate_proration()` function can be kept as a client-side preview (call before Stripe confirms)

**Why not Paddle for NAMA?**
- Paddle's MOR model means Paddle appears on the invoice, not NAMA — confusing for Indian travel agency clients
- Paddle's INR support is available but Stripe is significantly more widely used in India
- Razorpay is the strongest option for Indian card/UPI payments — consider Razorpay Subscriptions as a Stripe alternative if staying India-only

**Razorpay Subscriptions as alternative to Stripe:**
- Razorpay has a full Subscriptions API (`razorpay.subscriptions.create`) that handles recurring billing
- Already integrated in NAMA for one-time payments
- Supports UPI AutoPay — critical for India market (most Indian users prefer UPI over card)
- Lower fees (2% vs Stripe's 3% + conversion) for INR payments
- Recommendation: **Use Razorpay Subscriptions** as the first automated billing layer (sprint 5), not Stripe — unless NAMA plans to sell outside India

---

## 7. Step-by-Step Build Order

### Sprint 4 (now): Foundation — 3–4 days

**Day 1: DB + Models**
1. Create `backend/app/models/subscriptions.py` with `SubscriptionPlan`, `TenantSubscription`, `SubscriptionEvent`
2. Write migration `m0n1o2p3q4r5_add_subscription_tables.py` (revises `l9m0n1o2p3q4`)
3. Add seed SQL for 3 plans in migration upgrade() function
4. Run `alembic upgrade heads` locally to verify
5. Create `backend/app/core/billing.py` with `calculate_proration()` function and unit tests

**Day 2: Backend API**
1. Create `backend/app/api/v1/subscriptions.py` with tenant-facing endpoints:
   - `GET /plans` (public)
   - `GET /current`
   - `POST /preview-change`
   - `POST /change-plan`
2. Register router in `backend/app/main.py`
3. Test all endpoints with httpie/Postman

**Day 3: Admin API**
1. Add `backend/app/api/v1/admin/subscriptions.py` with all admin endpoints
2. Add `backend/app/core/billing_cron.py` with `process_renewals()`
3. Register `POST /api/v1/admin/billing/run-renewals` (R0 + internal API key)
4. Auto-create subscriptions on tenant registration: when a new tenant is created, insert a `TenantSubscription` row for the `starter` plan (or a 14-day trial)

**Day 4: Frontend wiring (TabSubscription)**
1. Add types to `src/lib/api.ts`: `SubscriptionPlan`, `TenantSubscription`, `ProrationPreview`, `subscriptionsApi`
2. Update `TabSubscription` in `src/app/dashboard/org/page.tsx`: replace hardcoded `PLANS` with API fetch + seed fallback
3. Add `PlanChangeModal` component
4. Wire "Upgrade" / "Downgrade" buttons to modal

---

### Sprint 5: Owner Admin Panel — 2–3 days

**Day 5: Owner Subscriptions Page**
1. Create `src/app/owner/subscriptions/page.tsx` with role guard (R0 only)
2. Tab 1 "All Tenants": fetch from `GET /api/v1/admin/subscriptions`, render table
3. "Change Plan" modal per tenant row → calls `POST /api/v1/admin/subscriptions/{id}/change-plan`
4. "Apply Credit" modal → calls `POST /api/v1/admin/subscriptions/{id}/apply-credit`
5. "Apply Discount" modal → calls `POST /api/v1/admin/subscriptions/{id}/apply-discount`

**Day 6: Plan Editor + Billing History**
1. Tab 2 "Plan Editor": editable plan table wired to `PUT /api/v1/admin/plans/{id}`
2. Tab 3 "Billing History": events table from `GET /api/v1/admin/subscriptions/{id}/events`
3. Add "Subscriptions" nav link to owner/super-admin sidebar (R0 only, CreditCard icon)
4. Add summary KPI cards (Total MRR, Active count, Trial count, Past Due)

---

### Sprint 6: Automated Billing (optional, Razorpay Subscriptions) — 3–4 days

**Day 7–8: Razorpay Subscriptions**
1. Create Razorpay plans via API for each `subscription_plans` row; store `razorpay_plan_id`
2. On `POST /change-plan`: create Razorpay subscription, redirect to Razorpay checkout
3. Store `razorpay_subscription_id` on `tenant_subscriptions`
4. Add webhook handler `POST /api/v1/webhooks/razorpay-sub`:
   - `subscription.activated` → set status ACTIVE
   - `subscription.charged` → create RENEWAL event
   - `subscription.payment_failed` → set status PAST_DUE, send email via Resend
   - `subscription.cancelled` → set status CANCELLED

**Day 9: Dunning + Email**
1. Add "Payment failed" email template to `src/emails/` (React Email)
2. Send via `POST /api/email/drip` pattern
3. Retry logic: 3 attempts over 7 days, then suspend account
4. Add "Reactivate" flow for past_due → payment → active

---

## 8. Summary of Files to Create / Modify

### New files (backend)
| File | Description |
|---|---|
| `backend/app/models/subscriptions.py` | SubscriptionPlan, TenantSubscription, SubscriptionEvent models |
| `backend/alembic/versions/m0n1o2p3q4r5_add_subscription_tables.py` | Migration with seed plans |
| `backend/app/core/billing.py` | calculate_proration(), fmt_paise() |
| `backend/app/core/billing_cron.py` | process_renewals() daily job |
| `backend/app/api/v1/subscriptions.py` | Tenant-facing endpoints |
| `backend/app/api/v1/admin/subscriptions.py` | Owner admin endpoints |

### New files (frontend)
| File | Description |
|---|---|
| `src/app/owner/subscriptions/page.tsx` | Owner admin panel (3 tabs) |
| `src/components/PlanChangeModal.tsx` | Reusable upgrade/downgrade modal |

### Modified files
| File | Change |
|---|---|
| `src/app/dashboard/org/page.tsx` | Replace hardcoded PLANS with API fetch; wire plan buttons |
| `src/lib/api.ts` | Add SubscriptionPlan, TenantSubscription, ProrationPreview types + subscriptionsApi, adminSubscriptionsApi |
| `backend/app/main.py` | Register new routers |
| `backend/app/api/v1/tenants.py` | Auto-create TenantSubscription on tenant creation |
| `backend/app/core/deps.py` | Add check_seat_limit(), check_ai_calls_limit() quota guards |

---

## 9. Edge Cases to Handle

| Case | Handling |
|---|---|
| Tenant on trial, upgrades before trial ends | Cancel trial immediately, start paid subscription today, prorate from today |
| Plan price changes for existing subscribers | `price_monthly` change only affects new renewals; existing subscribers keep old price until next `change-plan` call |
| Upgrade on last day of cycle | `days_remaining = 1`; net charge = (new_daily − old_daily) × 1; minimal but correct |
| Credit balance exceeds renewal amount | `max(net_charge, 0)` — never charge negative; excess credit carries forward |
| Stripe/Razorpay webhook received twice (duplicate) | Check `subscription_events` for existing `stripe_invoice_id` before inserting — idempotency pattern already used in `payments` table |
| Owner changes plan, tenant has pending downgrade | Clear `pending_plan_id` and `pending_change_date`, apply new plan immediately |
| Annual billing | Store `billing_period` column on `tenant_subscriptions` ('monthly' or 'annual'); proration formula uses `days_in_period = 365` for annual |
