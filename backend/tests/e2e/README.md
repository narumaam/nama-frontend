# E2E Test Suite for NAMA Travel Platform

Comprehensive end-to-end tests for the NAMA FastAPI backend covering authentication, leads management, bookings, analytics, and critical user flows.

## Quick Start

### Prerequisites

1. **Running server** — FastAPI backend must be running with seeded demo data:
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

2. **Seeded database** — Demo users must exist:
   ```bash
   cd backend
   DATABASE_URL=sqlite:///./nama.db python seed_demo.py
   ```

3. **Dependencies** installed:
   ```bash
   pip install pytest pytest-asyncio httpx python-jose
   ```

### Run All E2E Tests

```bash
cd backend
E2E_BASE_URL=http://localhost:8000 pytest tests/e2e/ -v
```

### Run Specific Test File

```bash
# Auth tests only
E2E_BASE_URL=http://localhost:8000 pytest tests/e2e/test_auth.py -v

# Leads tests only
E2E_BASE_URL=http://localhost:8000 pytest tests/e2e/test_leads.py -v

# Critical path (full user journeys)
E2E_BASE_URL=http://localhost:8000 pytest tests/e2e/test_critical_path.py -v
```

### Run Single Test

```bash
E2E_BASE_URL=http://localhost:8000 pytest tests/e2e/test_auth.py::TestAuthLoginSuccess::test_login_success -v
```

### Verbose Output with Print Statements

```bash
E2E_BASE_URL=http://localhost:8000 pytest tests/e2e/ -v -s
```

## Environment Variables

Configure test behavior via environment variables:

```bash
# Required
E2E_BASE_URL=http://localhost:8000          # API base URL (default: http://localhost:8000)

# Admin user credentials
ADMIN_EMAIL=admin@namatest.dev              # Admin email (default)
ADMIN_PASSWORD=Demo123!                     # Admin password (default)

# Sales agent credentials
SALES_EMAIL=demo@namatest.dev               # Sales email (default)
SALES_PASSWORD=Demo123!                     # Sales password (default)
```

Example:
```bash
E2E_BASE_URL=http://api.staging.local:8000 \
ADMIN_EMAIL=test.admin@company.com \
ADMIN_PASSWORD=SecurePassword123 \
pytest tests/e2e/ -v
```

## Test Coverage

### Authentication (test_auth.py)
- **Login Success** — Valid credentials return access token
- **Login Failures** — Wrong password, missing fields, nonexistent user → 401/422
- **Token Refresh** — Refresh cookie returns new access token
- **Users/Me** — Current user profile (authenticated & unauthenticated)
- **Expired Token** — Manually crafted expired JWT returns 401

### Leads Management (test_leads.py)
- **Create Lead** — POST /leads/ with full and minimal fields
- **List Leads** — GET /leads/ with pagination and status filtering
- **Get Lead Detail** — GET /leads/{id} for single lead
- **Update Lead** — PATCH /leads/{id} for status and field updates
- **Tenant Isolation** — Leads are scoped to authenticated user's tenant
- **Pagination** — page and size parameters work correctly
- **Error Handling** — Missing fields → 422, unauthorized → 401

### Bookings Management (test_bookings.py)
- **Create Booking** — POST /bookings/ linked to lead
- **List Bookings** — GET /bookings/ with status filtering
- **Get Booking Detail** — GET /bookings/{id}
- **Update Booking** — PUT /bookings/{id} for status changes
- **Idempotency** — Duplicate idempotency_key prevents duplicate bookings
- **Auth Requirements** — Bookings require valid JWT token

### Analytics & Reporting (test_analytics.py)
- **Dashboard KPIs** — GET /analytics/dashboard returns expected metrics
- **Anomaly Detection** — GET /analytics/anomalies returns list
- **Forecasting** — GET /analytics/forecast is admin-only (403 for non-admin)
- **Caching** — Repeated calls return consistent cached data

### Health Check (test_health.py)
- **Health Status** — GET /health returns 200 with status "healthy"
- **No Auth Required** — Health check does not require Authorization header
- **Hard Stop Status** — All 4 hard stops reported as "resolved"

### Critical User Flows (test_critical_path.py)
- **Lead-to-Booking Conversion** — Full sequential flow: login → create lead → create booking → confirm
- **Query Triage** — POST /queries/ingest creates lead from raw query
- **Analytics Updates** — Dashboard metrics reflect new data

## Fixtures

Fixtures are defined in `conftest.py`:

```python
@pytest.fixture(scope="session")
def base_url() -> str:
    """Base URL for API calls. Reads E2E_BASE_URL env var."""

@pytest.fixture(scope="session")
def http_client() -> httpx.Client:
    """Sync HTTP client for all tests."""

@pytest.fixture(scope="session")
def auth_tokens(http_client, base_url) -> Dict[str, str]:
    """Authenticate as admin. Returns {'access': '...', 'refresh': '...'}"""

@pytest.fixture(scope="session")
def auth_headers(auth_tokens) -> Dict[str, str]:
    """Authorization headers for admin requests."""

@pytest.fixture(scope="session")
def sales_tokens(http_client, base_url) -> Dict[str, str]:
    """Authenticate as sales agent."""

@pytest.fixture(scope="session")
def sales_headers(sales_tokens) -> Dict[str, str]:
    """Authorization headers for sales agent requests."""

@pytest.fixture(scope="session")
def created_lead_id(http_client, base_url, auth_headers) -> int:
    """Pre-created lead ID for use across all tests."""
```

## Test Structure

Each test file follows this pattern:

```python
class TestFeatureArea:
    """Test class for a specific feature."""

    def test_success_case(self, http_client, base_url, auth_headers):
        """Descriptive test name."""
        response = http_client.get(
            f"{base_url}/api/v1/endpoint",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["field"] == expected_value
```

## Debugging Tips

### Print Response Data
```python
def test_example(self, http_client, base_url, auth_headers):
    response = http_client.get(f"{base_url}/api/v1/leads/", headers=auth_headers)
    print(f"Status: {response.status_code}")
    print(f"Body: {response.text}")
    assert response.status_code == 200
```

Run with `-s` flag to see print output:
```bash
pytest tests/e2e/test_leads.py::TestListLeads::test_list_leads_success -s
```

### Check Server Logs

While tests run, monitor server logs:
```bash
# In another terminal
tail -f /path/to/server.log
```

### Isolate Single Test

Run a single test to debug:
```bash
E2E_BASE_URL=http://localhost:8000 pytest tests/e2e/test_auth.py::TestAuthLoginSuccess::test_login_success -vvs
```

## Hard Stops Verification

This test suite verifies all 4 Hard Stops are resolved:

| Hard Stop | Coverage | Test |
|-----------|----------|------|
| HS-1: JWT Auth | `/auth/login`, token validation, expiration | `test_auth.py` |
| HS-2: RLS/Tenant Isolation | Leads/bookings scoped by tenant_id | `test_leads.py`, `test_bookings.py` |
| HS-3: Payment Safety | Idempotency keys, booking saga pattern | `test_bookings.py` |
| HS-4: AI Cost Controls | Query ingestion rate limits | `test_critical_path.py` |

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: nama_test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt pytest httpx
      - run: cd backend && python seed_demo.py
      - run: cd backend && python -m uvicorn app.main:app &
      - run: sleep 3  # Wait for server startup
      - run: cd backend && pytest tests/e2e/ -v
```

## Troubleshooting

### Connection Refused
**Error:** `ConnectionRefusedError: [Errno 111] Connection refused`

**Solution:** Ensure FastAPI server is running:
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### 401 Unauthorized (Login Failed)
**Error:** Demo user credentials not found

**Solution:** Seed the database:
```bash
cd backend
DATABASE_URL=sqlite:///./nama.db python seed_demo.py
```

### 404 Lead Not Found
**Error:** `created_lead_id` fixture returns invalid ID

**Solution:** Check database is not empty. Leads fixture creates lead automatically if needed.

### Timeout on Long Operations
**Error:** `ConnectTimeout` or test hangs

**Solution:** Increase timeout:
```python
http_client = httpx.Client(timeout=60.0)
```

## Adding New Tests

1. Create test file in `tests/e2e/`
2. Import fixtures from `conftest.py`
3. Structure as `TestFeature` classes
4. Use descriptive test names: `test_<feature>_<scenario>`
5. Add docstrings with acceptance criteria
6. Run with `pytest tests/e2e/test_new.py -v`

## Performance Notes

- Tests run in ~30-60 seconds (depending on server performance)
- `session`-scoped fixtures (auth tokens) reuse across all tests
- Each test is independent and can run in any order
- Critical path tests are sequential (by design)

## Support

For issues or questions:
1. Check server logs: `tail -f backend/logs/app.log`
2. Run test with verbose output: `-v -s`
3. Verify environment variables: `echo $E2E_BASE_URL`
4. Ensure database is seeded: `python seed_demo.py`
