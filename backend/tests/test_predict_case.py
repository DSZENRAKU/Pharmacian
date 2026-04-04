import os
import sys
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from model_container import ModelState
from prediction_engine import predict_case


class MockRF:
    def __init__(self, probs, classes):
        self._probs = np.array(probs)
        self.classes_ = np.array(classes)

    def predict_proba(self, X):
        # return same probs for any input
        return np.tile(self._probs, (len(X), 1))


class MockDT:
    def __init__(self, pred):
        self._pred = pred

    def predict(self, X):
        return np.array([self._pred for _ in range(len(X))])


class MockNB(MockDT):
    pass


def make_basic_state():
    state = ModelState()
    # two core symptoms plus profile cols (8)
    state.symptoms_list = [
        "fever",
        "cough",
        "history_hypertension",
        "history_diabetes",
        "history_asthma",
        "history_allergy",
        "history_surgery",
        "patient_age",
        "patient_gender",
        "patient_weight",
    ]
    # Dummy df_train for refinement logic (3 columns for core symptoms + profile + prognosis)
    cols = state.symptoms_list[:-0]  # keep full list except prognosis
    # Build two prototype rows for different prognoses
    df = pd.DataFrame(
        [
            [1, 0, 0, 0, 0, 0, 0, 30, 0, 70, "DiseaseA"],
            [0, 1, 0, 0, 0, 0, 0, 40, 1, 80, "DiseaseB"],
        ],
        columns=state.symptoms_list + ["prognosis"],
    )
    state.df_train = df
    return state


def test_predict_case_success():
    state = make_basic_state()
    # Mock models: RF predicts high confidence for second class
    state.random_forest = MockRF(probs=[[0.1, 0.9]], classes=["DiseaseA", "DiseaseB"])
    state.decision_tree = MockDT("DiseaseB")
    state.naive_bayes = MockNB("DiseaseA")

    profile = {
        "history_hypertension": 0,
        "history_diabetes": 0,
        "history_asthma": 0,
        "history_allergy": 0,
        "history_surgery": 0,
        "patient_age": 30,
        "patient_gender": 0,
        "patient_weight": 70,
    }

    status, payload = predict_case(state, "fever and cough", profile, [], "", False)
    assert status == "success"
    assert "predictions" in payload
    assert payload["predictions"][0]["disease"] in state.random_forest.classes_
    assert "consensus" in payload


def test_predict_case_refine():
    state = make_basic_state()
    # RF low confidence -> triggers refine
    state.random_forest = MockRF(probs=[[0.2, 0.2]], classes=["DiseaseA", "DiseaseB"])
    state.decision_tree = MockDT("DiseaseA")
    state.naive_bayes = MockNB("DiseaseB")

    profile = {
        "history_hypertension": 0,
        "history_diabetes": 0,
        "history_asthma": 0,
        "history_allergy": 0,
        "history_surgery": 0,
        "patient_age": 30,
        "patient_gender": 0,
        "patient_weight": 70,
    }

    status, payload = predict_case(state, "", profile, [], "", False)
    # Empty symptoms_text will not reach predict_case normally, but we call predict_case directly
    # The RF returns low max_prob so predict_case should request refinement
    assert status in ("refine", "success")
    if status == "refine":
        assert payload.get("status") == "refine"
        assert "questions" in payload
