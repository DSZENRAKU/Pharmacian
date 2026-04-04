from flask import Blueprint, current_app, jsonify, render_template, request, redirect

from prediction_engine import predict_case, sanitize_medications, train_pipeline
from response_formatting import error_response, refine_response, success_response
from model_container import load_state_from_disk

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


@bp.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(force=True, silent=True) or {}
        symptoms_text = str(data.get("symptoms", "")).strip()
    except Exception:
        payload, code = error_response("Invalid request payload.")
        return jsonify(payload), code
    if not isinstance(data, dict):
        payload, code = error_response("Invalid request payload.")
        return jsonify(payload), code

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

    if not symptoms_text:
        payload, code = error_response("Symptoms are required.")
        return jsonify(payload), code

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
    body, code = success_response(payload)
    return jsonify(body), code
