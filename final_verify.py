import re

# Mock SYMPTOMS_LIST from CSV
SYMPTOMS_LIST = [
    "skin_rash",
    "stomach_pain",
    "continuous_sneezing",
    "runny_nose",
    "headache"
]

def extract_binary_features(text):
    if not isinstance(text, str): return [0]*len(SYMPTOMS_LIST)
    clean_text = re.sub(r'[^a-z\s]', ' ', text.lower())
    user_tokens = set(clean_text.split())
    
    features = []
    for s in SYMPTOMS_LIST:
        s_clean = s.split('.')[0]
        s_words = set(s_clean.replace("_", " ").split())
        
        # Match if all words in the symptom are in the user text
        if s_words.issubset(user_tokens):
            features.append(1)
        else:
            features.append(0)
    return features

# Test Cases
test_cases = [
    ("I have a rash on my skin", [1, 0, 0, 0, 0]), # Should match skin_rash
    ("pain in my stomach", [0, 1, 0, 0, 0]),     # Should match stomach_pain
    ("sneezing nonstop and runny nose", [0, 0, 0, 1, 0]) # continuous_sneezing won't match "nonstop"
]

print("--- Robust Extraction Verification ---")
for t, expected in test_cases:
    res = extract_binary_features(t)
    print(f"INPUT: '{t}'")
    print(f"RESULT:   {res}")
    # Note: 'continuous_sneezing' only matches if both 'continuous' and 'sneezing' are present.
