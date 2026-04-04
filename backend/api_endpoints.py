from flask import Blueprint, current_app, jsonify, render_template, request, redirect
from flask_cors import CORS
import sqlite3
import os
import requests
from prediction_engine import predict_case, sanitize_medications, train_pipeline
from response_formatting import error_response, refine_response, success_response
from model_container import load_state_from_disk
from reinforcement_engine import record_feedback, get_feedback_stats, apply_rl_boost

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


@bp.route("/api/dashboard")
def api_dashboard():
    db_path = os.path.join(current_app.root_path, "data", "pharmacian.db")
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as total_patients FROM patients")
            total_patients = cursor.fetchone()["total_patients"]
            conn.close()
            return jsonify({"total_patients": total_patients, "status": "Live from SQLite"})
        except Exception:
            pass
    return jsonify({
        "total_patients": 42,
        "critical_alerts": 3,
        "recent_admissions": 5,
        "status": "Mock Data"
    })

@bp.route("/api/patients")
def api_patients():
    db_path = os.path.join(current_app.root_path, "data", "pharmacian.db")
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM patients LIMIT 50")
            patients = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return jsonify({"patients": patients, "status": "Live from SQLite"})
        except Exception:
            pass
    return jsonify({
        "patients": [
            {"id": 1, "name": "Rajesh Kumar", "age": 45, "condition": "Hypertension", "status": "Stable"},
            {"id": 2, "name": "Priya Singh", "age": 32, "condition": "Asthma", "status": "Critical"}
        ],
        "status": "Mock Data"
    })

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
