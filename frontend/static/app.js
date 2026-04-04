document.addEventListener("DOMContentLoaded", () => {
    const Model = {
        state: {
            profile: {
                age: 25,
                gender: "0",
                weight: 70,
                h_hyper: false,
                h_diabe: false,
                h_asthma: false,
                h_allergy: false,
                h_surgery: false
            },
            notes: "",
            medications: [],
            theme: "dark",
            consent: false,
            shieldPin: null
        },
        load() {
            const savedProfile = JSON.parse(localStorage.getItem("pharmacian_v2_profile") || "null");
            if (savedProfile) {
                Model.state.profile = {
                    ...Model.state.profile,
                    ...savedProfile
                };
            }
            Model.state.notes = localStorage.getItem("pharmacian_notes") || "";
            const meds = JSON.parse(localStorage.getItem("pharmacian_medications") || "[]");
            Model.state.medications = Array.isArray(meds) ? meds : [];
            Model.state.theme = localStorage.getItem("pharmacian_theme")
                || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
            Model.state.consent = localStorage.getItem("pharmacian_consent") === "true";
            Model.state.shieldPin = localStorage.getItem("pharmacian_shield_pin");
        },
        saveProfile() {
            localStorage.setItem("pharmacian_v2_profile", JSON.stringify(Model.state.profile));
        },
        saveNotes() {
            localStorage.setItem("pharmacian_notes", Model.state.notes);
        },
        saveMeds() {
            localStorage.setItem("pharmacian_medications", JSON.stringify(Model.state.medications));
        },
        saveTheme() {
            localStorage.setItem("pharmacian_theme", Model.state.theme);
        },
        saveConsent() {
            localStorage.setItem("pharmacian_consent", Model.state.consent ? "true" : "false");
        },
        saveShieldPin(pin) {
            localStorage.setItem("pharmacian_shield_pin", pin);
            Model.state.shieldPin = pin;
        }
    };

    const View = {
        refs: {},
        chart: null,
        init() {
            const r = (id) => document.getElementById(id);
            View.refs = {
                symptoms: r("symptoms"),
                duration: r("duration"),
                durationVal: r("duration-val"),
                predictBtn: r("predict-btn"),
                voiceBtn: r("voice-btn"),
                loader: r("loader"),
                results: r("results"),
                predictionsList: r("predictions-list"),
                chartCanvas: r("probabilityChart"),
                questionTerminal: r("question-terminal"),
                questionText: r("question-text"),
                optionButtons: r("option-buttons"),
                skipBtn: r("skip-questions"),
                errorBanner: r("error-banner"),
                themeBtn: r("theme-btn"),
                themeIcon: r("theme-btn").querySelector("i"),
                consentGuard: r("consent-guard"),
                consentCheck: r("consent-check"),
                consentBtn: r("consent-btn"),
                shieldOverlay: r("shield-overlay"),
                shieldPinInput: r("shield-pin"),
                shieldError: r("shield-error"),
                pAge: r("p-age"),
                pGender: r("p-gender"),
                pWeight: r("p-weight"),
                hHyper: r("h-hyper"),
                hDiabe: r("h-diabe"),
                hAsthma: r("h-asthma"),
                hAllergy: r("h-allergy"),
                hSurgery: r("h-surgery"),
                medName: r("med-name"),
                medDose: r("med-dose"),
                medFreq: r("med-frequency"),
                addMed: r("add-med"),
                medList: r("med-list"),
                medWarning: r("med-warning"),
                medSummary: r("med-summary"),
                notesInput: r("clinical-notes"),
                notesSummary: r("notes-summary"),
                reportProfile: r("report-profile"),
                reportMeds: r("report-meds"),
                reportNotes: r("report-notes"),
                reportRisks: r("report-risks"),
                interactionWarnings: r("interaction-warnings"),
                riskDashboard: r("risk-dashboard"),
                riskListMain: r("risk-list-main"),
                rationaleCard: r("technical-analysis-card"),
                rationaleList: r("rationale-list"),
                consensusStatus: r("consensus-status"),
                consensusScore: r("consensus-score"),
                rfVote: r("rf-vote").querySelector(".vote-val"),
                dtVote: r("dt-vote").querySelector(".vote-val"),
                nbVote: r("nb-vote").querySelector(".vote-val"),
                researchText: r("research-text"),
                intelligenceText: r("intelligence-text")
            };
        },
        setTheme(mode) {
            document.documentElement.setAttribute("data-theme", mode);
            if (View.refs.themeIcon) {
                View.refs.themeIcon.className = mode === "light" ? "fas fa-sun" : "fas fa-moon";
            }
        },
        setDurationLabel(value) {
            View.refs.durationVal.innerText = `${value} Day${value > 1 ? "s" : ""}`;
        },
        showLoader() {
            View.refs.loader.classList.remove("hidden");
        },
        hideLoader() {
            View.refs.loader.classList.add("hidden");
        },
        showResults() {
            View.refs.results.classList.remove("hidden");
        },
        hideResults() {
            View.refs.results.classList.add("hidden");
        },
        showQuestions(questions, onSelect, onSkip) {
            View.refs.optionButtons.innerHTML = "";
            View.refs.questionTerminal.classList.remove("hidden");
            questions.forEach((q) => {
                const btn = document.createElement("button");
                btn.className = "primary-btn";
                btn.style.width = "auto";
                btn.style.padding = "0.5rem 1rem";
                btn.style.fontSize = "0.85rem";
                btn.innerText = `Yes, I have ${q.name}`;
                btn.onclick = () => onSelect(q.name);
                View.refs.optionButtons.appendChild(btn);
            });
            View.refs.skipBtn.onclick = onSkip;
        },
        hideQuestions() {
            View.refs.questionTerminal.classList.add("hidden");
        },
        showError(message) {
            View.refs.errorBanner.innerText = message;
            View.refs.errorBanner.classList.remove("hidden");
        },
        clearError() {
            View.refs.errorBanner.classList.add("hidden");
            View.refs.errorBanner.innerText = "";
        },
        renderProbabilityChart(predictions) {
            const labels = predictions.map(p => p.disease);
            const values = predictions.map(p => p.probability);
            if (View.chart) View.chart.destroy();
            View.chart = new Chart(View.refs.chartCanvas, {
                type: "doughnut",
                data: {
                    labels,
                    datasets: [{
                        data: values,
                        backgroundColor: ["#7c4dff", "#b388ff", "#00e676", "#ffab40", "#94a3b8"],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    cutout: "75%"
                }
            });
        },
        renderPredictions(predictions) {
            View.refs.predictionsList.innerHTML = "";
            predictions.forEach((p, idx) => {
                const confTag = p.probability > 75 ? "PRIMARY" : "DIFFERENTIAL";
                const confColor = p.probability > 75 ? "#00e676" : "#94a3b8";
                const card = document.createElement("div");
                card.className = "glass-panel disease-module";
                card.style.padding = "1.5rem";
                card.style.marginBottom = "1rem";
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div>
                            <h4 style="font-weight: 700; color: #fff;">${idx + 1}. ${p.disease}</h4>
                            <span style="font-size: 0.7rem; font-weight: 700; color: ${confColor}; letter-spacing: 1px;">${confTag} DIAGNOSIS</span>
                        </div>
                        <span class="cond-prob" style="background: var(--accent-glow); color: var(--accent); padding: 2px 10px; border-radius: 10px;">${p.probability}% Match</span>
                    </div>
                    <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 10px;">${p.info.description}</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.8rem;">
                        <div class="panel-sect"><strong>🧩 Symptoms:</strong><br>${p.info.common_symptoms}</div>
                        <div class="panel-sect"><strong>🦠 Causes:</strong><br>${p.info.causes}</div>
                    </div>
                `;
                View.refs.predictionsList.appendChild(card);
            });
        },
        renderRisks(risks) {
            View.refs.riskListMain.innerHTML = "";
            if (risks && risks.length > 0) {
                View.refs.riskDashboard.classList.remove("hidden");
                risks.forEach(r => {
                    const rCard = document.createElement("div");
                    rCard.className = `risk-item-main ${r.risk.toLowerCase()}`;
                    rCard.innerHTML = `
                        <div class="risk-info"><strong>${r.condition}</strong> (${r.risk} Risk)</div>
                        <div class="risk-bar-container"><div class="risk-bar" style="width: ${r.risk === "High" ? "90%" : "50%"}"></div></div>
                        <p style="font-size: 0.8rem; opacity: 0.7; margin-top: 5px;">${r.note}</p>
                    `;
                    View.refs.riskListMain.appendChild(rCard);
                });
            } else {
                View.refs.riskDashboard.classList.add("hidden");
            }
        },
        renderXAI(rationale, consensus) {
            if (rationale && consensus) {
                View.refs.rationaleCard.classList.remove("hidden");
                View.refs.rationaleList.innerHTML = rationale.map(s => `<li>${s}</li>`).join("");
                View.refs.consensusScore.innerText = consensus.score;
                View.refs.consensusStatus.innerText = `${consensus.status} Confidence`;
                View.refs.consensusStatus.style.background = consensus.status === "High" ? "#00e676" : "#ffab40";
                View.refs.consensusStatus.style.color = "#000";
                View.refs.rfVote.innerText = consensus.algorithms.random_forest;
                View.refs.dtVote.innerText = consensus.algorithms.decision_tree;
                View.refs.nbVote.innerText = consensus.algorithms.naive_bayes;
            } else {
                View.refs.rationaleCard.classList.add("hidden");
            }
        },
        renderResearch(research, primaryDisease) {
            View.refs.researchText.innerText = research;
            View.refs.intelligenceText.innerText = `${primaryDisease}: Assessment aligned with standard clinical guidelines based on symptom presentation.`;
        },
        renderMeds(list) {
            View.refs.medList.innerHTML = "";
            View.refs.medSummary.innerHTML = "";
            if (!list || list.length === 0) {
                View.refs.medSummary.innerHTML = '<div class="small-muted">No medications recorded.</div>';
                return;
            }
            list.forEach((m, idx) => {
                const item = document.createElement("div");
                item.className = "med-item";
                item.innerHTML = `<div><strong>${m.name}</strong> <span>— Dose: ${m.dose} — ${m.frequency}</span></div>`;
                const rm = document.createElement("button");
                rm.className = "med-remove";
                rm.innerText = "Remove";
                rm.onclick = () => ViewModel.removeMedication(idx);
                item.appendChild(rm);
                View.refs.medList.appendChild(item);

                const summaryItem = document.createElement("div");
                summaryItem.className = "med-item";
                summaryItem.innerHTML = `<div><strong>${m.name}</strong> <span>— Dose: ${m.dose} — ${m.frequency}</span></div>`;
                View.refs.medSummary.appendChild(summaryItem);
            });
        },
        renderNotes(text) {
            View.refs.notesSummary.textContent = text || "No notes added.";
        },
        renderReport(data) {
            const profile = Model.state.profile;
            View.refs.reportProfile.innerHTML = [
                { label: "Age", value: profile.age },
                { label: "Gender", value: profile.gender === "1" ? "Female" : "Male" },
                { label: "Weight", value: `${profile.weight} kg` }
            ].map(i => `<div class="report-item"><span>${i.label}</span><strong>${i.value}</strong></div>`).join("");

            const meds = Array.isArray(data.medications) ? data.medications : [];
            View.refs.reportMeds.innerHTML = meds.length === 0
                ? '<div class="small-muted">No medications recorded.</div>'
                : meds.map(m => `<div class="report-item"><span>${m.name}</span><strong>${m.dose}</strong></div>`).join("");

            View.refs.reportNotes.textContent = data.notes || "No notes added.";

            const risks = Array.isArray(data.risks) ? data.risks : [];
            View.refs.reportRisks.innerHTML = risks.length === 0
                ? '<div class="small-muted">No risk flags detected.</div>'
                : risks.map(r => `<div class="report-item"><span>${r.condition}</span><strong>${r.risk}</strong></div>`).join("");
        },
        renderInteractionWarnings(warnings) {
            if (!warnings || warnings.length === 0) {
                View.refs.interactionWarnings.classList.add("hidden");
                View.refs.interactionWarnings.innerText = "";
                return;
            }
            View.refs.interactionWarnings.innerText = warnings.join(" ");
            View.refs.interactionWarnings.classList.remove("hidden");
        },
        setInputsFromModel() {
            const p = Model.state.profile;
            View.refs.pAge.value = p.age;
            View.refs.pGender.value = p.gender;
            View.refs.pWeight.value = p.weight;
            View.refs.hHyper.checked = p.h_hyper;
            View.refs.hDiabe.checked = p.h_diabe;
            View.refs.hAsthma.checked = p.h_asthma;
            View.refs.hAllergy.checked = p.h_allergy;
            View.refs.hSurgery.checked = p.h_surgery;
            View.refs.notesInput.value = Model.state.notes;
        }
    };

    const ViewModel = {
        init() {
            Model.load();
            View.init();
            View.setTheme(Model.state.theme);
            View.setDurationLabel(View.refs.duration.value);
            View.setInputsFromModel();
            View.renderMeds(Model.state.medications);
            View.renderNotes(Model.state.notes);
            ViewModel.bindEvents();
            ViewModel.initPrivacyFlow();
            ViewModel.initVoiceInput();
        },
        bindEvents() {
            View.refs.themeBtn.addEventListener("click", () => {
                Model.state.theme = Model.state.theme === "light" ? "dark" : "light";
                Model.saveTheme();
                View.setTheme(Model.state.theme);
            });
            View.refs.duration.addEventListener("input", () => {
                View.setDurationLabel(View.refs.duration.value);
            });
            const updateProfile = () => {
                Model.state.profile = {
                    age: View.refs.pAge.value,
                    gender: View.refs.pGender.value,
                    weight: View.refs.pWeight.value,
                    h_hyper: View.refs.hHyper.checked,
                    h_diabe: View.refs.hDiabe.checked,
                    h_asthma: View.refs.hAsthma.checked,
                    h_allergy: View.refs.hAllergy.checked,
                    h_surgery: View.refs.hSurgery.checked
                };
                Model.saveProfile();
            };
            [View.refs.pAge, View.refs.pGender, View.refs.pWeight, View.refs.hHyper, View.refs.hDiabe,
                View.refs.hAsthma, View.refs.hAllergy, View.refs.hSurgery].forEach(el => {
                el.addEventListener("change", updateProfile);
            });
            View.refs.notesInput.addEventListener("input", () => {
                Model.state.notes = View.refs.notesInput.value;
                Model.saveNotes();
                View.renderNotes(Model.state.notes);
            });
            View.refs.addMed.addEventListener("click", ViewModel.addMedication);
            View.refs.medDose.addEventListener("input", () => {
                if (!View.refs.medWarning.classList.contains("hidden")) {
                    View.refs.medWarning.classList.add("hidden");
                }
            });
            View.refs.predictBtn.addEventListener("click", () => ViewModel.performConsultation(false));
        },
        initPrivacyFlow() {
            if (!Model.state.consent) {
                View.refs.consentGuard.classList.remove("hidden");
                View.refs.consentCheck.addEventListener("change", () => {
                    View.refs.consentBtn.disabled = !View.refs.consentCheck.checked;
                });
                View.refs.consentBtn.onclick = () => {
                    Model.state.consent = true;
                    Model.saveConsent();
                    View.refs.consentGuard.classList.add("hidden");
                    ViewModel.checkShield();
                };
            } else {
                View.refs.consentGuard.classList.add("hidden");
                ViewModel.checkShield();
            }
        },
        checkShield() {
            if (Model.state.shieldPin) {
                View.refs.shieldOverlay.classList.remove("hidden");
                View.refs.shieldPinInput.focus();
                View.refs.shieldPinInput.oninput = () => {
                    if (View.refs.shieldPinInput.value === Model.state.shieldPin) {
                        View.refs.shieldOverlay.classList.add("hidden");
                    } else if (View.refs.shieldPinInput.value.length === 4) {
                        View.refs.shieldError.classList.remove("hidden");
                        setTimeout(() => {
                            View.refs.shieldPinInput.value = "";
                            View.refs.shieldError.classList.add("hidden");
                        }, 1000);
                    }
                };
            } else {
                View.refs.shieldOverlay.classList.add("hidden");
            }
        },
        initVoiceInput() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.onstart = () => { View.refs.voiceBtn.classList.add("accent"); };
                recognition.onend = () => { View.refs.voiceBtn.classList.remove("accent"); };
                recognition.onresult = (event) => {
                    View.refs.symptoms.value += (View.refs.symptoms.value ? " " : "") + event.results[0][0].transcript;
                };
                View.refs.voiceBtn.addEventListener("click", () => recognition.start());
            } else {
                View.refs.voiceBtn.style.display = "none";
            }
        },
        normalizeDose(dose) {
            return dose.replace(/\s+/g, " ").trim();
        },
        validateDose(dose) {
            const hasNumber = /\d/.test(dose);
            const hasUnit = /[a-zA-Z]/.test(dose);
            return hasNumber && hasUnit;
        },
        addMedication() {
            const name = (View.refs.medName.value || "").trim();
            const doseRaw = (View.refs.medDose.value || "").trim();
            const frequency = (View.refs.medFreq.value || "Frequency not specified").trim();
            if (!name) return;
            const dose = ViewModel.normalizeDose(doseRaw);
            if (!dose || !ViewModel.validateDose(dose)) {
                View.refs.medWarning.classList.remove("hidden");
                return;
            }
            View.refs.medWarning.classList.add("hidden");
            Model.state.medications.push({ name, dose, frequency });
            Model.saveMeds();
            View.refs.medName.value = "";
            View.refs.medDose.value = "";
            View.refs.medFreq.value = "";
            View.renderMeds(Model.state.medications);
        },
        removeMedication(index) {
            Model.state.medications = Model.state.medications.filter((_, i) => i !== index);
            Model.saveMeds();
            View.renderMeds(Model.state.medications);
        },
        buildInteractionWarnings(meds) {
            const warnings = [];
            const names = meds.map(m => (m.name || "").toLowerCase());
            const has = (k) => names.some(n => n.includes(k));
            if (has("ibuprofen") && has("aspirin")) {
                warnings.push("Potential duplication: ibuprofen + aspirin may increase bleeding risk. Confirm with a clinician.");
            }
            if (has("warfarin") && (has("aspirin") || has("ibuprofen") || has("naproxen"))) {
                warnings.push("Potential interaction: warfarin with NSAIDs can increase bleeding risk. Confirm with a clinician.");
            }
            if (has("paracetamol") && has("acetaminophen")) {
                warnings.push("Potential duplication: paracetamol is acetaminophen. Avoid double dosing.");
            }
            return warnings;
        },
        async performConsultation(isRefined) {
            const symptoms = View.refs.symptoms.value.trim();
            if (!symptoms) {
                View.showError("Please describe symptoms before diagnosing.");
                return;
            }
            View.hideResults();
            View.hideQuestions();
            View.clearError();
            View.showLoader();

            const payload = {
                symptoms,
                duration: View.refs.duration.value,
                age: Model.state.profile.age,
                gender: Model.state.profile.gender,
                weight: Model.state.profile.weight,
                h_hyper: Model.state.profile.h_hyper ? 1 : 0,
                h_diabe: Model.state.profile.h_diabe ? 1 : 0,
                h_asthma: Model.state.profile.h_asthma ? 1 : 0,
                h_allergy: Model.state.profile.h_allergy ? 1 : 0,
                h_surgery: Model.state.profile.h_surgery ? 1 : 0,
                medications: Model.state.medications,
                notes: Model.state.notes,
                is_refined: isRefined
            };

            try {
                const res = await fetch("/predict", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const rawText = await res.text();
                let data = null;
                try { data = JSON.parse(rawText); } catch (_) { data = null; }
                if (!res.ok) {
                    const msg = (data && data.error) ? data.error : "Unexpected server response. Please try again.";
                    throw new Error(msg);
                }
                if (!data) throw new Error("Invalid server response. Please try again.");

                if (data.status === "refine") {
                    View.hideLoader();
                    View.showQuestions(data.questions, (name) => {
                        View.refs.symptoms.value += ` ${name}`;
                        ViewModel.performConsultation(true);
                    }, () => ViewModel.performConsultation(true));
                    return;
                }

                // Save to history for Dashboard stats
                try {
                    const savedHistory = JSON.parse(localStorage.getItem('pharmacian_history') || '[]');
                    let maxRisk = "Low";
                    if (data.risks && data.risks.some(r => r.risk === "High")) maxRisk = "High";
                    else if (data.risks && data.risks.some(r => r.risk === "Medium")) maxRisk = "Medium";

                    savedHistory.unshift({
                        name: "Patient " + Math.floor(1000 + Math.random() * 9000), // Random ID
                        age: Model.state.profile.age || 25,
                        risk: maxRisk,
                        date: new Date().toISOString().split('T')[0],
                        timestamp: Date.now(),
                        primaryDisease: data.predictions && data.predictions.length > 0 ? data.predictions[0].disease : "Unknown"
                    });
                    
                    // Keep max 100 records
                    if (savedHistory.length > 100) savedHistory.pop();
                    
                    localStorage.setItem('pharmacian_history', JSON.stringify(savedHistory));
                } catch(err) {
                    console.error("Failed to save history log", err);
                }

                View.renderPredictions(data.predictions);
                View.renderProbabilityChart(data.predictions);
                View.renderRisks(data.risks);
                View.renderXAI(data.rationale, data.consensus);
                View.renderResearch(data.research, data.predictions[0].disease);
                View.renderMeds(data.medications);
                View.renderNotes(data.notes);
                View.renderReport(data);
                View.renderInteractionWarnings(ViewModel.buildInteractionWarnings(data.medications || []));

                View.hideLoader();
                View.showResults();
            } catch (e) {
                View.hideLoader();
                View.showError(`Diagnostic error: ${e.message}`);
            }
        }
    };

    ViewModel.init();
});
