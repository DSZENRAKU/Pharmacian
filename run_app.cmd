@echo off
REM ============================================================
REM Pharmacian App Launcher - Windows Batch Script
REM ============================================================
REM This script sets up and launches the Pharmacian application
REM with all required dependencies.
REM ============================================================

setlocal enabledelayedexpansion

REM Navigate to script directory
cd /d "%~dp0"

echo.
echo ============================================================
echo   PHARMACIAN - Clinical Disease Assessment System
echo ============================================================
echo.

REM Check for Node.js
echo [1/5] Checking Node.js installation...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo Found: %%i

REM Check for Python
echo.
echo [2/5] Checking Python installation...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found!
    echo Please install Python from: https://www.python.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do echo Found: %%i

REM Check for npm
echo.
echo [3/5] Checking npm installation...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found!
    echo npm should be installed with Node.js.
    echo.
    pause
    exit /b 1
)

REM Install Node dependencies
echo.
echo [4/5] Installing Node.js dependencies...
if exist "node_modules" (
    echo    node_modules already exists - skipping npm install
) else (
    echo    Installing packages from package.json...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Node.js dependencies!
        echo.
        pause
        exit /b 1
    )
)

REM Install Python dependencies
echo.
echo [5/5] Installing Python dependencies...
if exist "backend\requirements.txt" (
    echo    Installing packages from requirements.txt...
    python -m pip install -q -r backend\requirements.txt
    if %errorlevel% neq 0 (
        echo [WARNING] Some Python packages may have failed to install
        echo          But the app may still run. Continuing...
    ) else (
        echo    Python dependencies installed successfully
    )
) else (
    echo [WARNING] requirements.txt not found - skipping Python setup
)

REM Launch the app
echo.
echo ============================================================
echo   Launching Pharmacian...
echo ============================================================
echo.
echo   Frontend: http://localhost:3000 (Electron window)
echo   Backend:  http://localhost:5000 (Flask API)
echo   Database: %%APPDATA%%\Electron\pharmacian.db
echo.
echo   Press Ctrl+C to stop the application.
echo ============================================================
echo.

REM Start the app
npm run dev

REM If app exits, wait before closing
echo.
echo Application closed.
pause
exit /b 0
