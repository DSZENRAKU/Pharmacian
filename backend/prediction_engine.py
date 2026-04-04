import logging
import re
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB

import os
import joblib
from medical_kb_config import (
    DISEASE_PANEL_INFO,
    PROFILE_COLS,
    RESEARCH_DB,
    TRAINING_DATA_PATH,
    MODELS_DIR,
    RF_MODEL_PATH,
    DT_MODEL_PATH,
    NB_MODEL_PATH,
    SYMPTOMS_LIST_PATH,
)
from model_container import ModelState


class SymptomTranslator:
    """ Maps common Hindi and Marathi medical terms to English equivalents. """
    MAPPING = {
        # Hindi
        "सिरदर्द": "headache", "बुखार": "fever", "थकान": "fatigue", "खांसी": "cough",
        "मतली": "nausea", "उल्टी": "vomiting", "सांस फूलना": "breathlessness",
        "सीने में दर्द": "chest pain", "चक्कर": "dizziness", "बदन दर्द": "muscle aches",
        "गले में खराश": "sore throat", "ठिठुरन": "chills", "पेट दर्द": "abdominal pain",
        "जुकाम": "cold", "दस्त": "diarrhea", "कब्ज": "constipation",
        "खुजली": "itching", "चकत्ते": "skin rash", "जोड़ों का दर्द": "joint pain",

        # Marathi
        "डोकेदुखी": "headache", "ताप": "fever", "थवा": "fatigue", "खोकला": "cough",
        "मळमळ": "nausea", "उलट्या": "vomiting", "दम लागणे": "breathlessness",
        "छातीत दुखणे": "chest pain", "चक्कर येणे": "dizziness", "अंगदुखी": "muscle aches",
        "घसा खवखवणे": "sore throat", "थंडी वाजणे": "chills", "पोटदुखी": "abdominal pain",
        "सर्दी": "cold", "जुलाब": "diarrhea", "बद्धकोष्ठता": "constipation",
        "खाज": "itching", "पुरळ": "skin rash", "सांधेदुखी": "joint pain"
    }

    @classmethod
    def translate(cls, text: str) -> str:
        if not text: return ""
        translated = text.lower()
        for native, english in cls.MAPPING.items():
            translated = translated.replace(native.lower(), english)
        return translated


def train_pipeline(state: ModelState) -> None:
    logging.info("Checking for existing models...")
    
    if all(p.exists() for p in [RF_MODEL_PATH, DT_MODEL_PATH, NB_MODEL_PATH, SYMPTOMS_LIST_PATH]):
        try:
            state.random_forest = joblib.load(RF_MODEL_PATH)
            state.decision_tree = joblib.load(DT_MODEL_PATH)
            state.naive_bayes = joblib.load(NB_MODEL_PATH)
            state.symptoms_list = joblib.load(SYMPTOMS_LIST_PATH)
            # We still need df_train for refinement questions (to get patterns)
            state.df_train = pd.read_csv(TRAINING_DATA_PATH)
            logging.info("Pre-trained models loaded successfully.")
            return
        except Exception as e:
            logging.warning(f"Failed to load pre-trained models: {e}. Re-training...")

    logging.info("Training pipeline started.")
    df_train = pd.read_csv(TRAINING_DATA_PATH)
    symptoms_list = df_train.columns[:-1].tolist()
    X = df_train[symptoms_list]
    y = df_train["prognosis"]

    random_forest = RandomForestClassifier(n_estimators=100, random_state=42)
    random_forest.fit(X, y)

    decision_tree = DecisionTreeClassifier(random_state=42)
    decision_tree.fit(X, y)

    naive_bayes = GaussianNB()
    naive_bayes.fit(X, y)

    # Save models
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(random_forest, RF_MODEL_PATH)
    joblib.dump(decision_tree, DT_MODEL_PATH)
    joblib.dump(naive_bayes, NB_MODEL_PATH)
    joblib.dump(symptoms_list, SYMPTOMS_LIST_PATH)

    state.df_train = df_train
    state.symptoms_list = symptoms_list
    state.random_forest = random_forest
    state.decision_tree = decision_tree
    state.naive_bayes = naive_bayes
    logging.info("Training pipeline completed and models saved.")


def extract_hybrid_features(text: str, profile_data: Dict, symptoms_list: List[str]) -> List[int]:
    if not isinstance(text, str):
        return [0] * len(symptoms_list)
    # Multilingual translation from Hindi/Marathi to English
    translated_text = SymptomTranslator.translate(text)
    clean_text = re.sub(r"[^a-z\s]", " ", translated_text.lower())
    user_tokens = set(clean_text.split())
    s_core_list = symptoms_list[: -len(PROFILE_COLS)]
    features = []
    for s in s_core_list:
        s_words = set(s.split(".")[0].replace("_", " ").split())
        if s_words.issubset(user_tokens) or s in user_tokens:
            features.append(1)
        else:
            features.append(0)
    for col in PROFILE_COLS:
        features.append(profile_data.get(col, 0))
    return features


def get_clinical_rationale(hybrid_input, symptoms_list: List[str]) -> List[str]:
    arr = np.array(hybrid_input)
    if arr.ndim == 1:
        active = arr
    else:
        active = arr[0]
    active_indices = np.where(active == 1)[0]
    matched_symptoms = []
    for idx in active_indices:
        if idx < len(symptoms_list):
            symptom = symptoms_list[idx]
            matched_symptoms.append(symptom.replace("_", " ").title())
    return matched_symptoms[:5]


def get_refinement_questions(
    hybrid_input, top_2_indices, state: ModelState
) -> List[Dict]:
    if len(top_2_indices) < 2:
        return []
    idx1, idx2 = top_2_indices[0], top_2_indices[1]
    d1_name = state.random_forest.classes_[idx1]
    d2_name = state.random_forest.classes_[idx2]

    d1_pattern = state.df_train[state.df_train["prognosis"] == d1_name].iloc[
        0, :-1
    ].values
    d2_pattern = state.df_train[state.df_train["prognosis"] == d2_name].iloc[
        0, :-1
    ].values

    diff = []
    core_symps = state.symptoms_list[: -len(PROFILE_COLS)]
    for i in range(len(core_symps)):
        if hybrid_input[i] == 0:
            if d1_pattern[i] != d2_pattern[i]:
                diff.append(
                    {"index": i, "name": state.symptoms_list[i].replace("_", " ")}
                )
    return diff[:3]


def predict_health_risks(profile: Dict) -> List[Dict]:
    risks = []
    h_score = 0
    if profile["patient_age"] > 55:
        h_score += 2
    if profile["patient_weight"] > 90:
        h_score += 2
    if profile["history_hypertension"]:
        h_score += 3
    if h_score >= 5:
        risks.append(
            {
                "condition": "Cardiovascular Disease",
                "risk": "High",
                "note": "Clinical profile indicates high risk. Immediate screening recommended.",
            }
        )
    elif h_score >= 2:
        risks.append(
            {
                "condition": "Cardiovascular Disease",
                "risk": "Moderate",
                "note": "Monitor daily BP and maintain active cardio routine.",
            }
        )

    d_score = 0
    if profile["patient_weight"] > 85:
        d_score += 2
    if profile["history_diabetes"]:
        d_score += 4
    if d_score >= 4:
        risks.append(
            {
                "condition": "Type 2 Diabetes",
                "risk": "High",
                "note": "High susceptibility detected. Recommend A1C screening.",
            }
        )
    return risks


def simulate_web_research(symptoms_text: str) -> str:
    symptoms_text = symptoms_text.lower()
    findings = []
    for key, val in RESEARCH_DB.items():
        if key in symptoms_text:
            findings.append(val)
    return " ".join(findings[:2]) if findings else RESEARCH_DB["default"]


def _normalize_dose(dose: str) -> str:
    return re.sub(r"\s+", " ", str(dose)).strip()


def _is_valid_dose(dose: str) -> bool:
    if not dose:
        return False
    has_number = re.search(r"\d", dose) is not None
    has_unit = re.search(r"[a-zA-Z]", dose) is not None
    return has_number and has_unit


def sanitize_medications(medications) -> List[Dict]:
    if medications is None or medications == "":
        return []
    if not isinstance(medications, list):
        raise ValueError("Medications must be a list.")
    clean = []
    for m in medications:
        if not isinstance(m, dict):
            raise ValueError("Each medication must be an object with name and dose.")
        name = str(m.get("name", "")).strip()
        dose_raw = m.get("dose", "")
        dose = _normalize_dose(dose_raw)
        frequency = (
            str(m.get("frequency", "Frequency not specified")).strip()
            or "Frequency not specified"
        )
        if not name:
            continue
        if not _is_valid_dose(dose):
            raise ValueError(
                "Each medication must include a dose with units (e.g., 500 mg)."
            )
        clean.append({"name": name, "dose": dose, "frequency": frequency})
    return clean


def predict_case(
    state: ModelState,
    symptoms_text: str,
    profile: Dict,
    medications: List[Dict],
    notes: str,
    is_refined: bool,
) -> Tuple[str, Dict]:
    hybrid_input = extract_hybrid_features(
        symptoms_text, profile, state.symptoms_list
    )
    probs = state.random_forest.predict_proba([hybrid_input])[0]
    top_indices = np.argsort(probs)[-5:][::-1]
    max_prob = float(np.max(probs))

    if max_prob < 0.6 and not is_refined:
        questions = get_refinement_questions(hybrid_input, top_indices[:2], state)
        if questions:
            return "refine", {
                "status": "refine",
                "questions": questions,
                "message": "Clinical ambiguity detected. Please answer a few follow-up questions for diagnostic precision.",
            }

    predictions = []
    for idx in top_indices:
        prob = float(probs[idx])
        if prob < 0.01:
            continue
        disease = state.random_forest.classes_[idx]
        info = DISEASE_PANEL_INFO.get(
            disease,
            {
                "description": "General condition requiring clinical observation.",
                "common_symptoms": "Nonspecific clinical markers.",
                "causes": "Varies by patient context.",
                "prevention": "General hygiene and routine checkups.",
                "otc": "Hydration and rest.",
            },
        )
        predictions.append(
            {"disease": disease, "probability": round(prob * 100, 2), "info": info}
        )
    if not predictions and len(top_indices) > 0:
        idx = top_indices[0]
        prob = float(probs[idx])
        disease = state.random_forest.classes_[idx]
        info = DISEASE_PANEL_INFO.get(
            disease,
            {
                "description": "General condition requiring clinical observation.",
                "common_symptoms": "Nonspecific clinical markers.",
                "causes": "Varies by patient context.",
                "prevention": "General hygiene and routine checkups.",
                "otc": "Hydration and rest.",
            },
        )
        predictions.append(
            {"disease": disease, "probability": round(prob * 100, 2), "info": info}
        )

    risks = predict_health_risks(profile)
    research = simulate_web_research(symptoms_text)

    dt_pred = state.decision_tree.predict([hybrid_input])[0]
    nb_pred = state.naive_bayes.predict([hybrid_input])[0]
    primary_disease = (
        predictions[0]["disease"]
        if predictions
        else state.random_forest.classes_[top_indices[0]]
    )

    votes = [primary_disease, dt_pred, nb_pred]
    consensus_score = sum(1 for v in votes if v == primary_disease)
    clinical_rationale = get_clinical_rationale([hybrid_input], state.symptoms_list)

    return "success", {
        "status": "success",
        "predictions": predictions,
        "risks": risks,
        "research": research,
        "rationale": clinical_rationale,
        "medications": medications,
        "notes": notes,
        "consensus": {
            "score": f"{consensus_score}/3",
            "status": "High" if consensus_score >= 2 else "Low",
            "algorithms": {
                "random_forest": primary_disease,
                "decision_tree": dt_pred,
                "naive_bayes": nb_pred,
            },
        },
        "message": "Clinical Consultation Dashboard Complete.",
    }
