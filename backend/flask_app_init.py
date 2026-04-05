import sys
import logging
import os

from flask import Flask, request, jsonify
from flask_cors import CORS

from api_endpoints import bp
from logging_setup import setup_logging
from prediction_engine import train_pipeline
from model_container import ModelState


def create_app():
    if getattr(sys, 'frozen', False):
        base_dir = sys._MEIPASS
    else:
        base_dir = os.path.dirname(os.path.dirname(__file__))
    app = Flask(
        __name__,
        template_folder=os.path.join(base_dir, "frontend", "templates"),
        static_folder=os.path.join(base_dir, "frontend", "static")
    )
    CORS(app)
    setup_logging(base_dir)

    state = ModelState()
    # Do NOT train models at app startup. Models will be loaded lazily
    # on demand to keep startup fast and predictable.

    app.extensions["model_state"] = state
    # Health endpoint to report model availability
    @app.route("/healthz")
    def healthz():
        from model_container import load_state_from_disk
        from medical_kb_config import (RF_MODEL_PATH, DT_MODEL_PATH, NB_MODEL_PATH, SYMPTOMS_LIST_PATH)

        files = {
            "random_forest": str(RF_MODEL_PATH.exists()),
            "decision_tree": str(DT_MODEL_PATH.exists()),
            "naive_bayes": str(NB_MODEL_PATH.exists()),
            "symptoms_list": str(SYMPTOMS_LIST_PATH.exists()),
        }
        models_loaded = bool(state.random_forest and state.decision_tree and state.naive_bayes)
        return jsonify({"ok": True, "models_loaded": models_loaded, "artifact_files": files})
    
    app.register_blueprint(bp)

    @app.errorhandler(Exception)
    def handle_exception(e):
        logging.exception(f"Unhandled error on {request.path}")
        # For API routes return JSON, for page routes raise normally
        if request.path.startswith("/predict") or request.path.startswith("/feedback") or request.path.startswith("/retrain"):
            return jsonify({"error": "Internal server error. Please try again."}), 500
        raise e

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Route not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed"}), 405

    return app
