from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
TRAINING_DATA_PATH = BASE_DIR / "backend" / "data" / "disease-prediction" / "Training.csv"

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
    "chest pain": "Clinical literature associates persistent chest pain with acute myocardial infarction or severe esophageal reflux.",
    "fever": "Systematic reviews indicate fever exceeding 48 hours requires investigation for malaria or viral sepsis.",
    "sneezing": "Commonly linked to seasonal allergens or acute rhinitis.",
    "rash": "Dermatological patterns suggest fungal etiologies or drug reactions depending on morphology.",
    "default": "Research suggests these symptoms correlate with common inflammatory or viral conditions.",
}
