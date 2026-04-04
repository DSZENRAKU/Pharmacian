# 💊 Pharmacian Monitoring — Clinical AI & Data Diagnostics

Pharmacian is an industry-grade medical diagnostic suite and hospital management system. It empowers local clinics and chemists (pharmacians) with an **Explainable AI (XAI)** decision-support system, real-time clinical analytics, and high-integrity data management—all within a secure, offline-first desktop environment.

Built for the **DarkSlayers Hackathon**, Pharmacian bridges the gap between raw patient symptoms and life-saving clinical insights.

---

## 🚨 Problem Statement

**India mein 70% population rural areas mein rehti hai jahan qualified doctors ki kami hai.**
Healthcare availability is geographically skewed. When rural patients fall ill, they usually first visit a local chemist (pharmacian) who lacks clinical diagnostic training. 

Pharmacian ek offline-first AI diagnostic tool hai jo chemists (pharmacians) ko enable karta hai basic disease identification karne ke liye — **bina internet ke, bina expensive equipment ke.** It acts as a clinical co-pilot, preventing misdiagnosis and suggesting critical follow-ups.

---

## 🏗️ Solution Architecture

```text
┌─────────────────────────────────────────────────────┐
│                  PHARMACIAN v2.0                    │
│                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐   │
│  │ Electron │───▶│  Flask   │───▶│  Random      │   │
│  │  Shell   │    │ REST API │    │  Forest AI   │   │
│  └────┬─────┘    └──────────┘    │  3-Model     │   │
│       │                          │  Consensus   │   │
│  ┌────▼─────┐                    └──────────────┘   │
│  │ SQLite   │                                       │
│  │ WAL Mode │    ┌──────────────────────────────┐   │
│  │ AES-256  │    │ Hindi/Marathi NLP Translator │   │
│  └──────────┘    └──────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## ⚔️ Key Differentiators vs Competitors

| Feature | Pharmacian | Web-based AI Tools (ChatGPT/WebMD) | Traditional Hospital Systems |
|---------|-------------|------------------------------------|------------------------------|
| **Connectivity** | **100% Offline Capable** | Requires High-Speed Internet | Needs Complex Intranets |
| **Data Privacy** | Local AES-256 Encryption | Sends Data to Cloud Engines | Heavy on-premise servers |
| **Language** | Native Hindi/Marathi NLP | Mostly English | English Only |
| **UX Context** | Tailored for fast chemist workflow | General purpose | Bloated and complex |
| **Clinical Alerts** | Built-in OS Notification | None | None |

---

## 📸 Demo Flow

1. **Dashboard & Analytics**: Start the app to view real-time patient charts, high-risk ratios, and use the **Clinical AI Assistant** chatbot to natively query the clinic's metrics.
2. **Patient Registration**: Navigate to the "New Assessment" tab. Enter the patient vitals and contact information.
3. **Symptom NLP Engine**: Type symptoms in English, Hindi, or Marathi (e.g., "chest_pain", "पीठ दर्द"). The NLP Translator dynamically maps it to the engine.
4. **AI Prediction & Risk Alert**: The AI processes the symptoms. If the patient is classified as "High Risk", the app immediately triggers a native OS Critical Notification.
5. **PDF Export**: Click export to generate an instant printable prescription/record PDF for the patient.
6. **Encrypted Backup**: Go to settings and trigger an AES-256 backup. Safely move `.phr` clinical data files between locations.

---

## 🚀 Recent Innovations (Hackathon Updates)

1. **Fuzzy Symptom Matching & Multilingual Support**: Detects unstructured local dialects (Marathi/Hindi).
2. **Clinical AI Chatbot**: An embedded floating assistant for data query driven by Claude AI.
3. **Smart OS Alerts**: OS-level notification system for severe condition flags.
4. **Real-time Metrics Dashboard**: Live monitoring for the entire clinic's traffic using zero-latency SQLite.

---

## 👨‍⚖️ Judges Q&A: The Competitive Edge

**Q1: How does the AI ensure clinical accountability?**
> **Answer**: We use **Explainable AI**. The system returns a diagnostic confidence score and mapped clinical rationale based on symptom driver-weights. The clinician can overrule the AI if required.

**Q2: How do you handle data portability and backups safely?**
> **Answer**: We implemented **industry-grade encrypted backups**. Unlike standard file copies, our `.phr` backups use AES-256-GCM. 

**Q3: Is the system scalable for larger clinics?**
> **Answer**: Yes. The architecture separates the AI engine (Flask service) from the management shell (Electron/SQLite). SQLite can instantly be swapped for PostgreSQL with zero core changes.

---

## 🔮 Future Roadmap

- **Telemedicine Integration**: Connect severe patients directly to urban doctors via video link directly from the Electron app.
- **WhatsApp API Alerts**: Automatically send prescriptions, dosage reminders, and follow-up warnings to rural patients' WhatsApp accounts.
- **Peer-to-Peer Cloud Sync (Optional)**: Enable a distributed, decentralized mesh network where clinics can sync anonymous epidemic trends without relying on a central database.

---

## 🛠️ Technical Stack
- **Shell**: Electron 31.0 (Node.js 20.x)
- **AI Engine**: Python 3.10, Scikit-Learn
- **Middleware**: Flask (REST API), Flask-CORS
- **Persistence**: SQLite (Better-SQLite3)
- **UI/UX**: Vanilla CSS (Glassmorphism), Chart.js, Vanilla JS.

---

## 🏃 Installation & Quick Start

1. **Environment Setup**:
   ```bash
   npm install
   pip install -r backend/requirements.txt
   ```
2. **Launch Application**:
   ```bash
   npm start
   ```
3. **Default Admin Login**:
   - **ID**: `admin`
   - **PIN**: `admin123`

---
*Developed by DarkSlayers for the clinical future.*
