import re

SYMPTOMS_LIST = ["itching", "skin_rash", "continuous_sneezing", "headache", "runny_nose"]

def extract_binary_features(text):
    if not isinstance(text, str): return [0]*len(SYMPTOMS_LIST)
    text = text.lower()
    # Normalize spaces
    text = re.sub(r'\s+', ' ', text)
    
    fragments = re.split(r'[.,;]', text.lower())
    clean_pos_text = ""
    negations = ["no ", "not present", "none", "no evidence", "patient reports no", "is not", "isnt"]
    
    for frag in fragments:
        if not any(neg in frag for neg in negations):
            clean_pos_text += frag + " "
    
    print(f"Cleaned Text: '{clean_pos_text}'")
    features = []
    for s in SYMPTOMS_LIST:
        s_base = s.replace("_", " ")
        if s_base in clean_pos_text:
            print(f"Match found: {s_base}")
            features.append(1)
        else:
            features.append(0)
    return features

test_input = "I have continuous sneezing, runny nose, and some headache"
features = extract_binary_features(test_input)
print(f"Features: {features}")
