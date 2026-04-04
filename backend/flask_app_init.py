import logging
import os

from flask import Flask, request, jsonify

from api_endpoints import bp
from logging_setup import setup_logging
from prediction_engine import train_pipeline
from model_container import ModelState


def create_app():
    base_dir = os.path.dirname(os.path.dirname(__file__))
    app = Flask(
        __name__,
        template_folder=os.path.join(base_dir, "frontend", "templates"),
        static_folder=os.path.join(base_dir, "frontend", "static")
    )
    setup_logging(base_dir)

    state = ModelState()
    try:
        train_pipeline(state)
    except Exception:
        logging.exception("Training pipeline failed.")

    app.extensions["model_state"] = state
    app.register_blueprint(bp)

    @app.errorhandler(Exception)
    def handle_exception(e):
        if request.path.startswith("/predict"):
            logging.exception("Unhandled error in /predict")
            return jsonify({"error": "Internal server error. Please try again."}), 500
        raise e

    return app
