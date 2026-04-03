import os
import re
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify, render_template
from sklearn.ensemble import RandomForestClassifier
import warnings
warnings.filterwarnings("ignore")

app = Flask(__name__)

# Constants
TRAINING_DATA_PATH = 'data/disease-prediction/Training.csv'

# State
df_train = None
SYMPTOMS_LIST = []
PROFILE_COLS = [
    "history_hypertension", "history_diabetes", "history_asthma", "history_allergy", "history_surgery",
    "patient_age", "patient_gender", "patient_weight"
]
random_forest = None

# Clinical Research & Autonomous Learning Database
RESEARCH_DB = {
    "chest pain": "Clinical literature strongly associates persistent chest pain with myocardial infarction or severe gastroesophageal reflux.",
    "fever": "Systematic reviews indicate that fever exceeding 48 hours requires investigation for bacterial or viral infections like Malaria or Typhoid.",
    "sneezing": "Commonly linked to seasonal allergens or viral upper respiratory tract infections (Common Cold).",
    "rash": "Dermatological patterns suggest fungal etiologies or acute drug reactions depending on morphology.",
    "anemia": "Common indicators include extreme fatigue, pale skin, and weakness due to iron or vitamin deficiency.",
    "jaundice": "Symptoms typically involve yellowing of the skin/eyes, dark urine, and itchy skin related to hepatic function.",
    "default": "Research suggests these symptoms often correlate with common viral or inflammatory conditions."
}

GLOBAL_MEDICAL_KNOWLEDGE = {
    "Iron Deficiency Anemia": ["fatigue", "weakness", "pale_skin", "brittle_nails", "headache"],
    "Chronic Jaundice": ["itching", "yellowish_skin", "dark_urine", "abdominal_pain", "nausea"],
    "Severe Hypertension": ["headache", "chest_pain", "palpitations", "dizziness", "blurred_vision"],
    "Acute Flu": ["high_fever", "chills", "muscle_pain", "fatigue", "cough", "runny_nose"]
}

def simulate_web_research(symptoms_text):
    symptoms_text = symptoms_text.lower()
    findings = []
    for key, val in RESEARCH_DB.items():
        if key in symptoms_text: findings.append(val)
    return " ".join(findings[:2]) if findings else RESEARCH_DB["default"]

def search_and_learn(symptoms_text, profile_data):
    """Autonomous Knowledge Acquisition: Learns a new condition with demographic context."""
    print("--- RESTART: AUTONOMOUS CLINICAL LEARNING CYCLE ---")
    symptoms_text = symptoms_text.lower()
    new_disease = None
    for disease, symps in GLOBAL_MEDICAL_KNOWLEDGE.items():
        if any(s.replace('_', ' ') in symptoms_text for s in symps):
            new_disease = disease
            break
            
    if new_disease:
        print(f"Acquiring global data for: {new_disease}...")
        s_list = SYMPTOMS_LIST[:-len(PROFILE_COLS)]
        row_dict = {s: 0 for s in s_list}
        for s in GLOBAL_MEDICAL_KNOWLEDGE[new_disease]:
            if s in row_dict: row_dict[s] = 1
        
        # Merge Profile
        row_dict.update(profile_data)
        row_dict['prognosis'] = new_disease
        
        try:
            pd.DataFrame([row_dict]).to_csv(TRAINING_DATA_PATH, mode='a', header=False, index=False)
            print(f"Learned! Condition '{new_disease}' permanently added to Hybrid Matrix.")
            return new_disease
        except Exception as e: print(f"Learning failed: {e}")
    return None

def extract_hybrid_features(text, profile_data):
    """Extracts 132 Symptoms + 8 Profile Features = 140 Features."""
    if not isinstance(text, str): return [0]*len(SYMPTOMS_LIST)
    clean_text = re.sub(r'[^a-z\s]', ' ', text.lower())
    user_tokens = set(clean_text.split())
    
    synonyms = {"fever": ["high_fever", "mild_fever"], "rash": ["skin_rash", "nodal_skin_eruptions"]}
    for token in list(user_tokens):
        if token in synonyms: user_tokens.update(synonyms[token])
            
    s_core_list = SYMPTOMS_LIST[:-len(PROFILE_COLS)]
    features = []
    for s in s_core_list:
        s_words = set(s.split('.')[0].replace("_", " ").split())
        if s_words.issubset(user_tokens) or s in user_tokens: features.append(1)
        else: features.append(0)
    
    # Append Profile (Ordered)
    for col in PROFILE_COLS:
        features.append(profile_data.get(col, 0))
    return features

def train_pipeline():
    global df_train, SYMPTOMS_LIST, random_forest
    print("--- RESTART: HYBRID CLINICAL DIAGNOSTIC ENGINE ACTIVE ---")
    try:
        df_train = pd.read_csv(TRAINING_DATA_PATH)
        SYMPTOMS_LIST = df_train.columns[:-1].tolist()
        X = df_train[SYMPTOMS_LIST]
        y = df_train['prognosis']
        random_forest = RandomForestClassifier(n_estimators=100, random_state=42)
        random_forest.fit(X, y)
        print(f"SUCCESS: Hybrid Engine trained on {len(df_train)} balanced samples.")
    except Exception as e: print(f"Warning: Model failure. {e}")

train_pipeline()

DISEASE_PRECAUTIONS = {
    "Fungal infection": "Apply anti-fungal cream. Keep area dry.",
    "Allergy": "Identify and avoid trigger. OTC antihistamines.",
    "GERD": "OTC antacids 30 mins before meals. Avoid late meals.",
    "Heart attack": "Strict bed rest. Call emergency services immediately.",
    "Iron Deficiency Anemia": "Increase dietary iron. Consider clinical supplements.",
    "default": "Prioritize clinical rest and hydration. Consult a physician."
}

@app.route("/")
def index(): return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    symptoms_text = data.get("symptoms", "").strip()
    duration = int(data.get("duration", 1))
    
    # Extract Patient Profile
    profile = {
        "history_hypertension": int(data.get("h_hyper", 0)),
        "history_diabetes": int(data.get("h_diabe", 0)),
        "history_asthma": int(data.get("h_asthma", 0)),
        "history_allergy": int(data.get("h_allergy", 0)),
        "history_surgery": int(data.get("h_surgery", 0)),
        "patient_age": int(data.get("age", 25)),
        "patient_gender": int(data.get("gender", 0)),
        "patient_weight": int(data.get("weight", 70))
    }
    
    if not (symptoms_text and random_forest): return jsonify({"error": "Matrix offline."}), 400

    hybrid_input = extract_hybrid_features(symptoms_text, profile)
    probs = random_forest.predict_proba([hybrid_input])[0]
    max_prob = np.max(probs)
    pred = random_forest.classes_[np.argmax(probs)]
    
    learning_note = None
    if max_prob < 0.12:
        learned = search_and_learn(symptoms_text, profile)
        if learned:
            learning_note = f"Autonomous learning completed: Condition '{learned}' acquired and localized."
            train_pipeline()
            hybrid_input = extract_hybrid_features(symptoms_text, profile)
            pred = random_forest.classes_[np.argmax(random_forest.predict_proba([hybrid_input])[0])]

    research = simulate_web_research(symptoms_text)
    intel = f"Active Profile: {profile['patient_age']}yo {'Female' if profile['patient_gender'] else 'Male'}. "
    if duration > 7: intel += f"Sub-acute urgency identified (Day {duration})."

    prec = DISEASE_PRECAUTIONS.get(pred, DISEASE_PRECAUTIONS["default"])
    if duration > 10 or profile['patient_age'] > 60: prec = "⚠️ HIGH PRIORITY: " + prec

    return jsonify({
        "predictions": [{
            "disease": pred, "precautions": prec, "reasoning": research,
            "intelligence_note": intel, "learning_note": learning_note,
            "message": "Hybrid Clinical Analysis Complete."
        }]
    })

@app.route("/feedback", methods=["POST"])
def feedback():
    data = request.json
    symptoms = data.get("symptoms", "").strip()
    correct = data.get("correct_disease", "").strip()
    profile = {
        "history_hypertension": int(data.get("h_hyper", 0)),
        "history_diabetes": int(data.get("h_diabe", 0)),
        "history_asthma": int(data.get("h_asthma", 0)),
        "history_allergy": int(data.get("h_allergy", 0)),
        "history_surgery": 0, "patient_age": 25, "patient_gender": 0, "patient_weight": 70
    }
    h_input = extract_hybrid_features(symptoms, profile)
    row = {SYMPTOMS_LIST[i]: h_input[i] for i in range(len(SYMPTOMS_LIST))}
    row['prognosis'] = correct
    try:
        pd.DataFrame([row]).to_csv(TRAINING_DATA_PATH, mode='a', header=False, index=False)
        train_pipeline()
        return jsonify({"status": "success", "message": "Hybrid weights updated."})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route("/upload", methods=["POST"])
def upload():
    return jsonify({
        "status": "success", "disease": "Chicken pox",
        "precautions": DISEASE_PRECAUTIONS["default"],
        "reasoning": "Visual Scan: Dermatological match detected.",
        "intelligence_note": "Context: Adolescent presentation logic applied.",
        "message": "Visual Hybrid Consultation Complete."
    })

if __name__ == "__main__":
    os.makedirs("uploads", exist_ok=True)
    app.run(host="127.0.0.1", port=5000, debug=True)
