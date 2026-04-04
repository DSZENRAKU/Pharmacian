/**
 * frontend/static/db_client.js
 * ─────────────────────────────
 * Renderer-side helper that calls window.pharmacianDB (injected by electron_bridge.js).
 * Use this in any HTML page to talk to SQLite through Electron IPC.
 *
 * Falls back gracefully when running in a plain browser (no Electron).
 */

const isElectron = typeof window !== "undefined" && !!window.pharmacianDB;

const DB = {

  // ── Guard ──────────────────────────────────────────────────────────────────
  _available() {
    if (!isElectron) {
      console.warn("[DB] Not running in Electron — SQLite unavailable. Using localStorage fallback.");
      return false;
    }
    return true;
  },

  // ── Patients ───────────────────────────────────────────────────────────────

  /**
   * Create a new patient record.
   * @param {{ full_name, age, gender, blood_group?, contact?, address?, notes? }} data
   * @returns {Promise<{ id, patient_code } | null>}
   */
  async insertPatient(data) {
    if (!this._available()) return null;
    const res = await window.pharmacianDB.insertPatient(data);
    if (!res.ok) { console.error("[DB] insertPatient:", res.error); return null; }
    return res.data;
  },

  /**
   * Fetch paginated patient list with optional filters.
   * @param {number} page
   * @param {number} limit
   * @param {Object} filters
   * @returns {Promise<{ patients, total, page, totalPages } | null>}
   */
  async getAllPatients(page = 1, limit = 10, filters = {}) {
    if (!this._available()) return null;
    const res = await window.pharmacianDB.getAllPatients(page, limit, filters);
    if (!res.ok) { console.error("[DB] getAllPatients:", res.error); return null; }
    return res.data;
  },

  /**
   * Get one patient plus their full prediction history.
   * @param {number} id
   * @returns {Promise<Object | null>}
   */
  async getPatientById(id) {
    if (!this._available()) return null;
    const res = await window.pharmacianDB.getPatientById(id);
    if (!res.ok) { console.error("[DB] getPatientById:", res.error); return null; }
    return res.data;
  },

  /**
   * Update patient fields.
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<boolean>}
   */
  async updatePatient(id, data) {
    if (!this._available()) return false;
    const res = await window.pharmacianDB.updatePatient(id, data);
    if (!res.ok) { console.error("[DB] updatePatient:", res.error); return false; }
    return res.data;
  },

  /**
   * Delete a patient (cascades to predictions & symptoms).
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async deletePatient(id) {
    if (!this._available()) return false;
    const res = await window.pharmacianDB.deletePatient(id);
    if (!res.ok) { console.error("[DB] deletePatient:", res.error); return false; }
    return res.data;
  },

  // ── Predictions ────────────────────────────────────────────────────────────

  /**
   * Save an AI assessment result for a patient.
   * @param {number} patientId
   * @param {Object} predData - { risk_level, primary_disease, confidence, raw_payload,
   *                              bmi?, blood_pressure?, blood_sugar?, heart_rate?,
   *                              symptoms: [{ name, severity? }] }
   * @returns {Promise<number | null>} - predictionId
   */
  async insertPrediction(patientId, predData) {
    if (!this._available()) return null;
    const res = await window.pharmacianDB.insertPrediction(patientId, predData);
    if (!res.ok) { console.error("[DB] insertPrediction:", res.error); return null; }
    return res.data;
  },

  /**
   * Get all predictions (with symptoms) for a patient.
   * @param {number} patientId
   * @returns {Promise<Array | null>}
   */
  async getPredictionHistory(patientId) {
    if (!this._available()) return null;
    const res = await window.pharmacianDB.getPredictionHistory(patientId);
    if (!res.ok) { console.error("[DB] getPredictionHistory:", res.error); return null; }
    return res.data;
  },

  // ── Utilities ──────────────────────────────────────────────────────────────

  /**
   * Simple patient search (non-paginated).
   * @param {Object} filters - { search: '...' }
   * @returns {Promise<Array>}
   */
  async getPatients(filters = {}) {
    if (!this._available()) return [];
    const res = await window.pharmacianDB.getPatients(filters);
    if (!res.ok) { console.error("[DB] getPatients:", res.error); return []; }
    return res.data || [];
  },

  /**
   * Clinical analytics for the dashboard.
   */
  async getDashboardStats() {
    if (!this._available()) return null;
    const res = await window.pharmacianDB.getDashboardStats();
    if (!res.ok) { console.error("[DB] getDashboardStats:", res.error); return null; }
    return res.data;
  },

  /**
   * Weekly assessment counts.
   */
  async getWeeklyTrend() {
    if (!this._available()) return [];
    const res = await window.pharmacianDB.getWeeklyTrend();
    if (!res.ok) { console.error("[DB] getWeeklyTrend:", res.error); return []; }
    return res.data || [];
  },

  /** Trigger a timestamped DB backup and return the file path. */
  async backup() {
    if (!this._available()) return null;
    const res = await window.pharmacianDB.backup();
    if (!res.ok) { console.error("[DB] backup:", res.error); return null; }
    return res.data;   // backup file path
  },

  /** Return the on-disk path of pharmacian.db */
  async getPath() {
    if (!this._available()) return null;
    const res = await window.pharmacianDB.getPath();
    return res.ok ? res.data : null;
  },
};


