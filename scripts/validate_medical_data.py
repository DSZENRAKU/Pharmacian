import pandas as pd
import numpy as np
import re
from sklearn.metrics import accuracy_score
from sklearn.ensemble import RandomForestClassifier

# Load the Hybrid Dataset structure (140 features)
TRAINING_DATA_PATH = 'data/disease-prediction/Training.csv'
df_train = pd.read_csv(TRAINING_DATA_PATH)
ALL_FEATURES = df_train.columns[:-1].tolist()
SYMPTOMS_LIST = ALL_FEATURES[:-8]
PROFILE_COLS = ALL_FEATURES[-8:]

def extract_hybrid_features(text, profile):
    if not isinstance(text, str): return [0]*len(ALL_FEATURES)
    clean_text = re.sub(r'[^a-z\s]', ' ', text.lower())
    user_tokens = set(clean_text.split())
    
    synonyms = {"fever": ["high_fever", "mild_fever"], "rash": ["skin_rash", "nodal_skin_eruptions"]}
    for token in list(user_tokens):
        if token in synonyms: user_tokens.update(synonyms[token])
            
    features = []
    for s in SYMPTOMS_LIST:
        s_words = set(s.split('.')[0].replace("_", " ").split())
        if s_words.issubset(user_tokens) or s in user_tokens: features.append(1)
        else: features.append(0)
    
    # Append Profile
    for col in PROFILE_COLS:
        features.append(profile.get(col, 0))
    return features

# Train Final Hybrid Model
print("Evaluating Hybrid Medical AI (140 Features)...")
X_train = df_train[ALL_FEATURES]
y_train = df_train['prognosis']
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train)

# Test Cases with Demographics
test_cases = [
    ("sudden chest pain and sweating", {"patient_age": 70, "patient_gender": 0, "patient_weight": 95}, "Heart attack"),
    ("I have a fever and chills", {"patient_age": 25, "patient_gender": 1, "patient_weight": 60}, "Malaria"),
    ("skin rash and itching", {"patient_age": 10, "patient_gender": 0, "patient_weight": 35}, "Fungal infection")
]

print("\n--- HYBRID CLINICAL ACCURACY TEST ---")
passed = 0
for cmd, profile, expected in test_cases:
    feat = extract_hybrid_features(cmd, profile)
    p = clf.predict([feat])[0]
    is_match = p == expected
    if is_match: passed += 1
    print(f"INPUT: '{cmd}' (Age: {profile['patient_age']})")
    print(f"  PREDICTED: {p} (EXPECTED: {expected}) -> {'PASSED' if is_match else 'FAILED'}")

print(f"\nFinal Hybrid Score: {passed}/{len(test_cases)} cases passed.")
