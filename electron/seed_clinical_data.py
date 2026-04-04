import sqlite3
import os
import json
import hashlib
import binascii
from datetime import datetime

# Resolve DB Path
appdata = os.getenv('APPDATA')
userDataDir = os.path.join(appdata, 'pharmacian-monitoring-desktop')
db_path = os.path.join(userDataDir, 'pharmacian.db')

print(f"[SEED] Target Database Location: {db_path}")

# Ensure the directory exists
if not os.path.exists(userDataDir):
    print(f"[SEED] Creating AppData directory: {userDataDir}")
    os.makedirs(userDataDir, exist_ok=True)

def hash_password(password, salt=None):
    if salt is None:
        salt = binascii.hexlify(os.urandom(16)).decode('utf-8')
    dk = hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'), salt.encode('utf-8'), 1000, 64)
    hash_val = binascii.hexlify(dk).decode('utf-8')
    return hash_val, salt

def seed():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("[SEED] Initialising clinical database schema...")
    cursor.executescript("""
        -- PATIENTS table: core demographics
        CREATE TABLE IF NOT EXISTS patients (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_code    TEXT    UNIQUE NOT NULL,          -- e.g. "PHR-1001"
          full_name       TEXT    NOT NULL,
          age             INTEGER NOT NULL CHECK(age BETWEEN 0 AND 130),
          gender          TEXT    NOT NULL CHECK(gender IN ('Male','Female','Other')),
          blood_group     TEXT,
          contact         TEXT,
          address         TEXT,
          notes           TEXT,
          created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        -- PREDICTIONS table: one row per AI assessment run
        CREATE TABLE IF NOT EXISTS predictions (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id      INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          risk_level      TEXT    NOT NULL CHECK(risk_level IN ('Low','Medium','High')),
          primary_disease TEXT,
          confidence      REAL,                             -- 0.0 – 100.0
          raw_payload     TEXT,                             -- full JSON result from Flask
          bmi             REAL,
          blood_pressure  TEXT,                             -- "120/80"
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
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          username        TEXT    UNIQUE NOT NULL,
          password_hash   TEXT    NOT NULL,
          salt            TEXT    NOT NULL,
          role            TEXT    NOT NULL CHECK(role IN ('admin','clinician')),
          created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
    """)

    print("[SEED] Purging legacy clinical data...")
    cursor.execute("DELETE FROM symptoms;")
    cursor.execute("DELETE FROM predictions;")
    cursor.execute("DELETE FROM patients;")
    cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('patients', 'predictions', 'symptoms');")

    patients = [
        ("PHR-1001", "Arthur Morgan", 68, "Male", "O+", "555-0101", "Valentine, TX", "History of hypertension and stable angina. Smoker (retired)."),
        ("PHR-1002", "Sarah Connor", 42, "Female", "A-", "555-0102", "Los Angeles, CA", "Type 2 Diabetic. Presenting with chronic fatigue and polydipsia."),
        ("PHR-1003", "John Wick", 55, "Male", "B+", "555-0103", "New York, NY", "Elevated liver enzymes (ALT/AST). History of mild alcohol use."),
        ("PHR-1004", "Ellen Ripley", 61, "Female", "AB+", "555-0104", "Nostromo St., WA", "Chronic Kidney Disease Stage 2. Monitoring GFR and protein levels."),
        ("PHR-1005", "Thomas Anderson", 29, "Male", "O+", "555-0105", "Capital City, IL", "General health screen. Occasional migraines. High physical activity."),
        ("PHR-1006", "Leia Organa", 53, "Female", "A+", "555-0106", "Alderaan Ave., WI", "Hyperthyroidism management. Recent palpitations noted."),
        ("PHR-1007", "Bruce Wayne", 48, "Male", "O-", "555-0107", "Gotham, NJ", "Superior athletic condition. Monitoring recovery from orthopedic stress."),
        ("PHR-1008", "Diana Prince", 35, "Female", "B-", "555-0108", "Themyscira, FL", "Perfect physiological indicators. No known allergies or issues.")
    ]

    print("[SEED] Inserting 8 authentic patient profiles...")
    cursor.executemany("""
        INSERT INTO patients (patient_code, full_name, age, gender, blood_group, contact, address, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, patients)

    # Get IDs
    cursor.execute("SELECT id, patient_code FROM patients")
    p_ids = {code: id for id, code in cursor.fetchall()}

    print("[SEED] Generating clinical diagnostic history...")
    
    mock_results = [
        (p_ids["PHR-1001"], "High", "Heart Disease", 88.5, json.dumps({"predictions": [{"disease": "Heart Disease", "probability": 88.5}], "rationale": ["Hypertension", "Age Factor", "Chest Pain Reported"]}), 29.4, "155/95", 110, 82),
        (p_ids["PHR-1002"], "Medium", "Diabetes", 72.0, json.dumps({"predictions": [{"disease": "Diabetes", "probability": 72.0}], "rationale": ["Hyperglycemia", "Excessive Thirst", "Weight Loss"]}), 24.1, "128/82", 185, 74),
        (p_ids["PHR-1003"], "High", "Liver Disease", 81.2, json.dumps({"predictions": [{"disease": "Liver Disease", "probability": 81.2}], "rationale": ["ALT Elevation", "AST Elevation", "Jaundice"]}), 27.8, "135/88", 98, 78),
        (p_ids["PHR-1004"], "Medium", "Kidney Issue", 64.5, json.dumps({"predictions": [{"disease": "Kidney Issue", "probability": 64.5}], "rationale": ["Proteinuria", "Creatinine Elevation"]}), 22.5, "142/90", 105, 71),
        (p_ids["PHR-1005"], "Low", "None", 95.0, json.dumps({"predictions": [{"disease": "Healthy", "probability": 95.0}], "rationale": ["Vital signs within range"]}), 23.2, "115/75", 92, 64)
    ]

    cursor.executemany("""
        INSERT INTO predictions (patient_id, risk_level, primary_disease, confidence, raw_payload, bmi, blood_pressure, blood_sugar, heart_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, mock_results)

    # Initialize Admin
    user_count = cursor.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if user_count == 0:
        print("[SEED] Initialising admin account...")
        hash_val, salt_val = hash_password("admin123")
        cursor.execute("INSERT INTO users (username, password_hash, salt, role) VALUES (?, ?, ?, ?)", ("admin", hash_val, salt_val, "admin"))

    conn.commit()
    print("[SEED] Authentic clinical environment prepared successfully.")
    conn.close()

if __name__ == "__main__":
    try:
        seed()
    except Exception as e:
        print(f"[SEED] Critical Error: {str(e)}")
