document.addEventListener('DOMContentLoaded', () => {
    const tabText = document.getElementById('tab-text');
    const tabUpload = document.getElementById('tab-upload');
    const modeText = document.getElementById('mode-text');
    const modeUpload = document.getElementById('mode-upload');
    
    const predictBtn = document.getElementById('predict-btn');
    const textarea = document.getElementById('symptoms');
    
    const uploadBtn = document.getElementById('upload-btn');
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');
    const resultsSection = document.getElementById('results');

    // UI Tab Toggling
    tabText.addEventListener('click', () => {
        tabText.classList.add('active'); tabUpload.classList.remove('active');
        modeText.classList.remove('hidden'); modeUpload.classList.add('hidden');
    });
    tabUpload.addEventListener('click', () => {
        tabUpload.classList.add('active'); tabText.classList.remove('active');
        modeUpload.classList.remove('hidden'); modeText.classList.add('hidden');
    });

    // Upload Zone Logic
    uploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            uploadZone.querySelector('.upload-text').innerHTML = `<strong>${fileInput.files[0].name}</strong><br><small>Ready to scan</small>`;
        }
    });

    // Profile Persistence Logic
    const profileFields = {
        age: document.getElementById('p-age'),
        gender: document.getElementById('p-gender'),
        weight: document.getElementById('p-weight'),
        h_hyper: document.getElementById('h-hyper'),
        h_diabe: document.getElementById('h-diabe'),
        h_asthma: document.getElementById('h-asthma'),
        h_allergy: document.getElementById('h-allergy')
    };

    function saveProfile() {
        const profile = {};
        for(let key in profileFields) {
            profile[key] = profileFields[key].type === 'checkbox' ? profileFields[key].checked : profileFields[key].value;
        }
        localStorage.setItem('pharmacian_profile', JSON.stringify(profile));
    }

    function loadProfile() {
        const saved = JSON.parse(localStorage.getItem('pharmacian_profile'));
        if (saved) {
            for(let key in profileFields) {
                if (profileFields[key].type === 'checkbox') profileFields[key].checked = saved[key];
                else profileFields[key].value = saved[key];
            }
        }
    }
    loadProfile();
    Object.values(profileFields).forEach(f => f.addEventListener('change', saveProfile));

    async function handlePredict(isUpload = false) {
        resultsSection.classList.add('hidden');
        loader.classList.remove('hidden');
        
        let url = '/predict';
        let options = { method: 'POST' };

        if (isUpload) {
            if (fileInput.files.length === 0) { alert("Attach image first."); loader.classList.add('hidden'); return; }
            loaderText.innerText = "Initiating Clinical Visual Scan...";
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            url = '/upload';
            options.body = formData;
        } else {
            const symptoms = textarea.value.trim();
            const duration = durationSlider.value;
            if(!symptoms) { alert("Describe symptoms."); loader.classList.add('hidden'); return; }
            loaderText.innerText = "Consulting Hybrid Clinical Matrix...";
            
            // Gather Profile Data
            const profile = {
                age: profileFields.age.value,
                gender: profileFields.gender.value,
                weight: profileFields.weight.value,
                h_hyper: profileFields.h_hyper.checked ? 1 : 0,
                h_diabe: profileFields.h_diabe.checked ? 1 : 0,
                h_asthma: profileFields.h_asthma.checked ? 1 : 0,
                h_allergy: profileFields.h_allergy.checked ? 1 : 0
            };

            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify({ symptoms, duration, ...profile });
        }


        try {
            const res = await fetch(url, options);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Server failed");

            const prediction = isUpload ? data : data.predictions[0];

            document.getElementById('result-disease').innerText = prediction.disease;
            document.getElementById('result-precautions').innerText = prediction.precautions;
            
            // Advanced Insights Display
            const reasoningBox = document.getElementById('ai-reasoning');
            const reasoningText = document.getElementById('reasoning-text');
            if (prediction.reasoning) {
                reasoningBox.classList.remove('hidden');
                reasoningText.innerText = prediction.reasoning;
            } else { reasoningBox.classList.add('hidden'); }

            const intelligenceBox = document.getElementById('global-intelligence');
            const intelligenceText = document.getElementById('intelligence-text');
            if (prediction.intelligence_note) {
                intelligenceBox.classList.remove('hidden');
                intelligenceText.innerText = prediction.intelligence_note;
            } else { intelligenceBox.classList.add('hidden'); }

            const learningBox = document.getElementById('autonomous-learning');
            const learningText = document.getElementById('learning-text');
            if (prediction.learning_note) {
                learningBox.classList.remove('hidden');
                learningText.innerText = prediction.learning_note;
            } else { learningBox.classList.add('hidden'); }

            loader.classList.add('hidden');
            resultsSection.classList.remove('hidden');
        } catch(e) { alert(e.message); loader.classList.add('hidden'); }
    }

    predictBtn.addEventListener('click', () => handlePredict(false));
    uploadBtn.addEventListener('click', () => handlePredict(true));

    // RL Feedback API Calls
    document.getElementById('rl-yes').addEventListener('click', () => submitRLFeedback("correct"));
    document.getElementById('rl-no').addEventListener('click', () => submitRLFeedback("incorrect"));

    async function submitRLFeedback(type) {
        const symptoms = textarea.value.trim();
        const statusSpan = document.getElementById('rl-status');
        let correctDisease = "";

        if (type === "incorrect") {
            correctDisease = prompt("Please enter the CORRECT disease to retrain the AI:");
            if (!correctDisease) return; // cancelled
        }

        try {
            await fetch('/feedback', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symptoms: symptoms,
                    correct_disease: type === "correct" ? document.getElementById('result-disease').innerText : correctDisease
                })
            });
            document.getElementById('rl-yes').disabled = true;
            document.getElementById('rl-no').disabled = true;
            statusSpan.innerText = type === "correct" ? "Network certainty validated!" : `Network actively retrained to recognize ${correctDisease}!`;
            statusSpan.style.color = type === "correct" ? "var(--success)" : "var(--danger)";
            statusSpan.classList.remove('hidden');
        } catch(e) { console.error(e); }
    }
});
