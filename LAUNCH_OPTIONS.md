# 🚀 Pharmacian Launch Scripts

Quick reference for all available launch methods:

---

## ⭐ **RECOMMENDED FOR MOST USERS**

### Windows:
```cmd
.\run_app.cmd
```
**Why**: Easiest to use, can double-click to run, automatic setup

### Mac/Linux:
```bash
./run_app.sh
```
**Why**: Same as Windows - automatic setup and dependency checking

---

## 📱 Alternative Launch Methods

### PowerShell (Windows - Advanced Users)
```powershell
.\run_app.ps1
```
**Features**: Colorized output, better error messages

### Legacy Batch (Windows)
```cmd
.\launch_pharmacian.cmd
```
**Note**: Basic launcher, use `run_app.cmd` instead

### Manual Command (All Platforms)
```bash
npm run dev
```
**Note**: Requires manual dependency installation first

---

## 📂 Script Files Overview

| File | Platform | Type | Best For | Click to Run |
|------|----------|------|----------|-------------|
| `run_app.cmd` | Windows | Batch | Primary launcher | ✅ Yes |
| `run_app.ps1` | Windows | PowerShell | Advanced/detailed | ❌ No* |
| `run_app.sh` | Mac/Linux | Shell | Primary launcher | ✅ Yes** |
| `launch_pharmacian.cmd` | Windows | Batch | Legacy/backup | ✅ Yes |
| `DESKTOP_SHORTCUT.cmd` | Windows | Batch | Desktop launcher | ✅ Yes |

*PowerShell: Right-click → "Run with PowerShell"  
**Mac/Linux: May need `chmod +x run_app.sh` first

---

## 🎯 Quick Start for Different Users

### Just Want to Run It?
→ **Double-click `run_app.cmd`** (Windows) or **`./run_app.sh`** (Mac/Linux)

### Developer / Seeing Details?
→ **Run `.\run_app.ps1`** (Windows) or **`./run_app.sh`** (Mac/Linux)

### Already Have Dependencies Installed?
→ **Run `npm run dev`** from terminal

### Never Installed Anything Before?
→ **Double-click `run_app.cmd`** and wait 5-10 minutes for first setup

---

## 🔧 What Each Script Does

All scripts perform:
1. ✅ Check Node.js installed
2. ✅ Check Python installed
3. ✅ Check npm available
4. ✅ Install Node packages (`npm install`)
5. ✅ Install Python packages (`pip install -r backend/requirements.txt`)
6. ✅ Launch the Electron app
7. ✅ Start Flask backend

Differences:
- **`.cmd`**: Silent, faster, standard Windows
- **`.ps1`**: Colorful output, better for debugging
- **`.sh`**: Works on Mac/Linux, checks for python3

---

## 📖 For More Details

See **`RUN_GUIDE.md`** for:
- Detailed setup instructions
- Troubleshooting guide
- Port information
- Building production installer
- Development vs production mode

---

## ✨ Pro Tips

**Create Desktop Shortcut** (Windows):
1. Copy `DESKTOP_SHORTCUT.cmd` to your Desktop
2. Right-click → Rename → `Pharmacian Launcher.cmd`
3. Double-click anytime to launch!

**Minimize to Tray** (Windows):
Electron app minimizes to Windows taskbar (tray icon available in future versions)

**Keep Logs** (Debugging):
Logs automatically saved to `logs/` directory

---

**Questions?** Check `RUN_GUIDE.md` Troubleshooting section
