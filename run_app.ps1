#Requires -Version 5.0
<#
.SYNOPSIS
    Pharmacian App Launcher - PowerShell Script
.DESCRIPTION
    Sets up and launches the Pharmacian application with all required
    dependencies (Node.js, Python, npm packages).
.EXAMPLE
    .\run_app.ps1
#>

# Stop on errors
$ErrorActionPreference = "Stop"

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   PHARMACIAN - Clinical Disease Assessment System" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Counter for progress
$step = 1
$totalSteps = 5

# Check for Node.js
Write-Host "[$step/$totalSteps] Checking Node.js installation..." -ForegroundColor Yellow
$step++

try {
    $nodeVersion = node --version
    Write-Host "  Found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Node.js not found!" -ForegroundColor Red
    Write-Host "  Please install from: https://nodejs.org/" -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}

# Check for Python
Write-Host ""
Write-Host "[$step/$totalSteps] Checking Python installation..." -ForegroundColor Yellow
$step++

try {
    $pythonVersion = python --version
    Write-Host "  Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Python not found!" -ForegroundColor Red
    Write-Host "  Please install from: https://www.python.org/" -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}

# Check for npm
Write-Host ""
Write-Host "[$step/$totalSteps] Checking npm installation..." -ForegroundColor Yellow
$step++

try {
    $npmVersion = npm --version
    Write-Host "  Found: npm $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] npm not found!" -ForegroundColor Red
    Write-Host "  npm should be installed with Node.js." -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}

# Install Node dependencies
Write-Host ""
Write-Host "[$step/$totalSteps] Installing Node.js dependencies..." -ForegroundColor Yellow
$step++

if (Test-Path "node_modules") {
    Write-Host "  node_modules already exists - skipping npm install" -ForegroundColor Cyan
} else {
    Write-Host "  Installing packages from package.json..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERROR] Failed to install dependencies!" -ForegroundColor Red
        Read-Host "  Press Enter to exit"
        exit 1
    }
    Write-Host "  Installation successful!" -ForegroundColor Green
}

# Install Python dependencies
Write-Host ""
Write-Host "[$step/$totalSteps] Installing Python dependencies..." -ForegroundColor Yellow

if (Test-Path "backend\requirements.txt") {
    Write-Host "  Installing packages from requirements.txt..." -ForegroundColor Cyan
    python -m pip install -q -r backend\requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [WARNING] Some Python packages failed to install" -ForegroundColor Yellow
        Write-Host "           But the app may still run." -ForegroundColor Yellow
    } else {
        Write-Host "  Python dependencies installed successfully!" -ForegroundColor Green
    }
} else {
    Write-Host "  [WARNING] requirements.txt not found - skipping Python setup" -ForegroundColor Yellow
}

# Launch the app
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   Launching Pharmacian..." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Frontend: Electron window" -ForegroundColor Magenta
Write-Host "   Backend:  http://localhost:5000" -ForegroundColor Magenta
Write-Host "   Database: $env:APPDATA\Electron\pharmacian.db" -ForegroundColor Magenta
Write-Host ""
Write-Host "   Press Ctrl+C to stop the application." -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Start the app
npm run dev

Write-Host ""
Write-Host "Application closed." -ForegroundColor Cyan
Read-Host "Press Enter to exit"
exit 0
