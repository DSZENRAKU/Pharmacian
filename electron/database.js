// electron/database.js
// Pharmacian — SQLite database layer using better-sqlite3
// Runs ONLY in the main process. Never import this in a renderer.

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { app } = require("electron");

let db = null;

// ─────────────────────────────────────────────
// 1. DATABASE INITIALISATION
// ─────────────────────────────────────────────

/**
 * Returns the absolute path to the SQLite DB file.
 * Electron stores app data in:
 *   Windows → %APPDATA%\pharmacian-monitoring-desktop\
 *   macOS   → ~/Library/Application Support/pharmacian-monitoring-desktop/
 *   Linux   → ~/.config/pharmacian-monitoring-desktop/
 */
function getDbPath() {
  const userDataDir = app.getPath("userData");
  return path.join(userDataDir, "pharmacian.db");
}

/**
 * Open (or create) the SQLite database and run all DDL migrations.
 * Call this once at app startup in main.js.
 */
function createDatabase() {
  const dbPath = getDbPath();
  
  // If a connection is already open, close it before re-opening.
  // This is critical for the 'Restore' functionality to work without file locks.
  if (db) {
    try {
      db.close();
      console.log("[DB] Closed existing connection.");
    } catch (e) {
      console.error("[DB] Error closing existing connection:", e.message);
    }
  }

  console.log(`[DB] Opening database at: ${dbPath}`);
  db = new Database(dbPath, { verbose: null });

  // Enable WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // ── Schema ─────────────────────────────────

  db.exec(`
    -- PATIENTS table: core demographics
    CREATE TABLE IF NOT EXISTS patients (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_code    TEXT    UNIQUE NOT NULL,
      full_name       TEXT    NOT NULL,
      age             INTEGER NOT NULL CHECK(age BETWEEN 0 AND 130),
      gender          TEXT    NOT NULL CHECK(gender IN ('Male','Female','Other')),
      blood_group     TEXT,
      contact         TEXT,
      address         TEXT,
      notes           TEXT,
      deleted_at      TEXT    DEFAULT NULL,
      created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    -- PREDICTIONS table: one row per AI assessment run
    CREATE TABLE IF NOT EXISTS predictions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id      INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      risk_level      TEXT    NOT NULL CHECK(risk_level IN ('Low','Medium','High')),
      primary_disease TEXT,
      confidence      REAL,
      raw_payload     TEXT,
      bmi             REAL,
      blood_pressure  TEXT,
      blood_sugar     REAL,
      heart_rate      INTEGER,
      created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    -- SYMPTOMS table: normalised symptom tags per prediction
    CREATE TABLE IF NOT EXISTS symptoms (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      prediction_id   INTEGER NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
      symptom_name    TEXT    NOT NULL,
      severity        TEXT    CHECK(severity IN ('Mild','Moderate','Severe'))
    );

    -- INDEXES for fast lookups
    CREATE INDEX IF NOT EXISTS idx_patients_code    ON patients(patient_code);
    CREATE INDEX IF NOT EXISTS idx_predictions_pid  ON predictions(patient_id);
    CREATE INDEX IF NOT EXISTS idx_symptoms_pred    ON symptoms(prediction_id);

    -- USERS table: clinicians and admins
    CREATE TABLE IF NOT EXISTS users (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      username              TEXT    UNIQUE NOT NULL,
      password_hash         TEXT    NOT NULL,
      salt                  TEXT    NOT NULL,
      role                  TEXT    NOT NULL CHECK(role IN ('admin','clinician')),
      needs_password_change INTEGER NOT NULL DEFAULT 0,
      created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `);

  // Migrate: add needs_password_change column for existing DBs
  try {
    db.exec(`ALTER TABLE users ADD COLUMN needs_password_change INTEGER NOT NULL DEFAULT 0`);
  } catch (_) { /* column already exists — ignore */ }

  // Migrate: add deleted_at column for existing patient DBs
  try {
    db.exec(`ALTER TABLE patients ADD COLUMN deleted_at TEXT DEFAULT NULL`);
  } catch (_) { /* column already exists — ignore */ }

  // Initialize Default Admin if no users exist
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  if (userCount === 0) {
    console.log("[DB] Initialising default administrator account...");
    const { hash, salt } = hashPassword("admin123");
    // needs_password_change=1 forces admin to change password on first login
    db.prepare("INSERT INTO users (username, password_hash, salt, role, needs_password_change) VALUES (?, ?, ?, ?, ?)")
      .run("admin", hash, salt, "admin", 1);
  }
  // Ensure a guest account exists for kiosk/demo mode
  const guest = db.prepare("SELECT id FROM users WHERE username = ?").get("guest");
  if (!guest) {
    const { hash, salt } = hashPassword("guest");
    db.prepare("INSERT INTO users (username, password_hash, salt, role) VALUES (?, ?, ?, ?)")
      .run("guest", hash, salt, "clinician");
  }

  console.log("[DB] Schema ready.");
  return db;
}

// Ensure DB is initialised before any operation
function getDb() {
  if (!db) throw new Error("Database not initialised. Call createDatabase() first.");
  return db;
}

// ─────────────────────────────────────────────
// 2. PATIENT CRUD
// ─────────────────────────────────────────────

/**
 * Generate a sequential patient code like "PHR-1001".
 */
function generatePatientCode() {
  const row = getDb().prepare(`
    SELECT MAX(CAST(SUBSTR(patient_code, 5) AS INTEGER)) AS max_code
    FROM patients
    WHERE patient_code LIKE 'PHR-%'
  `).get();
  const maxCode = row && row.max_code ? row.max_code : 1000;
  return `PHR-${maxCode + 1}`;
}

/**
 * Insert a new patient record.
 * @param {Object} data - { full_name, age, gender, blood_group?, contact?, address?, notes? }
 * @returns {Object} - { id, patient_code }
 */
function insertPatient(data) {
  try {
    const code = generatePatientCode();
    const stmt = getDb().prepare(`
      INSERT INTO patients (patient_code, full_name, age, gender, blood_group, contact, address, notes)
      VALUES (@patient_code, @full_name, @age, @gender, @blood_group, @contact, @address, @notes)
    `);
    const result = stmt.run({
      patient_code: code,
      full_name:    data.full_name,
      age:          data.age,
      gender:       data.gender,
      blood_group:  data.blood_group  || null,
      contact:      data.contact      || null,
      address:      data.address      || null,
      notes:        data.notes        || null,
    });
    return { id: result.lastInsertRowid, patient_code: code };
  } catch (err) {
    throw new DbError("insertPatient", err);
  }
}

/**
 * Paginated patient list with optional filters.
 * @param {number} page   - 1-based
 * @param {number} limit  - rows per page
 * @param {Object} filters - { search?, gender?, blood_group?, risk_level?, dateFrom?, dateTo? }
 * @returns {{ patients: Array, total: number, page: number, totalPages: number }}
 */
function getAllPatients(page = 1, limit = 10, filters = {}) {
  try {
    const { search, gender, blood_group, risk_level, dateFrom, dateTo } = filters;
    const conditions = [];
    const params = {};

    if (search) {
      conditions.push("(p.full_name LIKE @search OR p.patient_code LIKE @search)");
      params.search = `%${search}%`;
    }
    if (gender)       { conditions.push("p.gender = @gender");             params.gender = gender; }
    if (blood_group)  { conditions.push("p.blood_group = @blood_group");   params.blood_group = blood_group; }
    if (dateFrom)     { conditions.push("p.created_at >= @dateFrom");       params.dateFrom = dateFrom; }
    if (dateTo)       { conditions.push("p.created_at <= @dateTo");         params.dateTo = dateTo; }

    // Risk level JOIN filter
    const riskJoin = risk_level
      ? `INNER JOIN (
           SELECT patient_id, risk_level,
                  ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY created_at DESC) AS rn
           FROM predictions
         ) latest_pred ON latest_pred.patient_id = p.id AND latest_pred.rn = 1 AND latest_pred.risk_level = @risk_level`
      : `LEFT JOIN (
           SELECT patient_id, risk_level, primary_disease, created_at,
                  ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY created_at DESC) AS rn
           FROM predictions
         ) latest_pred ON latest_pred.patient_id = p.id AND latest_pred.rn = 1`;

    if (risk_level) params.risk_level = risk_level;

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "WHERE p.deleted_at IS NULL";
    // Always exclude soft-deleted patients
    const baseWhere = where === `WHERE p.deleted_at IS NULL`
      ? `WHERE p.deleted_at IS NULL`
      : `${where} AND p.deleted_at IS NULL`;
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) AS c FROM patients p ${riskJoin} ${baseWhere}`;
    const totalRow = getDb().prepare(countQuery).get(params);
    const total = totalRow.c;

    const dataQuery = `
      SELECT p.*, latest_pred.risk_level AS last_risk, latest_pred.primary_disease AS last_disease,
             latest_pred.created_at AS last_scan
      FROM patients p
      ${riskJoin}
      ${baseWhere}
      ORDER BY p.created_at DESC
      LIMIT @limit OFFSET @offset
    `;
    const patients = getDb().prepare(dataQuery).all({ ...params, limit, offset });

    return {
      patients,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  } catch (err) {
    throw new DbError("getAllPatients", err);
  }
}

/**
 * Fetch a single patient by ID, including their full prediction history summary.
 */
function getPatientById(id) {
  try {
    const patient = getDb().prepare("SELECT * FROM patients WHERE id = ? AND deleted_at IS NULL").get(id);
    if (!patient) return null;
    const predictions = getDb().prepare(
      "SELECT id, risk_level, primary_disease, confidence, bmi, blood_pressure, blood_sugar, heart_rate, created_at FROM predictions WHERE patient_id = ? ORDER BY created_at DESC"
    ).all(id);
    return { ...patient, predictions };
  } catch (err) {
    throw new DbError("getPatientById", err);
  }
}

/**
 * Update patient demographics.
 * @param {number} id
 * @param {Object} data - any subset of patient fields
 * @returns {boolean} - true if a row was updated
 */
function updatePatient(id, data) {
  try {
    const allowed = ["full_name", "age", "gender", "blood_group", "contact", "address", "notes"];
    const fields = allowed.filter(f => data[f] !== undefined);
    if (fields.length === 0) return false;

    const setClause = fields.map(f => `${f} = @${f}`).join(", ");
    const stmt = getDb().prepare(`
      UPDATE patients SET ${setClause},
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id = @id
    `);
    const result = stmt.run({ ...data, id });
    return result.changes > 0;
  } catch (err) {
    throw new DbError("updatePatient", err);
  }
}

/**
 * Soft-delete a patient by setting deleted_at timestamp.
 * Patients are filtered from all queries but predictions are preserved in the DB.
 */
function deletePatient(id) {
  try {
    const result = getDb().prepare(`
      UPDATE patients SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id = ? AND deleted_at IS NULL
    `).run(id);
    return result.changes > 0;
  } catch (err) {
    throw new DbError("deletePatient", err);
  }
}

// ─────────────────────────────────────────────
// 3. PREDICTIONS
// ─────────────────────────────────────────────

/**
 * Store a prediction result returned by the Flask /predict endpoint.
 * @param {number} patientId
 * @param {Object} predData - { risk_level, primary_disease, confidence, raw_payload (JSON string),
 *                              bmi?, blood_pressure?, blood_sugar?, heart_rate?,
 *                              symptoms: [{ name, severity? }] }
 * @returns {number} prediction ID
 */
function insertPrediction(patientId, predData) {
  try {
    const insertPred = getDb().prepare(`
      INSERT INTO predictions
        (patient_id, risk_level, primary_disease, confidence, raw_payload, bmi, blood_pressure, blood_sugar, heart_rate)
      VALUES
        (@patient_id, @risk_level, @primary_disease, @confidence, @raw_payload, @bmi, @blood_pressure, @blood_sugar, @heart_rate)
    `);
    const insertSymptom = getDb().prepare(`
      INSERT INTO symptoms (prediction_id, symptom_name, severity)
      VALUES (@prediction_id, @symptom_name, @severity)
    `);

    // Wrap both inserts in a transaction for atomicity
    const transaction = getDb().transaction((pid, data) => {
      const result = insertPred.run({
        patient_id:      pid,
        risk_level:      data.risk_level,
        primary_disease: data.primary_disease || null,
        confidence:      data.confidence || null,
        raw_payload:     typeof data.raw_payload === "string"
                           ? data.raw_payload
                           : JSON.stringify(data.raw_payload || {}),
        bmi:             data.bmi || null,
        blood_pressure:  data.blood_pressure || null,
        blood_sugar:     data.blood_sugar || null,
        heart_rate:      data.heart_rate || null,
      });
      const predId = result.lastInsertRowid;
      (data.symptoms || []).forEach(s => {
        insertSymptom.run({
          prediction_id: predId,
          symptom_name:  s.name,
          severity:      s.severity || null,
        });
      });
      return predId;
    });

    return transaction(patientId, predData);
  } catch (err) {
    throw new DbError("insertPrediction", err);
  }
}

/**
 * Get full prediction history for a patient, including symptoms per prediction.
 */
function getPredictionHistory(patientId) {
  try {
    const predictions = getDb().prepare(`
      SELECT * FROM predictions WHERE patient_id = ? ORDER BY created_at DESC
    `).all(patientId);

    return predictions.map(pred => {
      const symptoms = getDb().prepare(
        "SELECT symptom_name, severity FROM symptoms WHERE prediction_id = ?"
      ).all(pred.id);
      return { ...pred, symptoms };
    });
  } catch (err) {
    throw new DbError("getPredictionHistory", err);
  }
}

/**
 * Aggregates clinical statistics for the high-level dashboard.
 */
function getDashboardStats() {
  try {
    const db = getDb();
    
    // 1. Total Patients
    const totalPatients = db.prepare("SELECT COUNT(*) AS c FROM patients").get().c;
    
    // 2. Predictions Today (UTC based to match created_at storage)
    const predictionsToday = db.prepare("SELECT COUNT(*) AS c FROM predictions WHERE date(created_at) = date('now')").get().c;
    
    // 3. High Risk Cases
    const highRiskCases = db.prepare("SELECT COUNT(*) AS c FROM predictions WHERE risk_level = 'High'").get().c;
    
    // 4. Weekly Trend (last 7 days counts)
    const weeklyTrend = db.prepare(`
      SELECT date(created_at) as day, COUNT(*) as count 
      FROM predictions 
      WHERE created_at >= date('now', '-7 days')
      GROUP BY day 
      ORDER BY day ASC
    `).all();
    
    // 5. Disease Distribution (top 5)
    const diseaseDistribution = db.prepare(`
      SELECT primary_disease, COUNT(*) as count 
      FROM predictions 
      WHERE primary_disease IS NOT NULL
      GROUP BY primary_disease 
      ORDER BY count DESC 
      LIMIT 5
    `).all();

    return {
      totalPatients,
      predictionsToday,
      highRiskCases,
      weeklyTrend,
      diseaseDistribution
    };
  } catch (err) {
    throw new DbError("getDashboardStats", err);
  }
}

/**
 * Fetch the N most recent assessments with patient names.
 */
function getRecentAssessments(limit = 8) {
  try {
    return getDb().prepare(`
      SELECT p.id as patient_id, p.full_name, p.age, pr.risk_level, pr.primary_disease, pr.created_at
      FROM predictions pr
      JOIN patients p ON pr.patient_id = p.id
      ORDER BY pr.created_at DESC
      LIMIT ?
    `).all(limit);
  } catch (err) {
    throw new DbError("getRecentAssessments", err);
  }
}

// ─────────────────────────────────────────────
// 4. USER AUTHENTICATION & MANAGEMENT
// ─────────────────────────────────────────────

/**
 * Hash a password using PBKDF2.
 */
function hashPassword(password, salt = null) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, s, 1000, 64, "sha512").toString("hex");
  return { hash, salt: s };
}

/**
 * Verify credentials.
 */
function verifyUser(username, password) {
  try {
    const user = getDb().prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (!user) return null;

    const { hash } = hashPassword(password, user.salt);
    if (hash === user.password_hash) {
      const { password_hash, salt, ...safeUser } = user;
      return safeUser;
    }
    return null;
  } catch (err) {
    throw new DbError("verifyUser", err);
  }
}

/**
 * Update user password.
 */
function updatePassword(userId, newPassword) {
  try {
    const { hash, salt } = hashPassword(newPassword);
    const result = getDb().prepare("UPDATE users SET password_hash = ?, salt = ?, needs_password_change = 0 WHERE id = ?")
      .run(hash, salt, userId);
    return result.changes > 0;
  } catch (err) {
    throw new DbError("updatePassword", err);
  }
}

/**
 * Create a new clinical user (Admin only).
 */
function createUser(username, password, role = "clinician") {
  try {
    const { hash, salt } = hashPassword(password);
    const result = getDb().prepare("INSERT INTO users (username, password_hash, salt, role, needs_password_change) VALUES (?, ?, ?, ?, 1)")
      .run(username, hash, salt, role);
    return result.lastInsertRowid;
  } catch (err) {
    throw new DbError("createUser", err);
  }
}

// ─────────────────────────────────────────────
// 5. BACKUP UTILITY
// ─────────────────────────────────────────────

/**
 * Create a timestamped backup of the database in the same userData directory.
 * @returns {string} path to the backup file
 */
async function backupDatabase() {
  const dbPath = getDbPath();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = dbPath.replace(".db", `_backup_${timestamp}.db`);
  await getDb().backup(backupPath);
  console.log(`[DB] Backup created at: ${backupPath}`);
  return backupPath;
}

// ─────────────────────────────────────────────
// 5. ERROR CLASS
// ─────────────────────────────────────────────

class DbError extends Error {
  constructor(operation, originalError) {
    super(`[DB:${operation}] ${originalError.message}`);
    this.operation = operation;
    this.original  = originalError;
  }
}

// ─────────────────────────────────────────────
// 6. EXPORTS
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// 7. PASSWORD CHANGE FLAG HELPERS
// ─────────────────────────────────────────────

/**
 * Returns true if the user has needs_password_change = 1.
 */
function userNeedsPasswordChange(userId) {
  try {
    const row = getDb().prepare("SELECT needs_password_change FROM users WHERE id = ?").get(userId);
    return row ? row.needs_password_change === 1 : false;
  } catch (_) { return false; }
}

/**
 * Clears the needs_password_change flag for a user.
 */
function clearPasswordChangeFlag(userId) {
  try {
    getDb().prepare("UPDATE users SET needs_password_change = 0 WHERE id = ?").run(userId);
  } catch (_) { /* best-effort */ }
}

module.exports = {
  createDatabase,
  getDb,
  getDbPath,
  insertPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  insertPrediction,
  getPredictionHistory,
  getDashboardStats,
  getRecentAssessments,
  verifyUser,
  updatePassword,
  createUser,
  hashPassword,
  backupDatabase,
  userNeedsPasswordChange,
  clearPasswordChangeFlag,
};
