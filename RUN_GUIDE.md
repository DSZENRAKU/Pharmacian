# 🚀 How to Run Pharmacian

This guide explains the different ways to launch the Pharmacian application.

---

## ⚡ Quick Start (Recommended)

### Windows Users

**Option A: Batch Script (Easiest)**
```bash
# Double-click or run from PowerShell:
.\run_app.cmd
```

**Option B: PowerShell Script**
```powershell
# From PowerShell:
.\run_app.ps1
```

**Option C: Manual Command**
```bash
npm run dev
```

### Mac/Linux Users

```bash
# Make script executable
chmod +x run_app.sh

# Run the script
./run_app.sh
```

---

## 📋 What These Scripts Do

All launch scripts automatically:

1. ✅ Check if **Node.js** is installed
2. ✅ Check if **Python 3** is installed  
3. ✅ Check if **npm** is available
4. ✅ Install Node.js dependencies (`npm install`)
5. ✅ Install Python dependencies (`pip install -r backend/requirements.txt`)
6. ✅ Launch the Electron app + Flask backend
7. ✅ Display helpful info about running services

**Advantages:**
- Automatic dependency management
- Clear progress indicators
- Error messages if something is missing
- Safe to run multiple times

---

## 🔧 Manual Setup (If Scripts Don't Work)

### Step 1: Install Prerequisites
- **Node.js 16+**: https://nodejs.org/
- **Python 3.10+**: https://www.python.org/

### Step 2: Install Dependencies
```bash
# Install Node packages
npm install

# Install Python packages
pip install -r backend/requirements.txt
```

### Step 3: Launch App
```bash
npm run dev
```

---

## 🌐 What's Running When App Starts

When you run the app, you'll see:

| Service | URL | Purpose |
|---------|-----|---------|
| **Electron Frontend** | Desktop App | Graphical user interface |
| **Flask Backend** | `localhost:5000` | Disease prediction API |
| **SQLite Database** | `~/.Electron/pharmacian.db` | Patient records storage |

---

## 🛑 Stopping the App

- **Windows**: Press `Ctrl + C` in the terminal
- **Mac/Linux**: Press `Ctrl + C` in the terminal

Or close the Electron window directly.

---

## ⚠️ Troubleshooting

### "Node.js not found"
**Fix**: Install from https://nodejs.org/

### "Python not found"
**Fix**: Install from https://www.python.org/

### "npm: command not found"
**Fix**: Restart terminal or reinstall Node.js

### "Port 5000 already in use"
**Fix**: 
```bash
# Windows - Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <pid> /F

# Mac/Linux
lsof -i :5000
kill -9 <pid>
```

### App won't start / Models missing
**Fix**: Regenerate models
```bash
cd backend/src
python train_classifier_model.py
```

### Database corrupted
**Fix**: Delete and restart (will clear patient records)
```bash
# Windows
del %APPDATA%\Electron\pharmacian.db

# Mac/Linux
rm ~/.Electron/pharmacian.db
```

Then restart the app.

---

## 📦 Build Production Installer

To create a standalone Windows installer (.exe):

```bash
npm run build
```

Output: `dist/Pharmacian Setup 1.0.0.exe`

This can be distributed and installed on any Windows machine without requiring Node.js or Python.

---

## 🔄 Development Mode vs Production

**Development Mode** (`npm run dev`):
- Real-time reloading when code changes
- Verbose logging
- Debug tools enabled
- Good for development/testing

**Production Build** (`npm run build`):
- Optimized and minified
- Single .exe installer
- No dependencies required for end-users
- Ready for distribution

---

## 📝 Script Files Reference

- **`run_app.cmd`** - Windows batch script (best for click-to-run)
- **`run_app.ps1`** - Windows PowerShell script (detailed output)
- **`run_app.sh`** - Linux/macOS shell script
- **`launch_pharmacian.cmd`** - Legacy launcher (basic)

Recommend using `run_app.cmd` or `run_app.ps1` for the best experience on Windows.

---

## 🎓 For First-Time Users

1. Clone/download the project
2. Open terminal in project directory
3. Run: `.\run_app.cmd` (Windows) or `./run_app.sh` (Mac/Linux)
4. Wait for Electron window to appear
5. Start creating patient assessments!

That's it! 🎉

---

**Last Updated**: April 2026  
**Support**: Open an issue on GitHub or contact the team
