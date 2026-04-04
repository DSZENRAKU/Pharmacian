"""
Hybrid Medical Dataset Generator:
Integrates Clinical Symptoms (132) + Patient Profile (Age, Gender, Weight, History).
Refined Medically Consistent Profiles for all 41 diagnostic classes.
"""

import random
import os
import pandas as pd

random.seed(42)

SYMPTOMS = [
    "itching","skin_rash","nodal_skin_eruptions","continuous_sneezing","shivering","chills",
    "joint_pain","stomach_pain","acidity","ulcers_on_tongue","muscle_wasting","vomiting",
    "burning_micturition","spotting_ urination","fatigue","weight_gain","anxiety",
    "cold_hands_and_feets","mood_swings","weight_loss","restlessness","lethargy",
    "patches_in_throat","irregular_sugar_level","cough","high_fever","sunken_eyes",
    "breathlessness","sweating","dehydration","indigestion","headache","yellowish_skin",
    "dark_urine","nausea","loss_of_appetite","pain_behind_the_eyes","back_pain","constipation",
    "abdominal_pain","diarrhoea","mild_fever","yellow_urine","yellowing_of_eyes",
    "acute_liver_failure","swelling_of_stomach","swelled_lymph_nodes",
    "malaise","blurred_and_distorted_vision","phlegm","throat_irritation","redness_of_eyes",
    "sinus_pressure","runny_nose","congestion","chest_pain","weakness_in_limbs",
    "fast_heart_rate","pain_during_bowel_motions","pain_in_anal_region","bloody_stool",
    "irritation_in_anus","neck_pain","dizziness","cramps","bruising","obesity","swollen_legs",
    "swollen_blood_vessels","puffy_face_and_eyes","enlarged_thyroid","brittle_nails",
    "swollen_extremeties","excessive_hunger","extra_marital_contacts","drying_and_tingling_lips",
    "slurred_speech","knee_pain","hip_joint_pain","muscle_weakness","stiff_neck",
    "swelling_joints","movement_stiffness","spinning_movements","loss_of_balance",
    "unsteadiness","weakness_of_one_body_side","loss_of_smell","bladder_discomfort",
    "foul_smell_of urine","continuous_feel_of_urine","passage_of_gases","internal_itching",
    "toxic_look_(typhos)","depression","irritability","muscle_pain","altered_sensorium",
    "red_spots_over_body","belly_pain","abnormal_menstruation","dischromic _patches",
    "watering_from_eyes","increased_appetite","polyuria","family_history","mucoid_sputum",
    "rusty_sputum","lack_of_concentration","visual_disturbances","receiving_blood_transfusion",
    "receiving_unsterile_injections","coma","stomach_bleeding","distention_of_abdomen",
    "history_of_alcohol_consumption","fluid_overload","blood_in_sputum",
    "prominent_veins_on_calf","palpitations","painful_walking","pus_filled_pimples",
    "blackheads","scurring","skin_peeling","silver_like_dusting","small_dents_in_nails",
    "inflammatory_nails","blister","red_sore_around_nose","yellow_crust_ooze"
]

PROFILE_COLS = [
    "history_hypertension", "history_diabetes", "history_asthma", "history_allergy", "history_surgery",
    "patient_age", "patient_gender", "patient_weight"
]

ALL_COLS = SYMPTOMS + PROFILE_COLS + ["prognosis"]
NUM_SYMPTOMS = len(SYMPTOMS)

DISEASE_PROFILE_MAP = {
    "Fungal infection": [0, 1, 2, 126],
    "Allergy": [3, 4, 101, 53, 54],
    "GERD": [9, 11, 12, 30, 32, 50],
    "Chronic cholestasis": [32, 33, 43, 44, 34],
    "Drug Reaction": [1, 11, 30, 36, 95],
    "Peptic ulcer diseae": [11, 30, 35, 39, 44, 110],
    "AIDS": [14, 32, 46, 51, 92],
    "Diabetes ": [14, 19, 104, 103, 102],
    "Gastroenteritis": [11, 40, 26, 29],
    "Bronchial Asthma": [24, 27, 50, 55, 57],
    "Hypertension ": [31, 57, 64, 112],
    "Migraine": [31, 34, 49, 52, 53],
    "Cervical spondylosis": [31, 57, 82, 83],
    "Paralysis (brain hemorrhage)": [31, 57, 85, 86, 87],
    "Jaundice": [11, 32, 33, 43, 44],
    "Malaria": [4, 5, 11, 14, 25, 28],
    "Chicken pox": [1, 4, 11, 14, 25, 120],
    "Dengue": [1, 6, 11, 14, 25, 28, 31],
    "Typhoid": [4, 14, 25, 31, 34, 35],
    "hepatitis A": [32, 33, 40, 43, 44, 46],
    "Hepatitis B": [14, 32, 33, 43, 44, 46, 110],
    "Hepatitis C": [14, 32, 33, 43, 44],
    "Hepatitis D": [14, 32, 33, 43, 44, 46, 111],
    "Hepatitis E": [11, 14, 32, 33, 40, 43, 44],
    "Alcoholic hepatitis": [11, 14, 32, 40, 110, 111],
    "Tuberculosis": [14, 24, 25, 27, 28, 50, 107],
    "Common Cold": [3, 24, 31, 53, 54, 55],
    "Pneumonia": [4, 5, 14, 24, 27, 28, 50],
    "Dimorphic hemmorhoids(piles)": [38, 59, 60, 61, 62],
    "Heart attack": [27, 28, 55, 57, 112],
    "Varicose veins": [68, 69, 112, 113, 114],
    "Hypothyroidism": [14, 15, 66, 71, 72, 73],
    "Hyperthyroidism": [14, 19, 28, 57, 74, 112],
    "Hypoglycemia": [14, 17, 28, 34, 57, 112],
    "Osteoarthristis": [6, 37, 76, 78, 79],
    "Arthritis": [6, 76, 80, 81, 82],
    "(vertigo) Paroymsal  Positional Vertigo": [11, 28, 63, 85, 86],
    "Acne": [1, 120, 121, 122],
    "Urinary tract infection": [8, 12, 13, 88],
    "Psoriasis": [1, 123, 124, 125, 126],
    "Impetigo": [1, 127, 128, 129, 130]
}

def make_row(disease):
    row = [0] * NUM_SYMPTOMS
    core = DISEASE_PROFILE_MAP.get(disease, [])
    for idx in core:
        if idx < NUM_SYMPTOMS:
            row[idx] = 1
    
    # Profile Logic (Correlated Noise)
    # 1. Age (Elderly at higher risk for Heart, Hypertension)
    age = random.randint(10, 85)
    if disease in ["Heart attack", "Hypertension "]:
        age = random.randint(50, 90)
    elif disease == "Chicken pox":
        age = random.randint(3, 18)
    
    # 2. Gender (Mock bias e.g. Anemia/Thyroid in Females)
    gender = random.randint(0, 1) # 0 = M, 1 = F
    if disease in ["Hypothyroidism", "Hyperthyroidism"]:
        gender = random.choices([0, 1], [0.2, 0.8])[0]
        
    # 3. Weight (Obesity bias)
    weight = random.randint(40, 110)
    if disease in ["Diabetes ", "Hypertension "]:
        weight = random.randint(85, 130)
        
    # 4. Chronic History Bias (Binary) - 20% match probability
    hist_hyper = 1 if (disease == "Hypertension " or random.random() < 0.1) else 0
    hist_diabe = 1 if (disease == "Diabetes " or random.random() < 0.1) else 0
    hist_asthma = 1 if (disease == "Bronchial Asthma" or random.random() < 0.1) else 0
    hist_allergy = 1 if (disease == "Allergy" or random.random() < 0.1) else 0
    hist_surgery = 1 if random.random() < 0.05 else 0

    # Append Profile Features
    row.extend([hist_hyper, hist_diabe, hist_asthma, hist_allergy, hist_surgery, age, gender, weight])
    row.append(disease)
    return row

def main():
    os.makedirs("data/disease-prediction", exist_ok=True)
    rows = []
    print("Generating Hybrid Master Matrix (140 features per disease)...")
    for disease in DISEASE_PROFILE_MAP.keys():
        for _ in range(120): # Balanced Target classes
            rows.append(make_row(disease))
    
    full = pd.DataFrame(rows, columns=ALL_COLS)
    train = full.sample(frac=0.8, random_state=42)
    test = full.drop(train.index)
    
    train.to_csv("data/disease-prediction/Training.csv", index=False)
    test.to_csv("data/disease-prediction/Testing.csv", index=False)
    print("Hybrid Export Complete.")

if __name__ == "__main__":
    main()
