#!/bin/bash
set -e

echo "============================================="
echo "  GlamourAI — Linux/Mac Launcher"
echo "============================================="
echo ""

if ! command -v python3 &>/dev/null; then
    echo "[ERROR] Python 3 not found. Install Python 3.10+"
    exit 1
fi
if ! command -v node &>/dev/null; then
    echo "[ERROR] Node.js not found. Install from https://nodejs.org"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
    echo "[ERROR] backend/.env not found."
    echo "Copy backend/.env.example to backend/.env and add your API keys first."
    exit 1
fi

echo "[1/4] Setting up Python virtual environment..."
cd "$SCRIPT_DIR/backend"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

echo "[2/4] Installing Python dependencies (includes torch via"
echo "      sentence-transformers — first run can take several minutes)..."
pip install -r requirements.txt -q

echo "[3/4] Starting backend on http://localhost:8000 ..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "[4/4] Installing & starting frontend on http://localhost:5173 ..."
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run dev &
FRONTEND_PID=$!

echo ""
echo "============================================="
echo "  ✅ App running at:  http://localhost:5173"
echo "  ✅ API running at:  http://localhost:8000"
echo "  ✅ API Docs:        http://localhost:8000/docs"
echo "============================================="
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'; exit 0" INT
wait
