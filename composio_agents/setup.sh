#!/bin/bash
# NAMA Travel OS — Setup Script
# Usage: bash setup.sh

echo "NAMA Travel OS — Agent Setup"
echo "Composio x Gemini 3.1 Flash-Lite"
echo ""

echo "[1/4] Checking Python 3..."
python3 --version || { echo "Python 3 required"; exit 1; }

echo "[2/4] Creating virtual environment..."
python3 -m venv .venv
source .venv/bin/activate

echo "[3/4] Installing packages..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "All packages installed"

echo "[4/4] Setting up .env..."
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ".env created - fill in your API keys"
else
  echo ".env already exists"
fi

echo ""
echo "Next: connect integrations by running:"
echo "  composio add gmail"
echo "  composio add googlesheets"
echo "  composio add notion"
echo "  composio add hubspot"
echo "  composio add slack"
echo ""
echo "Then test agents:"
echo "  python onboarding_agent.py --name 'Test DMC' --email 'you@test.com' --contact 'Your Name'"
echo "  python lead_quote_agent.py --test"
echo "  python pnl_digest_agent.py --test"
echo "  python competitor_intel_agent.py --test"
