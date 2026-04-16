#!/bin/bash
# NAMA MVP — push to GitHub and trigger Vercel deploy
# Run this once from your Mac Terminal: bash push_to_github.sh

set -e

echo "🚀 Pushing NAMA MVP to GitHub..."

cd "$(dirname "$0")"

# Push main branch — fast-forward preferred, force-with-lease as safety net
git push -u origin main 2>/dev/null || \
git push -u origin main --force-with-lease

echo ""
echo "✅ Code pushed to github.com/narumaam/nama-frontend (main branch)"
echo ""
echo "Next steps:"
echo "  1. Go to vercel.com → nama-frontend project → Settings → Git"
echo "     Change 'Production Branch' from 'codex/beta-foundations' to 'main'"
echo "  2. Go to github.com/narumaam/nama-frontend → Settings → Secrets → Actions"
echo "     Add: RAILWAY_TOKEN, VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, NEXT_PUBLIC_API_URL"
echo ""
echo "Vercel project ID : prj_sytPELLP8AUNTAul3P5WBra38GNk"
echo "Vercel team ID    : team_0ntK3Ywi8mYGSkVagPrRDXhd"
