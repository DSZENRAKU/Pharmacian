#!/bin/bash
#============================================================
# Pharmacian App Launcher - Cross-Platform Shell Script
#============================================================
# This script sets up and launches the Pharmacian application
# for Linux/macOS systems with all required dependencies.
#============================================================

set -e

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo ""
echo "============================================================"
echo "   PHARMACIAN - Clinical Disease Assessment System"
echo "============================================================"
echo ""

STEP=1
TOTAL_STEPS=5

# Check for Node.js
echo "[$STEP/$TOTAL_STEPS] Checking Node.js installation..."
((STEP++))

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found!"
    echo "Please install Node.js from: https://nodejs.org/"
    echo ""
    exit 1
fi
NODE_VERSION=$(node --version)
echo "  Found: $NODE_VERSION"

# Check for Python
echo ""
echo "[$STEP/$TOTAL_STEPS] Checking Python installation..."
((STEP++))

if ! command -v python3 &> /dev/null; then
    if ! command -v python &> /dev/null; then
        echo "[ERROR] Python not found!"
        echo "Please install Python from: https://www.python.org/"
        echo ""
        exit 1
    fi
    PYTHON_CMD="python"
else
    PYTHON_CMD="python3"
fi
PYTHON_VERSION=$($PYTHON_CMD --version)
echo "  Found: $PYTHON_VERSION"

# Check for npm
echo ""
echo "[$STEP/$TOTAL_STEPS] Checking npm installation..."
((STEP++))

if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm not found!"
    echo "npm should be installed with Node.js."
    echo ""
    exit 1
fi
NPM_VERSION=$(npm --version)
echo "  Found: npm $NPM_VERSION"

# Install Node dependencies
echo ""
echo "[$STEP/$TOTAL_STEPS] Installing Node.js dependencies..."
((STEP++))

if [ -d "node_modules" ]; then
    echo "  node_modules already exists - skipping npm install"
else
    echo "  Installing packages from package.json..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install Node.js dependencies!"
        echo ""
        exit 1
    fi
    echo "  Installation successful!"
fi

# Install Python dependencies
echo ""
echo "[$STEP/$TOTAL_STEPS] Installing Python dependencies..."

if [ -f "backend/requirements.txt" ]; then
    echo "  Installing packages from requirements.txt..."
    $PYTHON_CMD -m pip install -q -r backend/requirements.txt
    if [ $? -ne 0 ]; then
        echo "  [WARNING] Some Python packages failed to install"
        echo "           But the app may still run."
    else
        echo "  Python dependencies installed successfully!"
    fi
else
    echo "  [WARNING] requirements.txt not found - skipping Python setup"
fi

# Launch the app
echo ""
echo "============================================================"
echo "   Launching Pharmacian..."
echo "============================================================"
echo ""
echo "   Frontend: Electron window"
echo "   Backend:  http://localhost:5000"
if [ "$OSTYPE" == "darwin"* ]; then
    DB_PATH="$HOME/Library/Application Support/Electron/pharmacian.db"
else
    DB_PATH="$HOME/.Electron/pharmacian.db"
fi
echo "   Database: $DB_PATH"
echo ""
echo "   Press Ctrl+C to stop the application."
echo "============================================================"
echo ""

# Start the app
npm run dev

echo ""
echo "Application closed."
exit 0
