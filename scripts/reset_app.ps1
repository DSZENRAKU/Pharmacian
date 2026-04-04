# Pharmacian Nuclear Reset Script
# This script force-terminates any hanging processes that prevent the app from starting.

Write-Host "--- Pharmacian System Reset ---" -ForegroundColor Cyan

# 1. Kill Electron Processes
Write-Host "Step 1: Terminating Electron processes..." -ForegroundColor Yellow
taskkill /F /IM electron.exe /T 2>$null
if ($LASTEXITCODE -eq 0) { Write-Host "✔ Electron processes terminated." -ForegroundColor Green }
else { Write-Host "i No active Electron processes found." -ForegroundColor Gray }

# 2. Kill Python Backend Processes
Write-Host "Step 2: Terminating Python backend processes..." -ForegroundColor Yellow
taskkill /F /IM python.exe /T 2>$null
if ($LASTEXITCODE -eq 0) { Write-Host "✔ Python processes terminated." -ForegroundColor Green }
else { Write-Host "i No active Python processes found." -ForegroundColor Gray }

# 3. Cache Clearing Instructions
Write-Host "`n--- Manual Action Required ---" -ForegroundColor Red
Write-Host "If the 'Access is denied' error persists, please manually delete the cache folder:"
Write-Host "$env:APPDATA\Electron\Cache" -ForegroundColor White
Write-Host "----------------------------"

Write-Host "`nYou can now try running 'node electron/dev_launcher.js' again." -ForegroundColor Cyan
pause
