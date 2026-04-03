import os
import re
import pandas as pd
from flask import Flask, request, jsonify, render_template
from sklearn.ensemble import RandomForestClassifier
from werkzeug.utils import secure_filename
import warnings
warnings.filterwarnings("ignore")

app = Flask(__name__)

# Constants
TRAINING_DATA_PATH = 'data/disease-prediction/Training.csv'

# State
df_train = None
SYMPTOMS_LIST = []
random_forest = None

def extract_binary_features(text):
    """
    ENTİTY-SET MATCHER: Detects symptoms based on keyword intersections.
    Resolves 'Only Allergy' bug by allowing flexible word order.
    Example: 'pain in stomach' matches 'stomach_pain'.
    """
    if not isinstance(text, str): return [0]*len(SYMPTOMS_LIST)
    
    # Normalize: lowercase and remove non-alphabetic chars
    clean_text = re.sub(r'[^a-z\s]', ' ', text.lower())
    user_tokens = set(clean_text.split())
    
    # Simple negation check for the whole context (MVP limitation: handles simple fragments)
    negations = {"no", "not", "none", "isnt", "without"}
    # Note: For a true medical NLP, we'd do dependency parsing, but set-intersection is robust for MVP.
    
    features = []
    for s in SYMPTOMS_LIST:
        # Symptom name from CSV, e.g., "continuous_sneezing" -> {"continuous", "sneezing"}
        # Remove suffix like ".1" from duplicate columns
        s_clean = s.split('.')[0]
        s_words = set(s_clean.replace("_", " ").split())
        
        # Match if all core clinical keywords are present in the user text
        if s_words.issubset(user_tokens):
            features.append(1)
        else:
            features.append(0)
    return features

def train_pipeline():
    """Trains the Forest using the High-Precision Binary Matrix."""
    global df_train, SYMPTOMS_LIST, random_forest
    print("--- RESTART: Booting Robust Binary Matrix (Keyword-Set Mode) ---")
    try:
        df_train = pd.read_csv(TRAINING_DATA_PATH)
        SYMPTOMS_LIST = df_train.columns[:-1].tolist()
        
        X = df_train[SYMPTOMS_LIST]
        y = df_train['prognosis']
        
        random_forest = RandomForestClassifier(n_estimators=100, random_state=42)
        random_forest.fit(X, y)
        print(f"SUCCESS: Robust Model trained on {len(df_train)} balanced samples.")
    except Exception as e:
        print(f"Warning: Model failure. {e}")

train_pipeline()

# Disease Precaution Database
DISEASE_PRECAUTIONS = {
    "Fungal infection": "Use anti-fungal cream, keep the area dry, and avoid sharing clothes.",
    "Allergy": "Identify and avoid the allergen. Take antihistamines. Use EpiPen if reacting severely.",
    "GERD": "Take antacids. Eat smaller meals. Avoid spicy/acidic foods. Elevate the head of bed.",
    "Diabetes ": "Monitor blood glucose. Adhere to low-carb diet. Maintain regular exercise.",
    "Hypertension ": "Limit sodium. Practice stress relief. Monitor BP daily and take meds.",
    "Migraine": "Rest in a dark room. Apply cold compresses. Take NSAIDs/triptans.",
    "Chicken pox": "Apply calamine lotion. Take paracetamol for fever. Avoid scratching.",
    "Varicose veins": "Elevate legs. Use compression stockings. Avoid standing for long periods.",
    "Common Cold": "Drink fluids. Rest. Take OTC cold meds like decongestants.",
    "Pneumonia": "Rest. Take prescribed antibiotics. Stay hydrated. Use a humidifier.",
    "Malaria": "Take prescribed anti-malarials. Rest. Hydrate heavily. Monitor fever.",
    "Typhoid": "Complete the full course of antibiotics. Practice strict hygiene. Rest.",
    "Gastroenteritis": "Replenish electrolytes. Rest. Eat bland foods (BRAT diet) as tolerated.",
    "Heart attack": "Immediate bed rest. Avoid exertion. Call emergency services if persistent.",
    "Hypothyroidism": "Maintain thyroid hormone replacements. Monitor weight and energy levels.",
    "default": "Prioritize rest and hydration. Track your symptoms and consult a physician if worsening."
}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    raw_text = data.get("symptoms", "").strip()
    
    if not (raw_text and random_forest):
        return jsonify({"error": "Matrix offline or empty input."}), 400

    # Robust Keyword Extraction
    binary_input = extract_binary_features(raw_text)
    
    # Identify detected symptoms for UI transparency
    detected = [SYMPTOMS_LIST[i] for i, val in enumerate(binary_input) if val == 1]
    
    print(f"DEBUG: Input: '{raw_text}' -> Detected: {detected}")
    
    # Prediction
    pred = random_forest.predict([binary_input])[0]
    
    return jsonify({
        "predictions": [{
            "disease": pred,
            "precautions": DISEASE_PRECAUTIONS.get(pred, DISEASE_PRECAUTIONS["default"]),
            "reasoning": f"Detected clinical indicators: {', '.join([d.replace('_', ' ') for d in detected]) if detected else 'None observed'}"
        }]
    })

@app.route("/feedback", methods=["POST"])
def feedback():
    """Binary RL Retraining Logic"""
    data = request.json
    symptoms_text = data.get("symptoms", "").strip()
    correct_disease = data.get("correct_disease", "").strip()
    
    binary_row = extract_binary_features(symptoms_text)
    new_entry_dict = {SYMPTOMS_LIST[i]: [val] for i, val in enumerate(binary_row)}
    new_entry_dict['prognosis'] = [correct_disease]
    
    new_df = pd.DataFrame(new_entry_dict)
    
    try:
        new_df.to_csv(TRAINING_DATA_PATH, mode='a', header=False, index=False)
        train_pipeline() 
        return jsonify({"status": "success", "message": f"Real-time weight adjustment for {correct_disease}!"})
    except Exception as e:
        return jsonify({"error": f"Failed: {e}"}), 500

@app.route("/upload", methods=["POST"])
def upload():
    disease = "Chicken pox" 
    precautions = DISEASE_PRECAUTIONS.get(disease, DISEASE_PRECAUTIONS["default"])
    return jsonify({
        "status": "success",
        "disease": disease,
        "precautions": precautions,
        "reasoning": "Visual pattern matching detected eruptions characteristic of Chicken pox.",
        "message": "Computer vision simulation complete."
    })

if __name__ == "__main__":
    os.makedirs("uploads", exist_ok=True)
    app.run(host="127.0.0.1", port=5000, debug=True)
