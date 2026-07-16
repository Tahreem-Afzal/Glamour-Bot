@echo off
title GlamourAI — Fashion Assistant Suite
color 0A

echo =============================================
echo   GlamourAI — Windows Launcher
echo =============================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.10+ from https://python.org
    pause & exit /b 1
)

node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause & exit /b 1
)

if not exist backend\.env (
    echo [ERROR] backend\.env not found.
    echo Copy backend\.env.example to backend\.env and add your API keys first.
    pause & exit /b 1
)

echo [1/4] Setting up Python virtual environment...
cd backend
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat

echo [2/4] Installing Python dependencies (this includes torch via
echo       sentence-transformers — first run can take several minutes)...
pip install -r requirements.txt --quiet

echo [3/4] Starting backend server...
start "GlamourAI Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

cd ..\frontend
if not exist node_modules (
    echo [4/4] Installing frontend dependencies (first run only)...
    npm install
)

start "GlamourAI Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 6 >nul
echo.
echo =============================================
echo   App running at: http://localhost:5173
echo   API running at: http://localhost:8000
echo   API Docs:       http://localhost:8000/docs
echo =============================================
echo.
start http://localhost:5173
pause
