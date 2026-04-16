#!/bin/bash
# NAMA — Set Railway environment variables via API
# Usage: bash set_railway_vars.sh YOUR_ANTHROPIC_API_KEY
# Example: bash set_railway_vars.sh sk-ant-api03-...

set -e

RAILWAY_TOKEN="9febf656-7e39-49dc-8adf-01f7e41104ad"
ANTHROPIC_API_KEY="${1:-}"

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "Usage: bash set_railway_vars.sh YOUR_ANTHROPIC_API_KEY"
  echo "Get your key from: https://console.anthropic.com/settings/keys"
  exit 1
fi

echo "🔍 Finding Railway project and service..."

# Step 1: Get project + service IDs
PROJECTS=$(curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ me { projects { edges { node { id name environments { edges { node { id name } } } services { edges { node { id name } } } } } } } }"
  }')

echo "Projects found:"
echo "$PROJECTS" | python3 -c "
import json, sys
data = json.load(sys.stdin)
projects = data['data']['me']['projects']['edges']
for p in projects:
    n = p['node']
    print(f'  Project: {n[\"name\"]} (ID: {n[\"id\"]})')
    for e in n['environments']['edges']:
        ev = e['node']
        print(f'    Environment: {ev[\"name\"]} (ID: {ev[\"id\"]})')
    for s in n['services']['edges']:
        sv = s['node']
        print(f'    Service: {sv[\"name\"]} (ID: {sv[\"id\"]})')
"

# Step 2: Extract IDs automatically
PROJECT_ID=$(echo "$PROJECTS" | python3 -c "
import json, sys
data = json.load(sys.stdin)
projects = data['data']['me']['projects']['edges']
# Pick first project
print(projects[0]['node']['id'])
")

ENV_ID=$(echo "$PROJECTS" | python3 -c "
import json, sys
data = json.load(sys.stdin)
projects = data['data']['me']['projects']['edges']
envs = projects[0]['node']['environments']['edges']
# Pick 'production' environment if exists, else first
for e in envs:
    if e['node']['name'].lower() == 'production':
        print(e['node']['id'])
        sys.exit(0)
print(envs[0]['node']['id'])
")

SERVICE_ID=$(echo "$PROJECTS" | python3 -c "
import json, sys
data = json.load(sys.stdin)
projects = data['data']['me']['projects']['edges']
services = projects[0]['node']['services']['edges']
# Pick the backend service (not viva)
for s in services:
    name = s['node']['name'].lower()
    if 'viva' not in name:
        print(s['node']['id'])
        sys.exit(0)
print(services[0]['node']['id'])
")

echo ""
echo "✅ Using:"
echo "   Project ID:     $PROJECT_ID"
echo "   Environment ID: $ENV_ID"
echo "   Service ID:     $SERVICE_ID"
echo ""
echo "⚙️  Setting environment variables..."

# Step 3: Upsert all vars
set_var() {
  local NAME="$1"
  local VALUE="$2"
  RESULT=$(curl -s -X POST https://backboard.railway.app/graphql/v2 \
    -H "Authorization: Bearer $RAILWAY_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"query\": \"mutation { variableUpsert(input: { projectId: \\\"$PROJECT_ID\\\", environmentId: \\\"$ENV_ID\\\", serviceId: \\\"$SERVICE_ID\\\", name: \\\"$NAME\\\", value: \\\"$VALUE\\\" }) }\"
    }")
  if echo "$RESULT" | grep -q '"variableUpsert":true'; then
    echo "   ✅ $NAME set"
  else
    echo "   ❌ $NAME failed: $RESULT"
  fi
}

set_var "SECRET_KEY"          "GrApFuCUoALbDQcp8NeWEXK1yOBztYsaOwLlskR7hck"
set_var "REFRESH_SECRET_KEY"  "KnNPvsrt_B3fzsSGOdciLe8LOYp5b1IVo_5yXHg9zwM"
set_var "ANTHROPIC_API_KEY"   "$ANTHROPIC_API_KEY"
set_var "LOG_LEVEL"           "info"
set_var "AI_BUDGET_USD"       "50"

echo ""
echo "🚀 Done! Railway will restart the backend automatically."
echo "   Watch it come up at: https://railway.app/dashboard"
echo ""
echo "⚠️  IMPORTANT: If you want persistent data across deploys, add a PostgreSQL"
echo "   plugin in the Railway project — Railway will auto-inject DATABASE_URL."
echo "   Without it, SQLite is used and data resets on every deploy."
