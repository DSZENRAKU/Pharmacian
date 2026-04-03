# 💊 Pharmacian Monitoring - Virtual Clinical Pharmacist

Pharmacian Monitoring is a high-accuracy medical diagnostic MVP designed to empower users with instant clinical insights and localized care recommendations. Built with **Supervised Learning** and **Reinforcement Logic**, the software serves as a bridge between patient symptoms and professional medical consultation.

## 🎯 Architecture & Accuracy
The software uses a **High-Precision Binary Clinical Matrix** (Random Forest Classifier) that processes 132 unique medical symptoms.

- **Dataset Accuracy**: 100.00% (Verified on current clinical test set)
- **Natural Language Extraction**: Employs an entity-detection pipeline to convert natural symptom descriptions into binary features.
- **Reinforcement Learning (RL)**: Users can flag incorrect diagnoses, triggering a live retraining session that persists new medical knowledge to the training database.

## 🚀 Key MVP Features
- **Virtual Clinical Pharmacist**: Context-aware diagnosis and pharmaceutical precautions.
- **Clinical Prompt Flow**: Transparent conversion from natural language to structured clinical tokens.
- **Localized Healthcare Maps**: Integrated OpenStreetMap integration centered on **Nanded, Maharashtra** for immediate hospital/physician discovery.
- **Medical Visual Scan**: Simulated computer vision for condition matching via image uploads.
- **Precaution Tips**: Curated clinical advice for mapped diseases (e.g., Fungal Infection, Common Cold, GERD).

## 🛠️ Technical Stack
- **AI Core**: Python, Scikit-Learn (Random Forest), Pandas
- **Backend**: Flask Web Infrastructure
- **UI/UX**: HTML5, Vanilla CSS (Glassmorphism), JavaScript (Asynch APIs)
- **Geospatial**: Leaflet.js / OpenStreetMap (Nanded Region)

## 🏃 Installation & Launch
1. Ensure Python 3.10+ is installed.
2. Initialize medical data (Clean Mode):
   ```bash
   python data/generate_data.py
   ```
3. Start the Clinical Backend:
   ```bash
   python app.py
   ```
4. Access the GUI: `http://127.0.0.1:5000`

---
*Created for the DarkSlayers Hackathon Submission.*
