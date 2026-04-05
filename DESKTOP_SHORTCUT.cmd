@echo off
REM ============================================================
REM Pharmacian Desktop Shortcut Launcher
REM Place this file on your Desktop for quick access
REM ============================================================

setlocal enabledelayedexpansion

REM Get the project directory (modify this path if needed)
set PROJECT_DIR=%~dp0..\..\Pharmacian-monitoring

REM Validate directory exists
if not exist "%PROJECT_DIR%" (
    echo [ERROR] Could not find Pharmacian directory at:
    echo %PROJECT_DIR%
    echo.
    echo Please update the PATH in this batch file.
    pause
    exit /b 1
)

REM Change to project directory and launch
cd /d "%PROJECT_DIR%"
call run_app.cmd

pause
