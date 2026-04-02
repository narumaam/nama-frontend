#!/usr/bin/env bash

set -euo pipefail

check_url() {
  local label="$1"
  local url="$2"
  local body
  local status

  body="$(curl -sS -L --max-time 20 -A 'NAMA Monday Smoke Check' -w $'\n%{http_code}' "$url")"
  status="${body##*$'\n'}"
  body="${body%$'\n'*}"

  if [[ "$status" != "200" ]]; then
    echo "FAIL $label: HTTP $status"
    return 1
  fi

  if [[ "$url" == *"/api/v1/health" ]]; then
    [[ "$body" == *'"status":"healthy"'* ]] || { echo "FAIL $label: missing healthy status"; return 1; }
  fi

  if [[ "$url" == *"/api/v1/demo/cases" ]]; then
    [[ "$body" == *'"capture_source"'* ]] || { echo "FAIL $label: missing capture metadata"; return 1; }
  fi

  if [[ "$url" == *"/api/v1/demo/crm/"* ]]; then
    [[ "$body" == *'"sales_transcript"'* ]] || { echo "FAIL $label: missing sales transcript"; return 1; }
  fi

  echo "PASS $label: 200"
}

check_url "Landing page" "https://nama-frontend.vercel.app/"
check_url "Register" "https://nama-frontend.vercel.app/register"
check_url "Dashboard" "https://nama-frontend.vercel.app/dashboard"
check_url "Leads" "https://nama-frontend.vercel.app/dashboard/leads"
check_url "Deals" "https://nama-frontend.vercel.app/dashboard/deals?lead=1"
check_url "Autopilot" "https://nama-frontend.vercel.app/dashboard/autopilot"
check_url "Kinetic" "https://nama-frontend.vercel.app/kinetic"
check_url "Backend health" "https://intuitive-blessing-production-30de.up.railway.app/api/v1/health"
check_url "Demo cases" "https://intuitive-blessing-production-30de.up.railway.app/api/v1/demo/cases"
check_url "CRM case" "https://intuitive-blessing-production-30de.up.railway.app/api/v1/demo/crm/maldives-honeymoon"

echo
echo "Monday smoke check passed."
