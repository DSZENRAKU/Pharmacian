// electron/ipc_handlers.js
// Registers all IPC handlers that expose database operations to the renderer.
// Import and call registerIpcHandlers(ipcMain) once inside app.whenReady().

const { ipcMain, app, BrowserWindow, Notification, dialog } = require("electron");
const db  = require("./database");
const security = require("./security_utils");
const fs  = require("fs");
const path = require("path");

let currentUser = null;

function registerIpcHandlers() {

  // ── Helper: wrap any db call and return a standard { ok, data, error } envelope ──
  function handle(channel, fn) {
    ipcMain.handle(channel, async (_event, ...args) => {
      try {
        const data = await fn(...args);
        return { ok: true, data };
      } catch (err) {
        console.error(`[IPC:${channel}]`, err.message);
        return { ok: false, error: err.message };
      }
    });
  }

  // ── PDF Export ───────────────────────────────────────────────────────────
  /**
   * Generates a PDF from the provided HTML string using Electron's printToPDF().
   * Writes the file to the system Downloads folder.
   * Returns { ok, data: { path, filename } } or { ok: false, error }
   */
  ipcMain.handle("pdf:savePDF", async (event, htmlContent, filename) => {
    try {
      // 1. Create a hidden off-screen BrowserWindow to render the report
      const pdfWin = new BrowserWindow({
        show: false,
        width: 1200,
        height: 900,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });

      // 2. Load the HTML string as a data URL
      const dataUrl = "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent);
      await pdfWin.loadURL(dataUrl);

      // 3. Short delay so fonts/styles fully render
      await new Promise(res => setTimeout(res, 600));

      // 4. Generate PDF buffer
      const pdfBuffer = await pdfWin.webContents.printToPDF({
        printBackground: true,
        pageSize:        "A4",
        margins:         { top: 0, bottom: 0, left: 0, right: 0 },
        landscape:       false,
      });
      pdfWin.destroy();

      // 5. Resolve output path — user's Downloads folder
      const downloadsDir = app.getPath("downloads");
      const safeFilename  = (filename || "pharmacian-report.pdf").replace(/[/\\?%*:|"<>]/g, "-");
      const outputPath    = path.join(downloadsDir, safeFilename);

      // 6. Write to disk
      fs.writeFileSync(outputPath, pdfBuffer);
      console.log(`[PDF] Saved to: ${outputPath}`);

      return { ok: true, data: { path: outputPath, filename: safeFilename } };
    } catch (err) {
      console.error("[PDF] Error:", err.message);
      return { ok: false, error: err.message };
    }
  });

  // ── Window Controls & OS API ──────────────────────────────────────────────
  ipcMain.handle("window:minimize", (e) => {
      const win = BrowserWindow.fromWebContents(e.sender);
      if (win) win.minimize();
  });
  
  ipcMain.handle("window:maximize", (e) => {
      const win = BrowserWindow.fromWebContents(e.sender);
      if (win) {
          win.isMaximized() ? win.restore() : win.maximize();
      }
  });
  
  ipcMain.handle("window:close", (e) => {
      const win = BrowserWindow.fromWebContents(e.sender);
      if (win) win.close();
  });

  ipcMain.handle("os:notify", (e, { title, body }) => {
      if (Notification.isSupported()) {
          new Notification({
              title: title || "Pharmacian",
              body: body || "",
              icon: path.join(__dirname, "..", "frontend", "static", "logo.png")
          }).show();
      }
  });

  // ── Patients ──────────────────────────────────────────────────────────────
  handle("db:insertPatient",     (data)                    => db.insertPatient(data));
  handle("db:getAllPatients",    (page, limit, filters)     => db.getAllPatients(page, limit, filters));
  handle("db:getPatientById",   (id)                       => db.getPatientById(id));
  handle("db:updatePatient",    (id, data)                 => db.updatePatient(id, data));
  handle("db:deletePatient",    (id)                       => db.deletePatient(id));

  // ── Predictions ───────────────────────────────────────────────────────────
  handle("db:insertPrediction",      (patientId, predData) => db.insertPrediction(patientId, predData));
  handle("db:getPredictionHistory",  (patientId)           => db.getPredictionHistory(patientId));
  handle("db:getDashboardStats",     ()                    => db.getDashboardStats());
  handle("db:getRecentAssessments",  (limit)               => db.getRecentAssessments(limit));

  // ── Utilities ─────────────────────────────────────────────────────────────
  handle("db:backup",   ()  => db.backupDatabase());
  handle("db:getPath",  ()  => db.getDbPath());

  // ── Authentication ────────────────────────────────────────────────────────
  handle("auth:login", async (username, password) => {
    const user = db.verifyUser(username, password);
    if (user) {
      currentUser = user;
      // Check if this is admin using the default password (flag set in DB)
      currentUser._needsPasswordChange = db.userNeedsPasswordChange(user.id);
      return user;
    }
    return null;
  });

  handle("auth:logout", async () => {
    currentUser = null;
    return true;
  });

  // Returns { ok: true, data: user } when logged in
  // Returns { ok: false, error: 'not_authenticated' } when not logged in
  // nav.js uses this: if (!res.ok) → redirect to /
  ipcMain.handle("auth:getCurrentUser", async () => {
    if (!currentUser) {
      return { ok: false, error: "not_authenticated" };
    }
    return { ok: true, data: currentUser };
  });

  handle("auth:needsPasswordChange", async () => {
    if (!currentUser) return false;
    return currentUser._needsPasswordChange || false;
  });

  // Called by settings.html after a successful password change to clear the flag
  handle("auth:clearPasswordChangeFlag", async (userId) => {
    db.clearPasswordChangeFlag(userId);
    if (currentUser && currentUser.id === userId) {
      currentUser._needsPasswordChange = false;
    }
    return true;
  });

  handle("auth:createUser", async (username, password, role) => {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error("Unauthorised. Administrator privileges required.");
    }
    return db.createUser(username, password, role);
  });

  handle("auth:changePassword", async (userId, oldPassword, newPassword) => {
    if (!currentUser || (currentUser.id !== userId && currentUser.role !== 'admin')) {
      throw new Error("Unauthorised.");
    }
    
    const user = db.getDb().prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) return false;
    
    const { hash } = db.hashPassword(oldPassword, user.salt);
    if (hash !== user.password_hash) throw new Error("Incorrect current password.");

    return db.updatePassword(userId, newPassword);
  });

  // ── Encrypted Backup & Restore ─────────────────────────────────────────────
  ipcMain.handle("db:exportEncryptedBackup", async (event, password) => {
    try {
      const { filePath } = await dialog.showSaveDialog({
        title: "Export Encrypted Clinical Backup",
        defaultPath: `pharmacian_backup_${new Date().toISOString().split('T')[0]}.phr`,
        filters: [{ name: "Pharmacian Backup", extensions: ["phr"] }]
      });

      if (!filePath) return { ok: false, error: "Operation cancelled" };

      const dbPath = db.getDbPath();
      const buffer = fs.readFileSync(dbPath);
      const encrypted = security.encryptBuffer(buffer, password);
      
      fs.writeFileSync(filePath, encrypted);
      return { ok: true, data: filePath };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("db:importEncryptedBackup", async (event, password) => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: "Select Encrypted Clinical Backup",
        filters: [{ name: "Pharmacian Backup", extensions: ["phr"] }],
        properties: ['openFile']
      });

      if (!filePaths || filePaths.length === 0) return { ok: false, error: "No file selected" };

      const encryptedData = fs.readFileSync(filePaths[0]);
      const decryptedBuffer = security.decryptBuffer(encryptedData, password);

      // Verify it's a valid SQLite file by checking the header
      if (decryptedBuffer.subarray(0, 15).toString() !== "SQLite format 3") {
        throw new Error("Invalid backup: Not a valid Pharmacian database.");
      }

      const dbPath = db.getDbPath();
      // Safety backup
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, dbPath + ".pre-restore.bak");
      }

      // Restore decrypted database file (overwrite current DB)
      fs.writeFileSync(dbPath, decryptedBuffer);

      // Re-initialize DB (closes old connection and opens restored DB)
      db.createDatabase();
      
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  console.log("[IPC] All DB handlers registered.");
}

module.exports = { registerIpcHandlers };
