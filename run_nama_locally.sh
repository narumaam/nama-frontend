#!/bin/bash

echo "------------------------------------------------"
echo "🚀 NAMA TRAVEL OS: LOCAL LAUNCHER (v3.0)"
echo "------------------------------------------------"

# 1. Navigate to project folder
cd /Users/radhika/.accio/accounts/7082939334/agents/DID-2799F4-428BC9/project/

# 2. Start Backend (The Brain)
echo "🧠 Starting AI Engine (Backend)..."
export PYTHONPATH=$PYTHONPATH:$(pwd)/backend
# Running in background
python3 backend/main.py & 

# 3. Start Frontend (The Design)
echo "🎨 Starting Apple-Style UI (Frontend)..."
cd frontend
# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing design components (this may take a minute)..."
    npm install
fi
npm run dev &

# 4. Open Browser
echo "🌐 Opening your platform at http://localhost:3000"
sleep 5
open http://localhost:3000

echo "------------------------------------------------"
echo "✅ NAMA IS NOW RUNNING LOCALLY!"
echo "Press CTRL+C to stop the servers."
echo "------------------------------------------------"
