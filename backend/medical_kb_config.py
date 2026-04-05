import sys
from pathlib import Path

if getattr(sys, 'frozen', False):
    # Running in a bundled EXE (PyInstaller)
    BASE_DIR = Path(sys._MEIPASS)
else:
    # Running in a normal development environment
    BASE_DIR = Path(__file__).resolve().parent.parent
TRAINING_DATA_PATH = BASE_DIR / "backend" / "data" / "disease-prediction" / "Training.csv"
MODELS_DIR = BASE_DIR / "saved_models"
RF_MODEL_PATH = MODELS_DIR / "random_forest.joblib"
DT_MODEL_PATH = MODELS_DIR / "decision_tree.joblib"
NB_MODEL_PATH = MODELS_DIR / "naive_bayes.joblib"
SYMPTOMS_LIST_PATH = MODELS_DIR / "symptoms_list.joblib"

PROFILE_COLS = [
    "history_hypertension",
    "history_diabetes",
    "history_asthma",
    "history_allergy",
    "history_surgery",
    "patient_age",
    "patient_gender",
    "patient_weight",
]

# AI Healthcare Assistant - Detailed Knowledge Base
DISEASE_PANEL_INFO = {
    "Fungal infection": {
        "description": "A skin infection caused by a fungus. Can affect anywhere on the body.",
        "common_symptoms": "Itching, skin rash, nodal skin eruptions, dischromic patches.",
        "causes": "Warm and moist environments, poor hygiene, or cross-contamination.",
        "prevention": "Keep skin clean and dry, change socks daily, avoid sharing personal items.",
        "otc": "Clotrimazole or Terbinafine cream.",
    },
    "Allergy": {
        "description": "An immune system reaction to a foreign substance like pollen or pet dander.",
        "common_symptoms": "Continuous sneezing, shivering, chills, watering from eyes.",
        "causes": "Environmental allergens, pet hair, or mold.",
        "prevention": "Avoid known triggers, use air purifiers, maintain low indoor humidity.",
        "otc": "Cetirizine or Loratadine antihistamines.",
    },
    "GERD": {
        "description": "Gastroesophageal reflux occurs when stomach acid flows back into the esophagus.",
        "common_symptoms": "Stomach pain, acidity, ulcers on tongue, vomiting, cough, chest pain.",
        "causes": "Hiatal hernia, obesity, or consuming acidic/spicy foods.",
        "prevention": "Eat smaller meals, avoid lying down after eating, lose excess weight.",
        "otc": "Antacids or Proton-pump inhibitors (Omeprazole).",
    },
    "Heart attack": {
        "description": "CRITICAL EMERGENCY: Blood flow to the heart muscle is abruptly cut off.",
        "common_symptoms": "Severe chest pain, breathlessness, sweating, nausea, dizziness.",
        "causes": "Coronary artery disease, arterial blockage, or sudden exertion.",
        "prevention": "Manage cholesterol, exercise regularly, avoid smoking and high-stress scenarios.",
        "otc": "NONE. CALL EMERGENCY SERVICES IMMEDIATELY.",
    },
    "Malaria": {
        "description": "A life-threatening disease caused by parasites transmitted by infected mosquitoes.",
        "common_symptoms": "Chills, vomiting, high fever, headache, muscle pain, sweating.",
        "causes": "Infected Anopheles mosquito bite.",
        "prevention": "Use mosquito nets, wear long-sleeved clothing, use insect repellent.",
        "otc": "Requires prescription anti-malarials (Artemether-Lumefantrine).",
    },
    "Diabetes": {
        "description": "A chronic condition that affects how the body processes blood sugar (glucose).",
        "common_symptoms": "Fatigue, weight loss, excessive hunger, polyuria, blurred vision.",
        "causes": "Genetic factors, obesity, and sedentary lifestyle.",
        "prevention": "Regular glucose monitoring, low-glycemic diet, weight management.",
        "otc": "None. Requires physician supervision and insulin or Metformin.",
    },
}

# Clinical Research Simulation DB
RESEARCH_DB = {
    "fever": "Clinical studies show fever above 103°F for 3+ days warrants immediate evaluation. Common viral etiologies include influenza and COVID-19.",
    "chest pain": "Chest pain combined with shortness of breath has cardiac origin in ~30% of emergency presentations. Rule out ACS first.",
    "sneezing": "Commonly linked to seasonal allergens or acute rhinitis.",
    "rash": "Dermatological patterns suggest fungal etiologies or drug reactions depending on morphology.",
    "headache": "Recurrent headaches combined with visual disturbances require neurological assessment to rule out migraines or hypertension.",
    "nausea": "Nausea without localized abdominal pain is often self-limiting, frequently linked to viral gastroenteritis or foodborne illness.",
    "vomiting": "Severe vomiting leading to dehydration may require IV fluids. Monitor electrolytes closely.",
    "breathlessness": "Dyspnea is a key marker for cardiopulmonary distress, including COPD exacerbations and congestive heart failure.",
    "dizziness": "Vertigo and dizziness often stem from benign paroxysmal positional vertigo (BPPV) or orthostatic hypotension.",
    "muscle aches": "Myalgia is highly correlative with systemic viral infections like influenza, or statin-induced myopathy.",
    "sore throat": "Pharyngitis is predominantly viral, though Group A Streptococcus accounts for 10-15% of adult cases.",
    "chills": "Rigors typically accompany abrupt temperature spikes due to bacteremia or severe viral illness.",
    "abdominal pain": "Right lower quadrant pain necessitates ruling out appendicitis, while upper quadrants suggest biliary or gastric issues.",
    "cold": "Upper respiratory infections generally resolve within 7-10 days with symptomatic management.",
    "diarrhea": "Acute diarrhea is most often infective. Rehydration is the primary clinical intervention.",
    "constipation": "Chronic constipation in older adults may signify functional bowel disorders or medication side effects.",
    "itching": "Pruritus without visible rash requires investigation into hepatic or renal function.",
    "joint pain": "Arthralgia in multiple joints often points towards rheumatoid arthritis or post-viral inflammatory response.",
    "fatigue": "Chronic fatigue lasting >6 months requires comprehensive assessment for thyroid dysfunction, anemia, or CFS.",
    "cough": "A persistent cough >8 weeks is defined as chronic and may require spirometry or chest radiography.",
    "default": "Research suggests these symptoms correlate with common inflammatory or viral conditions.",
}
