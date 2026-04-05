@echo off
REM ============================================================
REM Pharmacian Legacy Launcher
REM For best experience, use: run_app.cmd or run_app.ps1
REM ============================================================
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo Pharmacian - Clinical Disease Assessment System
echo.

REM Quick check for requirements
where node >nul 2>&1 || (
    echo [ERROR] Node.js not installed. Visit: https://nodejs.org/
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    call npm install
)

if exist "backend\requirements.txt" (
    echo Checking Python dependencies...
    python -m pip install -q -r backend\requirements.txt > nul 2>&1
)

echo Launching Pharmacian...
echo.

npm.cmd run dev
pause
