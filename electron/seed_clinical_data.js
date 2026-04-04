/**
 * electron/seed_clinical_data.js
 * Seeding script to purge demo data and insert 8 authentic clincal patient profiles.
 * Run this with: node electron/seed_clinical_data.js
 */

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// 1. Resolve DB Path (Manual path as we are running in node, not electron)
const userDataDir = path.join(process.env.APPDATA, "pharmacian-monitoring-desktop");
const dbPath = path.join(userDataDir, "pharmacian.db");

console.log(`[SEED] Target Database: ${dbPath}`);

if (!fs.existsSync(userDataDir)) {
    console.error("[SEED] Error: AppData directory not found. Has the app been run once?");
    process.exit(1);
}

const db = new Database(dbPath);

/**
 * Hash utility helper from database.js
 */
function hashPassword(password, salt = null) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, s, 1000, 64, "sha512").toString("hex");
  return { hash, salt: s };
}

function seed() {
    console.log("[SEED] Purging legacy clinical data...");
    db.exec("DELETE FROM symptoms;");
    db.exec("DELETE FROM predictions;");
    db.exec("DELETE FROM patients;");
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('patients', 'predictions', 'symptoms');");

    const patients = [
        { code: "PHR-1001", name: "Arthur Morgan", age: 68, gender: "Male", bg: "O+", contact: "555-0101", address: "Valentine, TX", notes: "History of hypertension and stable angina. Smoker (retired)." },
        { code: "PHR-1002", name: "Sarah Connor", age: 42, gender: "Female", bg: "A-", contact: "555-0102", address: "Los Angeles, CA", notes: "Type 2 Diabetic. Presenting with chronic fatigue and polydipsia." },
        { code: "PHR-1003", name: "John Wick", age: 55, gender: "Male", bg: "B+", contact: "555-0103", address: "New York, NY", notes: "Elevated liver enzymes (ALT/AST). History of mild alcohol use." },
        { code: "PHR-1004", name: "Ellen Ripley", age: 61, gender: "Female", bg: "AB+", contact: "555-0104", address: "Nostromo St., WA", notes: "Chronic Kidney Disease Stage 2. Monitoring GFR and protein levels." },
        { code: "PHR-1005", name: "Thomas Anderson", age: 29, gender: "Male", bg: "O+", contact: "555-0105", address: "Capital City, IL", notes: "General health screen. Occasional migraines. High physical activity." },
        { code: "PHR-1006", name: "Leia Organa", age: 53, gender: "Female", bg: "A+", contact: "555-0106", address: "Alderaan Ave., WI", notes: "Hyperthyroidism management. Recent palpitations noted." },
        { code: "PHR-1007", name: "Bruce Wayne", age: 48, gender: "Male", bg: "O-", contact: "555-0107", address: "Gotham, NJ", notes: "Superior athletic condition. Monitoring recovery from orthopedic stress." },
        { code: "PHR-1008", name: "Diana Prince", age: 35, gender: "Female", bg: "B-", contact: "555-0108", address: "Themyscira, FL", notes: "Perfect physiological indicators. No known allergies or issues." }
    ];

    console.log("[SEED] Inserting 8 authentic patient profiles...");
    const insertPatient = db.prepare(`
        INSERT INTO patients (patient_code, full_name, age, gender, blood_group, contact, address, notes)
        VALUES (@code, @name, @age, @gender, @bg, @contact, @address, @notes)
    `);

    const pIds = {};
    patients.forEach(p => {
        const result = insertPatient.run(p);
        pIds[p.code] = result.lastInsertRowid;
    });

    console.log("[SEED] Generating clinical diagnostic history...");
    const insertPred = db.prepare(`
        INSERT INTO predictions (patient_id, risk_level, primary_disease, confidence, raw_payload, bmi, blood_pressure, blood_sugar, heart_rate)
        VALUES (@pid, @risk, @disease, @conf, @payload, @bmi, @bp, @sugar, @hr)
    `);

    const mockResults = [
        { pid: pIds["PHR-1001"], risk: "High", disease: "Heart Disease", conf: 88.5, bmi: 29.4, bp: "155/95", sugar: 110, hr: 82, payload: { predictions: [{disease: "Heart Disease", probability: 88.5}], rationale: ["Hypertension", "Age Factor", "Chest Pain Reported"] } },
        { pid: pIds["PHR-1002"], risk: "Medium", disease: "Diabetes", conf: 72.0, bmi: 24.1, bp: "128/82", sugar: 185, hr: 74, payload: { predictions: [{disease: "Diabetes", probability: 72.0}], rationale: ["Hyperglycemia", "Excessive Thirst", "Weight Loss"] } },
        { pid: pIds["PHR-1003"], risk: "High", disease: "Liver Disease", conf: 81.2, bmi: 27.8, bp: "135/88", sugar: 98, hr: 78, payload: { predictions: [{disease: "Liver Disease", probability: 81.2}], rationale: ["ALT Elevation", "AST Elevation", "Jaundice"] } },
        { pid: pIds["PHR-1004"], risk: "Medium", disease: "Kidney Issue", conf: 64.5, bmi: 22.5, bp: "142/90", sugar: 105, hr: 71, payload: { predictions: [{disease: "Kidney Issue", probability: 64.5}], rationale: ["Proteinuria", "Creatinine Elevation"] } },
        { pid: pIds["PHR-1005"], risk: "Low", disease: "None", conf: 95.0, bmi: 23.2, bp: "115/75", sugar: 92, hr: 64, payload: { predictions: [{disease: "Healthy", probability: 95.0}], rationale: ["Vital signs within range"] } }
    ];

    mockResults.forEach(r => {
        insertPred.run({
            pid: r.pid,
            risk: r.risk,
            disease: r.disease,
            conf: r.conf,
            bmi: r.bmi,
            bp: r.bp,
            sugar: r.sugar,
            hr: r.hr,
            payload: JSON.stringify(r.payload)
        });
    });

    console.log("[SEED] Authentic clinical environment prepared successfully.");
    db.close();
}

try {
    seed();
} catch (err) {
    console.error("[SEED] Critical Error:", err.message);
}
