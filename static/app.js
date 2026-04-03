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

    async function handlePredict(isUpload = false) {
        resultsSection.classList.add('hidden');
        loader.classList.remove('hidden');
        
        let url = '/predict';
        let options = { method: 'POST' };

        if (isUpload) {
            if (fileInput.files.length === 0) {
                alert("Please attach an image first.");
                loader.classList.add('hidden');
                return;
            }
            loaderText.innerText = "Running Web Visual Scan...";
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            url = '/upload';
            options.body = formData;
        } else {
            const symptoms = textarea.value.trim();
            if(!symptoms) { alert("Please describe symptoms."); loader.classList.add('hidden'); return; }
            loaderText.innerText = "Analyzing Supervised Matrix...";
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify({ symptoms });
        }

        try {
            const res = await fetch(url, options);
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Server processing failed");

            // Extract based on endpoint differences
            const prediction = isUpload ? data : data.predictions[0];

            document.getElementById('result-disease').innerText = prediction.disease;
            document.getElementById('result-precautions').innerText = prediction.precautions;
            
            // Show reasoning logic
            const reasoningBox = document.getElementById('ai-reasoning');
            const reasoningText = document.getElementById('reasoning-text');
            if (prediction.reasoning) {
                reasoningBox.classList.remove('hidden');
                reasoningText.innerText = prediction.reasoning;
            } else {
                reasoningBox.classList.add('hidden');
            }
            
            // Show RL feedback elements fresh
            document.getElementById('rl-yes').disabled = false;
            document.getElementById('rl-no').disabled = false;
            document.getElementById('rl-status').classList.add('hidden');

            loader.classList.add('hidden');
            resultsSection.classList.remove('hidden');

        } catch(e) {
            alert(e.message);
            loader.classList.add('hidden');
        }
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
