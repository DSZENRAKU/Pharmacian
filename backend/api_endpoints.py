from flask import Blueprint, current_app, jsonify, render_template, request, redirect
from flask_cors import CORS
import sqlite3
import os
import requests
from prediction_engine import predict_case, sanitize_medications, train_pipeline
from response_formatting import error_response, refine_response, success_response
from model_container import load_state_from_disk
from reinforcement_engine import record_feedback, get_feedback_stats, apply_rl_boost
from drug_interaction import get_multiple_interactions

from dotenv import load_dotenv
load_dotenv() # Load GEMINI_API_KEY from .env

bp = Blueprint("main", __name__)


@bp.route("/")
def landing_page():
    # Primary entry point: Secure Clinician Login
    return render_template("landing.html")

@bp.route("/index.html")
@bp.route("/index")
def index_redirect():
    # Force legacy prototype requests to the modern dashboard
    return redirect("/dashboard")


@bp.route("/health")
def health_check():
    state = current_app.extensions.get("model_state")
    model_loaded = bool(state and state.random_forest)
    return jsonify({"status": "ok", "model_loaded": model_loaded, "version": "2.0"})


@bp.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")


@bp.route("/diagnose")
def diagnose():
    return render_template("new_patient_form_design.html")


@bp.route("/result")
def result():
    return render_template("result.html")


@bp.route("/patients")
def patients():
    return render_template("patients.html")


@bp.route("/reports")
def reports():
    return render_template("reports.html")


@bp.route("/settings")
def settings():
    return render_template("settings.html")


@bp.route("/drug-interactions")
def drug_interactions():
    return render_template("drug-interactions.html")


@bp.route("/api/dashboard")
def api_dashboard():
    """Returns full dashboard stats — works with both the Electron SQLite DB and the
    web fallback so the dashboard page shows real numbers in either mode."""
    db_path = os.path.join(current_app.root_path, "data", "pharmacian.db")
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute("SELECT COUNT(*) as c FROM patients WHERE deleted_at IS NULL")
            total_patients = cursor.fetchone()["c"]

            cursor.execute("SELECT COUNT(*) as c FROM predictions WHERE risk_level = 'High' AND date(created_at) >= date('now', '-30 days')")
            high_risk_count = cursor.fetchone()["c"]

            cursor.execute("SELECT COUNT(*) as c FROM predictions WHERE date(created_at) = date('now')")
            today_assessments = cursor.fetchone()["c"]

            cursor.execute("""
                SELECT p.full_name, p.patient_code, p.age, pr.primary_disease, pr.risk_level, pr.created_at
                FROM patients p
                LEFT JOIN predictions pr ON p.id = pr.patient_id
                WHERE p.deleted_at IS NULL
                ORDER BY pr.created_at DESC LIMIT 5
            """)
            recent_patients = [dict(row) for row in cursor.fetchall()]

            cursor.execute("SELECT risk_level as label, COUNT(*) as count FROM predictions GROUP BY risk_level")
            risk_distribution = [dict(row) for row in cursor.fetchall()]

            conn.close()
            return jsonify({
                "totalPatients": total_patients,
                "highRiskCount": high_risk_count,
                "todayAssessments": today_assessments,
                "recentPatients": recent_patients,
                "riskDistribution": risk_distribution,
                "status": "Live from SQLite"
            })
        except Exception as e:
            import logging
            logging.exception("api_dashboard error")

    # Web/demo fallback with realistic-looking data
    return jsonify({
        "totalPatients": 0,
        "highRiskCount": 0,
        "todayAssessments": 0,
        "recentPatients": [],
        "riskDistribution": [],
        "status": "No database"
    })

@bp.route("/api/patients")
def api_patients():
    """Returns all non-deleted patients with their latest prediction data."""
    db_path = os.path.join(current_app.root_path, "data", "pharmacian.db")
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT p.*, pr.risk_level, pr.primary_disease, pr.created_at AS last_scan
                FROM patients p
                LEFT JOIN predictions pr ON p.id = pr.patient_id
                AND pr.id = (SELECT MAX(id) FROM predictions WHERE patient_id = p.id)
                WHERE p.deleted_at IS NULL
                ORDER BY COALESCE(pr.created_at, p.created_at) DESC
                LIMIT 100
            """)
            patients = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return jsonify({"patients": patients, "status": "Live from SQLite"})
        except Exception as e:
            import logging
            logging.exception("api_patients error")
    return jsonify({"patients": [], "status": "No database"})

@bp.route("/api/reports")
def api_reports():
    """Returns recent assessments for the reports page web fallback."""
    db_path = os.path.join(current_app.root_path, "data", "pharmacian.db")
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT p.id as patient_id, p.full_name, p.age, p.gender,
                       pr.id, pr.risk_level, pr.primary_disease, pr.confidence, pr.created_at
                FROM predictions pr
                JOIN patients p ON pr.patient_id = p.id
                WHERE p.deleted_at IS NULL
                ORDER BY pr.created_at DESC
                LIMIT 50
            """)
            records = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return jsonify({"records": records, "status": "Live from SQLite"})
        except Exception as e:
            import logging
            logging.exception("api_reports error")
    return jsonify({"records": [], "status": "No database"})

@bp.route("/predict", methods=["POST"])
def predict():
    try:
        raw_data = request.get_json(force=True, silent=True)
        if raw_data is None or not isinstance(raw_data, dict):
            return jsonify({"error": "Invalid request payload. Send JSON."}), 400
        data = raw_data
        symptoms_text = str(data.get("symptoms", "")).strip()
    except Exception:
        return jsonify({"error": "Could not parse request body."}), 400

    profile = {
        "history_hypertension": int(data.get("h_hyper", 0)),
        "history_diabetes": int(data.get("h_diabe", 0)),
        "history_asthma": int(data.get("h_asthma", 0)),
        "history_allergy": int(data.get("h_allergy", 0)),
        "history_surgery": int(data.get("h_surgery", 0)),
        "patient_age": int(data.get("age", 25)),
        "patient_gender": int(data.get("gender", 0)),
        "patient_weight": int(data.get("weight", 70)),
    }
    notes = str(data.get("notes", "")).strip()
    try:
        medications = sanitize_medications(data.get("medications", []))
    except ValueError as e:
        payload, code = error_response(str(e))
        return jsonify(payload), code

    if not symptoms_text or len(symptoms_text.strip()) < 3:
        return jsonify({"error": "Please describe your symptoms in at least 3 characters.", "code": "SYMPTOMS_REQUIRED"}), 400

    state = current_app.extensions.get("model_state")
    if not state:
        payload, code = error_response("Internal server configuration error.")
        return jsonify(payload), code

    # Try to load pre-trained artifacts from disk if they aren't already loaded.
    if not (state.random_forest and state.decision_tree and state.naive_bayes):
        loaded = load_state_from_disk(state)
        if not loaded:
            try:
                train_pipeline(state)
            except Exception:
                payload, code = error_response("Matrix offline.")
                return jsonify(payload), code

    is_refined = bool(data.get("is_refined", False))
    status, payload = predict_case(
        state, symptoms_text, profile, medications, notes, is_refined
    )
    if status == "refine":
        body, code = refine_response(payload)
        return jsonify(body), code
        
    # Apply Reinforcement Learning boost to re-rank predictions
    if "predictions" in payload and payload["predictions"]:
        payload["predictions"] = apply_rl_boost(payload["predictions"])
        
    # Check for drug-drug interactions for the final report
    if medications:
        med_names = [m.get("name", "").strip() for m in medications if m.get("name")]
        payload["interactions"] = get_multiple_interactions(med_names)

    body, code = success_response(payload)
    return jsonify(body), code

@bp.route("/feedback", methods=["POST"])
def submit_feedback():
    """
    Doctor submits feedback on a prediction.
    Expected JSON:
    {
        "predicted_disease": "Malaria",
        "actual_disease": "Dengue",   // optional, what it actually was
        "symptoms_used": ["fever", "headache"],
        "is_correct": false,
        "confidence": 87.5,
        "session_id": "optional-uuid"
    }
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
        
        predicted = str(data.get("predicted_disease", "")).strip()
        actual = data.get("actual_disease")
        if actual:
            actual = str(actual).strip()
        symptoms = data.get("symptoms_used", [])
        if not isinstance(symptoms, list):
            symptoms = []
        is_correct = bool(data.get("is_correct", False))
        confidence = float(data.get("confidence", 50.0))
        session_id = str(data.get("session_id", ""))
        
        if not predicted:
            return jsonify({"error": "predicted_disease is required"}), 400
        
        result = record_feedback(
            predicted_disease=predicted,
            actual_disease=actual,
            symptoms_used=symptoms,
            is_correct=is_correct,
            confidence=confidence,
            session_id=session_id
        )
        
        return jsonify({"status": "ok", "data": result}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/retrain", methods=["POST"])
def retrain():
    try:
        state = current_app.extensions.get("model_state")
        if not state:
            return jsonify({"error": "Internal server configuration error."}), 500
        train_pipeline(state)
        return jsonify({"status": "ok", "message": "Models retrained successfully."}), 200
    except Exception as e:
        return jsonify({"error": "Retraining failed.", "detail": str(e)}), 500


@bp.route("/api/chat", methods=["POST"])
def api_chat():
    """Gemini-powered clinical chatbot endpoint."""
    try:
        data = request.get_json(force=True, silent=True) or {}
        user_message = data.get("message", "").strip()
        
        if not user_message:
            return jsonify({"error": "Message is required"}), 400
            
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            # Try to re-load just in case
            load_dotenv()
            api_key = os.getenv("GEMINI_API_KEY")
            
        if not api_key:
            print("CHAT ERR: GEMINI_API_KEY is missing in environment.")
            return jsonify({"error": "Gemini API key not configured on server (Check .env)."}), 500
            
        context = "You are a clinical AI assistant for 'Pharmacian', a medical diagnostic platform. Keep responses concise and clinical."
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": f"{context}\n\nUser Question: {user_message}"
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 1024,
            }
        }
        
        print(f"CHAT: Sending request to Gemini...")
        response = requests.post(url, json=payload, timeout=20)
        
        if response.status_code != 200:
            print(f"CHAT ERR: Gemini API returned status {response.status_code}: {response.text}")
            return jsonify({"error": f"AI service error: {response.status_code}"}), 502
            
        result = response.json()
        
        # Extract the text from Gemini response structure
        try:
            if 'candidates' in result and result['candidates']:
                candidate = result['candidates'][0]
                if 'content' in candidate and 'parts' in candidate['content']:
                    ai_text = candidate['content']['parts'][0]['text']
                else:
                    # Check for finishReason
                    reason = candidate.get('finishReason', 'Unknown')
                    ai_text = f"I cannot answer this clinical question right now (Reason: {reason})."
            else:
                print(f"CHAT ERR: No candidates in result: {result}")
                ai_text = "I'm sorry, I couldn't process that clinical request at the moment."
        except (KeyError, IndexError) as err:
            print(f"CHAT ERR: Result parsing failed: {str(err)} | Full result: {result}")
            ai_text = "I encountered an error while parsing the clinical response."
            
        return jsonify({"status": "ok", "reply": ai_text}), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Chat Exception: {str(e)}")
        return jsonify({"error": "Clinical Assistant is currently offline."}), 500


@bp.route("/api/feedback-stats")
def feedback_stats():
    try:
        stats = get_feedback_stats()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"error": "Could not retrieve feedback stats.", "detail": str(e)}), 500


@bp.route("/api/auth", methods=["POST"])
def web_auth():
    data = request.get_json(force=True, silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", "")).strip()
    ALLOWED = {"admin": "admin123", "guest": "guest"}
    if ALLOWED.get(username) == password:
        role = "admin" if username == "admin" else "clinician"
        return jsonify({"ok": True, "username": username, "role": role}), 200
    return jsonify({"ok": False, "error": "Invalid credentials"}), 401

@bp.route("/api/check-interactions", methods=["POST"])
def check_interactions():
    """Checks for drug-drug interactions using OpenFDA.
    Accepts {medications: [{name, dose?}]} OR {medications: ["drugname"]}.
    Returns a unified list of interaction warnings.
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
        meds = data.get("medications", [])
        if not meds or not isinstance(meds, list):
            return jsonify({"status": "ok", "warnings": [], "interactions": []}), 200

        # Accept both plain strings and dicts
        if meds and isinstance(meds[0], str):
            med_names = [m.strip() for m in meds if m.strip()]
        else:
            med_names = [m.get("name", "").strip() for m in meds if isinstance(m, dict) and m.get("name")]

        raw_warnings = get_multiple_interactions(med_names)

        # Normalise to the shape both dashboard and diagnose pages expect:
        # { severity, drug1, drug2, description }
        normalised = []
        for w in raw_warnings:
            normalised.append({
                "severity":    w.get("severity", "Minor"),
                "drug1":       med_names[0] if len(med_names) > 0 else "",
                "drug2":       med_names[1] if len(med_names) > 1 else "",
                "description": w.get("note", w.get("description", "Interaction detected."))
            })

        return jsonify({
            "status":       "ok",
            "warnings":     raw_warnings,    # legacy key (diagnose page uses this)
            "interactions": normalised        # new key (dashboard quick-check uses this)
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to check interactions.", "detail": str(e)}), 500
