// electron/electron_bridge.js  (preload script)
// Exposes a safe, curated "window.pharmacianDB" API to the renderer.
// contextIsolation MUST be true in desktop_main.js (it already is).

const { contextBridge, ipcRenderer } = require("electron");

/**
 * Thin wrapper around ipcRenderer.invoke.
 * Returns { ok, data, error } — same shape as ipc_handlers.js responses.
 */
const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld("pharmacianDB", {

  // ── Patients ──────────────────────────────────────────────────────────────
  /**
   * @param {{ full_name, age, gender, blood_group?, contact?, address?, notes? }} data
   * @returns {Promise<{ ok: boolean, data: { id, patient_code }, error?: string }>}
   */
  insertPatient: (data)                  => invoke("db:insertPatient", data),

  /**
   * @param {number} page    - 1-based page number
   * @param {number} limit   - rows per page (10 | 25 | 50)
   * @param {{ search?, gender?, blood_group?, risk_level?, dateFrom?, dateTo? }} filters
   * @returns {Promise<{ ok, data: { patients, total, page, totalPages } }>}
   */
  getAllPatients: (page, limit, filters) => invoke("db:getAllPatients", page, limit, filters),

  /**
   * @param {number} id
   * @returns {Promise<{ ok, data: patient & { predictions: [] } }>}
   */
  getPatientById: (id)                  => invoke("db:getPatientById", id),

  /**
   * Simple patient search (non-paginated).
   * @param {Object} filters - { search: '...' }
   * @returns {Promise<{ ok, data: Array }>}
   */
  getPatients: (filters)                => invoke("db:getPatients", filters),

  /**
   * @param {number} id
   * @param {Object} data - partial patient fields to update
   * @returns {Promise<{ ok, data: boolean }>}
   */
  updatePatient: (id, data)             => invoke("db:updatePatient", id, data),

  /**
   * @param {number} id
   * @returns {Promise<{ ok, data: boolean }>}
   */
  deletePatient: (id)                   => invoke("db:deletePatient", id),

  // ── Predictions ───────────────────────────────────────────────────────────
  /**
   * @param {number} patientId
   * @param {{ risk_level, primary_disease, confidence, raw_payload, bmi?,
   *           blood_pressure?, blood_sugar?, heart_rate?,
   *           symptoms: [{ name, severity? }] }} predData
   * @returns {Promise<{ ok, data: number }>}  - prediction ID
   */
  insertPrediction: (patientId, pred)   => invoke("db:insertPrediction", patientId, pred),

  /**
   * @param {number} patientId
   * @returns {Promise<{ ok, data: Array }>}
   */
  getPredictionHistory: (patientId)     => invoke("db:getPredictionHistory", patientId),

  /** Aggregates clinical statistics for the high-level dashboard. */
  getDashboardStats:    ()              => invoke("db:getDashboardStats"),

  /** Weekly assessment counts. */
  getWeeklyTrend:       ()              => invoke("db:getWeeklyTrend"),

  /** Fetch the N most recent assessments with patient names. */
  getRecentAssessments: (limit)         => invoke("db:getRecentAssessments", limit),

  /** Encrypted Backup & Restore */
  exportBackup: (password) => ipcRenderer.invoke("db:exportEncryptedBackup", password),
  importBackup: (password) => ipcRenderer.invoke("db:importEncryptedBackup", password),

  // ── Utilities ─────────────────────────────────────────────────────────────
  /** Backup the DB file and return the backup path. */
  backup:  ()  => invoke("db:backup"),

  /** Get the path to pharmacian.db on disk. */
  getPath: ()  => invoke("db:getPath"),
});

// ── PDF API ────────────────────────────────────────────────────────────────────
/**
 * window.pharmacianPDF.savePDF(htmlString, filename)
 *   → Promise<{ ok: boolean, data: { path, filename }, error?: string }>
 *
 * Triggers the main process to render the HTML in a hidden window,
 * export it as PDF via printToPDF(), and write it to the Downloads folder.
 */
contextBridge.exposeInMainWorld("pharmacianPDF", {
  /**
   * @param {string} htmlContent  - Full HTML document string
   * @param {string} filename     - e.g. "pharmacian-report-jane-doe-2026-04-04.pdf"
   */
  savePDF: (htmlContent, filename) => ipcRenderer.invoke("pdf:savePDF", htmlContent, filename),
});

// ── OS API ──────────────────────────────────────────────────────────────────────
contextBridge.exposeInMainWorld("pharmacianApp", {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close:    () => ipcRenderer.invoke("window:close"),
    notify:   (title, body) => ipcRenderer.invoke("os:notify", { title, body }),
});

// ── Auth API ────────────────────────────────────────────────────────────────────
contextBridge.exposeInMainWorld("pharmacianAuth", {
    login:                  (u, p)          => ipcRenderer.invoke("auth:login", u, p),
    logout:                 ()              => ipcRenderer.invoke("auth:logout"),
    getUser:                ()              => ipcRenderer.invoke("auth:getCurrentUser"),
    createUser:             (u, p, r)       => ipcRenderer.invoke("auth:createUser", u, p, r),
    changePassword:         (uid, old, n)   => ipcRenderer.invoke("auth:changePassword", uid, old, n),
    needsPasswordChange:    ()              => ipcRenderer.invoke("auth:needsPasswordChange"),
    clearPasswordChangeFlag:(uid)           => ipcRenderer.invoke("auth:clearPasswordChangeFlag", uid),
});
