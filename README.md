# 🩺 Pharmacian | Clinical-Grade Disease Risk Assessment

A powerful, standalone clinical diagnostic platform that combines **Explainable AI (XAI)** with a modern, high-performance **Electron** interface. Designed for healthcare professionals to assess multi-disease risks with transparency and clinical precision.

**Hackathon Team**: DarkSlayers | **Lead Developer**: Omkar Kawale

---

## 🚩 Problem Statement
In fast-paced clinical environments, early diagnosis of complex conditions is often hindered by the lack of consolidated patient history and "black-box" AI models that provide answers without rationale. Clinicians need tools that not only predict risk but also provide **understandable clinical drivers** to support their final medical decision.

## 💡 The Solution
**Pharmacian** bridges the gap between raw medical data and clinical insight. By utilizing an ensemble of machine learning algorithms (Random Forest, Decision Tree, Naive Bayes), it provides:
- **Consensus-Based Diagnostics**: Higher confidence through algorithmic agreement.
- **Explainable Rationale**: A peak into the AI's "thought process" for every prediction.
- **Drug Interaction Safety**: Real-time FDA-backed safety checks for patient medication.
- **Seamless Data Management**: Secure, local-first patient record tracking.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend Shell** | Electron (v31) |
| **Core UI** | HTML5, CSS3 (Modern Vanilla), JavaScript (ESLint Standard) |
| **Backend Engine** | Python 3.13 (Flask Micro-service) |
| **Intelligence** | Scikit-Learn, Pandas (Random Forest & Bayesian Ensemble) |
| **Clinical Data** | OpenFDA API Integration |
| **Local Database** | SQLite3 (via better-sqlite3) |
| **Security** | Electron IPC Bridge with request validation |

---

## ⚡ Key Features

✅ **Multi-Disease Risk Assessment** - Predicts risk across various conditions  
✅ **Explainable AI (XAI)** - Transparent decision-making with clinical rationale  
✅ **FDA Drug Interaction Checker** - Real-time medication safety verification  
✅ **Private-First Architecture** - All data stored locally, no cloud dependency  
✅ **Patient History Tracking** - Built-in database for longitudinal care  
✅ **Light/Dark Theme Support** - Accessible UI for different clinical settings  
✅ **Voice Input Support** - Hands-free symptom entry for busy clinicians  
✅ **PDF Report Generation** - Printable clinical assessment reports  
✅ **Ensemble Consensus** - Combines Random Forest, Decision Tree, and Naive Bayes predictions

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js 16+**: [Download](https://nodejs.org/)
- **Python 3.10+**: [Download](https://www.python.org/)
- **~500MB** disk space for models and dependencies

### Installation Steps

**Step 1: Clone and Navigate**
```bash
cd Pharmacian-monitoring
```

**Step 2: Install Dependencies**
```bash
# Install Node.js dependencies (frontend + Electron)
npm install

# Install Python dependencies (backend ML engines)
pip install -r backend/requirements.txt
```

**Step 3: Configure Environment (Optional)**
```bash
# For Gemini clinical assistant feature:
# Create backend/.env file and add:
GEMINI_API_KEY=your_api_key_here
```

**Step 4: Launch Development Mode**
```bash
npm run dev
```

The app will:
- ✅ Spawn Flask backend on `localhost:5000`
- ✅ Initialize SQLite database
- ✅ Open Electron window with Pharmacian UI
- ✅ Be ready for clinical assessment input

### Running in Production
```bash
# Build Windows NSIS installer (.exe)
npm run build

# Output: dist/Pharmacian Setup 1.0.0.exe
# Double-click to install and run
```

---

## 📋 Top 20 Questions Judges Might Ask (& Our Answers)

### **Clinical Validity & Regulation**

**Q1: Is Pharmacian FDA-regulated or approved for clinical use?**  
A: Pharmacian is a **demonstration/prototype** for healthcare decision support, not a regulated medical device. For clinical deployment, it would require FDA 510(k) clearance and validation on diverse patient populations. Our ensemble approach and explainability features are designed to support (not replace) physician judgment.

**Q2: What is the clinical accuracy of your disease predictions?**  
A: Current models are trained on public datasets (Kaggle disease samples). Accuracy varies by condition (70-95% for the three modeled conditions). Real-world deployment requires validation on clinical cohorts with proper sensitivity/specificity metrics reviewed by medical professionals.

**Q3: How do you ensure patient data privacy and HIPAA compliance?**  
A: All data is stored **locally on the user's machine**—no data is sent to cloud servers, ensuring privacy by design. For HIPAA compliance in production, we'd implement encryption at rest and in transit, audit logging, and role-based access controls (RBAC).

---

### **AI/ML & Explainability**

**Q4: What does "Explainable AI" mean in your context, and how do you implement it?**  
A: We provide **three layers of explainability**:
1. **Feature Importance**: Which symptoms/patient attributes drove the prediction
2. **Model Consensus**: Agreement across Random Forest, Decision Tree, and Naive Bayes (higher consensus = higher confidence)
3. **Clinical Rationale**: Plain-language summaries of the AI reasoning

This follows the LIME/SHAP conceptual framework adapted for clinical interpretability.

**Q5: Why use three different ML models instead of one?**  
A: **Ensemble voting** reduces overfitting and increases robustness. Each model has different strengths:
- **Random Forest**: Captures complex nonlinear patterns
- **Decision Tree**: Provides transparent decision paths
- **Naive Bayes**: Fast, probabilistic reasoning for symptom combinations

Consensus across all three signals higher clinical confidence.

**Q6: How do you handle class imbalance in rare diseases?**  
A: We employ stratified train-test splits and class-weighted loss functions during training. For production, we'd use SMOTE (oversampling) or cost-sensitive learning to improve rare disease detection.

**Q7: What about adversarial robustness? Can the AI be fooled?**  
A: Current models are susceptible to adversarial inputs (e.g., nonsensical symptom combinations). For clinical deployment, we'd add input validation, anomaly detection, and model monitoring to flag suspicious patterns.

---

### **Drug Interaction & Safety**

**Q8: How does the FDA drug interaction checker work?**  
A: We query the **OpenFDA API** (public database) with medication combinations. The API returns known interactions from FDA adverse event reports and clinical literature. If the API is unavailable, the app shows a warning and allows manual review.

**Q9: Is the drug database real-time?**  
A: Yes—calls are made live to the OpenFDA API each time a user checks interactions. This ensures up-to-date safety data, but requires internet connectivity for this feature.

**Q10: What if a patient has an allergy not captured by the system?**  
A: Users can manually enter allergies and notes in the patient profile. The system displays these prominently in the assessment report. However, automatic cross-referencing against drug allergies would require expansion of the drug database.

---

### **Architecture & Technical**

**Q11: Why Electron instead of a web app?**  
A: **Electron provides**:
- Reliable offline operation (no internet needed for core diagnosis)
- Direct system access for speech input and file operations
- Single-click deployment as a native desktop app
- Better security through process sandboxing (vs. web browser vulnerabilities)

**Q12: How does the Electron-Flask bridge work?**  
A: Electron's main process spawns a Python Flask server on startup. The renderer process communicates via **IPC (Inter-Process Communication)** with request validation, preventing unauthorized access to the backend.

**Q13: Can the app run without Python installed?**  
A: For end-users, we package Python (via PyInstaller) inside the .exe installer (`bin/pharmacian_engine.exe`). Developers need Python installed separately.

**Q14: How large are the ML models, and will they fit on typical systems?**  
A: Models total ~50-100MB. Random Forest serialized as `.joblib`, transformers as `.safetensors`. Well within modern disk constraints. Load time: <1 second.

**Q15: What authentication/authorization mechanisms exist?**  
A: Currently, Pharmacian uses a **PIN shield** (optional) for basic protection. For clinical deployment, we'd integrate LDAP/Active Directory for provider authentication and role-based record access.

---

### **Data & Testing**

**Q16: Where does your training data come from?**  
A: Public datasets (e.g., Kaggle disease prediction datasets) and synthetic patient data. For production, clinical institutions would contribute real, de-identified patient cohorts for validation and retraining.

**Q17: How do you prevent data bias against certain demographics?**  
A: Current training data is anonymized, but we lack explicit demographic stratification. For production, we'd:
- Audit model performance across age, gender, ethnicity groups
- Use fairness-aware ML (e.g., Fairlearn) to balance performance
- Engage clinical and ethics boards for bias mitigation

**Q18: Do you have unit tests and CI/CD?**  
A: Yes. Backend has pytest tests in `backend/tests/`. Frontend testing is ongoing. For production, we'd expand test coverage (>80%) and integrate GitHub Actions for automated CI/CD.

---

### **Scalability & Deployment**

**Q19: Can Pharmacian scale to hospital networks?**  
A: Currently designed as standalone. To scale:
- Add multi-user support with a central secure server
- Implement user authentication (OAuth2, SSO)
- Add database replication and backup mechanisms
- Deploy via hospital VPNs or private cloud (AWS HealthLake, Azure Health Data Services)

**Q20: What's your plan for continuous model improvement?**  
A: Production roadmap includes:
- Collect anonymized prediction outcomes for feedback
- Monthly model retraining with new data
- A/B testing new ML architectures
- Clinical advisory board reviews for safety oversight

---

## 📸 User Interface Tour

### Dashboard
- Patient history with risk summaries
- Quick-stat widgets (total assessments, high-risk alerts)
- Theme toggle (light/dark mode)

### New Assessment
- Structured symptom and patient profile intake
- Auto-suggest based on symptom keywords
- Medication database with interaction checker
- Voice input support (experimental)

### Clinical Results
- **Disease Predictions** with confidence scores
- **Explainable Rationale** showing feature importance
- **Drug Interaction Warnings** (FDA-backed)
- **Risk Factors** and clinical recommendations
- **Research Summary** (potential complications)
- **PDF Export** for medical records

### Settings
- Database management (backup/restore)
- Theme preferences
- Shield PIN configuration
- App version and diagnostics

---

## 🔧 Development & Testing

### Run Tests
```bash
# Backend unit tests
pytest backend/tests/

# Backend inference benchmark
python backend/src/benchmark_inference.py
```

### Project Structure
```
Pharmacian-monitoring/
├── electron/              # Electron main/renderer processes
├── frontend/              # HTML/CSS/JavaScript UI
│   ├── static/           # app.js (MVVM state), style.css
│   └── templates/        # HTML pages
├── backend/              # Flask + ML engines
│   ├── api_endpoints.py  # REST API routes
│   ├── prediction_engine.py # Model inference orchestration
│   ├── reinforcement_engine.py # Feedback system
│   └── requirements.txt  # Python dependencies
├── models/               # Serialized ML models
├── saved_models/         # Pickled scikit-learn models
└── data/                 # Training data reference
```

### Troubleshooting

**App won't start:**
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000
# Kill process: taskkill /PID <pid> /F
```

**Models not loading:**
```bash
# Regenerate models from training data
python backend/src/train_classifier_model.py
```

**Database errors:**
```bash
# Reset database (will clear all patient records)
rm %APPDATA%\Electron\pharmacian.db
# Then restart the app
npm run dev
```

---

## 📊 Performance Metrics

- **Inference Time**: ~200-500ms per prediction (includes ensemble voting)
- **Memory Usage**: ~150MB base + ~100MB for models
- **Startup Time**: ~3-5 seconds (Flask spawn + model load)
- **Database Query**: <50ms for patient history retrieval

---

## 🛣️ Future Roadmap

- [ ] Multi-user support with secure backend
- [ ] HIPAA-compliant production build
- [ ] Integration with EHR systems (HL7/FHIR)
- [ ] Advanced NLP for unstructured clinical notes
- [ ] Federated learning for privacy-preserving model updates
- [ ] Real-time monitoring dashboard for clinician networks
- [ ] Continuous model validation and drift detection

---

## 👥 Team & Acknowledgments

**Team**: DarkSlayers  
**Lead Developer**: Omkar Kawale  
**Mentor Support**: [Hackathon Organizers]  
**Data Sources**: Kaggle, OpenFDA, medical literature

---

## ⚖️ License & Disclaimer

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) for details.

**DISCLAIMER**: Pharmacian is a **prototype/demonstration system** for educational purposes. It is **NOT** approved for medical diagnosis or treatment decisions. Always consult qualified healthcare professionals for medical advice. The authors assume no liability for clinical outcomes from system use.

---

## 📧 Support & Feedback

For issues, feature requests, or clinical feedback:
- Open a GitHub Issue
- Contact: [hackathon@darkslayers.dev](mailto:hackathon@darkslayers.dev)

---

**Last Updated**: April 2026 | **Version**: 1.0.0
