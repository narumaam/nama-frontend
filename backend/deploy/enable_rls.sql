-- Tier 10D — Enable RLS enforcement on tenant tables.
--
-- Run this manually AFTER:
--   1. Migration `t7u8v9w0x1y2_add_tenant_rls_policies` has been applied
--      (creates the policy objects on each tenant table).
--   2. The application has been deployed with the `SET LOCAL app.tenant_id = N`
--      plumbing in `app/db/session.get_db` (Tier 10D — already live).
--   3. You have confirmed in staging that every authenticated request path
--      goes through `get_db()` and successfully sets the tenant id.
--
-- This is gated as a manual one-shot because turning RLS on is irreversible
-- at the request layer — a missed code path will return zero rows or 500.
--
-- Roll-forward:
--     psql $DATABASE_URL -f deploy/enable_rls.sql
--
-- Rollback (if needed):
--     ALTER TABLE leads                  DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE itineraries            DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE quotations             DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE bookings               DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE conversation_messages  DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE audit_log              DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE vendors                DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE clients                DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE ledger_entries         DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE media_assets           DISABLE ROW LEVEL SECURITY;

-- Connecting role must NOT have BYPASSRLS for these to take effect.
-- Most Neon project users are non-superuser by default — verify with:
--   SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = current_user;
-- If rolbypassrls = true, run:
--   ALTER ROLE <your_app_role> NOBYPASSRLS;

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'leads','itineraries','quotations','bookings',
        'conversation_messages','audit_log','vendors',
        'clients','ledger_entries','media_assets'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF to_regclass(t) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
            RAISE NOTICE 'RLS enabled + forced on %', t;
        END IF;
    END LOOP;
END$$;

-- Smoke test (run as the application role, not superuser):
--   SET app.tenant_id = '1';
--   SELECT count(*) FROM leads;       -- should return rows for tenant 1
--   RESET app.tenant_id;
--   SELECT count(*) FROM leads;       -- should return 0 (NULL setting => no rows)
