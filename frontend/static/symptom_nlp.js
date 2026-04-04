/**
 * frontend/static/symptom_nlp.js
 * ─────────────────────────────────────────────────────────────
 * NLP-powered bilingual (English + Hindi) symptom parser.
 * Attaches itself to any page that has id="symptom-nlp-input"
 * and id="symptoms-group" (the pill container).
 *
 * Public API:
 *   parseSymptoms(text)   → { matched: string[], suggestions: string[] }
 *   clearNLP()            → resets input + all pill highlights
 */

"use strict";

// ─────────────────────────────────────────────────────────────
// 1.  SYMPTOM DICTIONARY  (English + Hindi / Hinglish keywords)
// ─────────────────────────────────────────────────────────────
const SYMPTOM_DICTIONARY = {
  "Fatigue": [
    "tired","tiredness","fatigue","exhausted","exhaustion","weak","weakness",
    "kamzori","kamzor","thakan","thaka","thakaan","thakawat","laziness","lethargy",
    "no energy","low energy","lethargic","drained","worn out","enerji nahi"
  ],
  "Frequent urination": [
    "urinating","urination","frequent urination","pee","peeing","bathroom","toilet",
    "peshab","pasab","bar bar peshab","baar baar peshab","urine","wc","loo",
    "pissing","frequent bathroom","frequent toilet","pee a lot","urinate often"
  ],
  "Excessive thirst": [
    "thirsty","thirst","excessive thirst","dry mouth","parched","water","pani",
    "pyaas","pyaas lagna","bahut pyaas","zyada pyaas","pani ki zarurat",
    "keep drinking","drink a lot","always thirsty","dehydrated","dehydration"
  ],
  "Chest pain": [
    "chest pain","chest ache","chest hurt","chest pressure","heart pain","angina",
    "seene mein dard","seena dard","seena","chhati mein dard","dil mein dard",
    "chest discomfort","chest tightness","tight chest","heavy chest","dil dard"
  ],
  "Shortness of breath": [
    "breathless","breathlessness","shortness of breath","short of breath","difficulty breathing",
    "saans","saans lena","saans ki takleef","saans phoolna","saans phool raha","saans nahi aata",
    "cannot breathe","can't breathe","labored breathing","hard to breathe","dyspnea",
    "wheezing","winded"
  ],
  "Headache": [
    "headache","head pain","migraine","head hurt","head ache","skull pain",
    "sir dard","sar dard","sir mein dard","sar mein dard","aadha sir dard",
    "throbbing head","pounding head","head throb"
  ],
  "Nausea": [
    "nausea","nauseous","queasy","vomit","vomiting","throwing up","sick to stomach",
    "ulti","ulti aana","ji machal","ji machlana","pet kharaab","bhojan nahi hazam",
    "matli","nauseated","feel like vomiting"
  ],
  "Fever": [
    "fever","high temperature","temperature","pyrexia","hot body","body heat",
    "bukhar","bukhaar","tez bukhaar","bukhaar hai","body garam","garam",
    "chills","shivering","shivers","feverish","running temperature"
  ],
  "Joint pain": [
    "joint pain","joints hurt","arthritis","knee pain","back pain","hip pain",
    "joint ache","jodo mein dard","ghutne mein dard","jodон","haddi mein dard",
    "jamb dard","body ache","muscle aches","musculoskeletal","stiff joints",
    "stiffness","aching joints","sore joints","back ache","lower back pain"
  ],
  "Rapid heartbeat": [
    "rapid heartbeat","fast heartbeat","heart racing","palpitations","tachycardia",
    "dil tez","dil ki dhakkan","dhadkan","dhadkan tez","dil bahut tez dhadakta",
    "heart flutter","racing heart","pounding heart","irregular heartbeat",
    "heart skipping","skipping beats","heart fast"
  ],
  "Blurred vision": [
    "blurred vision","blurry vision","blur","vision loss","cannot see","can't see clearly",
    "dhundla dikhna","aankhein dhundli","aankh mein dhundlapan","nazar kamzor",
    "poor eyesight","fuzzy vision","double vision","dimmed vision","vision problems",
    "eye sight","eyesight"
  ],
  "Unexplained weight loss": [
    "weight loss","losing weight","unexpected weight loss","unintentional weight loss",
    "sudden weight loss","wajan kam","vajan kam","wajan ghat","wajan ghata",
    "patla ho raha","patla","slim","skinny","losing pounds","lost weight"
  ],
  "Skin rash": [
    "rash","skin rash","itching","itchy","hives","eczema","dermatitis","red skin",
    "khujli","kharish","daane","chale","charme","redness","skin irritation",
    "broke out","breakout","blisters","welts","swollen skin"
  ],
  "Swelling": [
    "swelling","swollen","bloated","bloating","oedema","edema","inflammation",
    "sujan","sooja","sooji hui","puffiness","puffy","puffy face","swollen feet",
    "swollen legs","swollen ankles","water retention","swollen hands"
  ],
  "Abdominal pain": [
    "abdominal pain","stomach pain","belly pain","stomach ache","abdomen pain",
    "pet dard","pet mein dard","pait dard","stomach cramps","tummy ache",
    "intestinal pain","bowel pain","cramping","stomach cramp","gut pain"
  ],
  "Dizziness": [
    "dizzy","dizziness","lightheaded","light headed","vertigo","spinning",
    "chakkar","chakkar aana","sar ghoomna","sir ghoomna","balance problem",
    "unsteady","wobbly","loss of balance","faint","fainting","near faint"
  ],
  "Cough": [
    "cough","coughing","dry cough","persistent cough","whooping cough","chronic cough",
    "khasi","khansi","khansi aana","sukhi khansi","khasi hai",
    "productive cough","mucus cough","phlegm","sputum"
  ],
  "Loss of appetite": [
    "loss of appetite","no appetite","not hungry","no hunger","poor appetite",
    "bhookh nahi","khana nahi khana","bhukh nahi lagti","pet nahi bharta",
    "food aversion","reduced appetite","not eating","can't eat"
  ],
  "Insomnia": [
    "insomnia","sleep problems","can't sleep","difficulty sleeping","sleepless","sleeplessness",
    "neend nahi","neend na aana","neend ki takleef","raat bhar jaagna",
    "wakefulness","poor sleep","not sleeping","trouble sleeping","sleep disorder"
  ],
  "Numbness": [
    "numbness","tingling","pins and needles","numb","sensation loss",
    "sujhna","sun ho jana","sun pan","hath sujhna","pair sujhna",
    "needle sensation","limb numb","arm numb","leg numb","hand numb"
  ],
};

// Flatten all keywords into a fast-lookup reverse map
// { keyword: "Fatigue", ... }
const _KEYWORD_MAP = {};
Object.entries(SYMPTOM_DICTIONARY).forEach(([symptom, keywords]) => {
  keywords.forEach(kw => { _KEYWORD_MAP[kw.toLowerCase()] = symptom; });
});

// Pre-sorted keyword list (longest first, for greedy matching)
const _SORTED_KEYWORDS = Object.keys(_KEYWORD_MAP).sort((a, b) => b.length - a.length);


// ─────────────────────────────────────────────────────────────
// 2.  CORE PARSER
// ─────────────────────────────────────────────────────────────

/**
 * Parse free-text input and return matched symptoms + suggestions.
 * @param {string} text
 * @returns {{ matched: string[], suggestions: string[] }}
 */
function parseSymptoms(text) {
  if (!text || !text.trim()) return { matched: [], suggestions: [] };

  const lower = text.toLowerCase()
    .replace(/[,،.!\?;:]/g, " ")   // strip punctuation (including Urdu comma)
    .replace(/\s+/g, " ")
    .trim();

  const matched  = new Set();
  const partials = [];

  // Greedy match — try longest keywords first
  let remaining = lower;
  _SORTED_KEYWORDS.forEach(kw => {
    if (remaining.includes(kw)) {
      matched.add(_KEYWORD_MAP[kw]);
    }
  });

  // Partial match: min 3-char prefix match for suggestion tooltips
  if (matched.size < 3) {
    const words = lower.split(/\s+/);
    words.forEach(word => {
      if (word.length < 3) return;
      _SORTED_KEYWORDS.forEach(kw => {
        const symptom = _KEYWORD_MAP[kw];
        if (!matched.has(symptom) && kw.startsWith(word) && word.length >= 3) {
          // Find the most readable keyword for this symptom
          const readableKw = SYMPTOM_DICTIONARY[symptom]
            .find(k => k.startsWith(word) && k.length > word.length) || kw;
          partials.push({ word, suggestion: `"${readableKw}" → ${symptom}` });
        }
      });
    });
  }

  // De-dup partials
  const seenSuggestions = new Set();
  const suggestions = partials
    .filter(p => { const k = p.suggestion; if (seenSuggestions.has(k)) return false; seenSuggestions.add(k); return true; })
    .slice(0, 3)
    .map(p => p.suggestion);

  return { matched: Array.from(matched), suggestions };
}


// ─────────────────────────────────────────────────────────────
// 3.  UI INTEGRATION
// ─────────────────────────────────────────────────────────────

let _debounceTimer = null;

function initSymptomNLP() {
  const inputEl      = document.getElementById("symptom-nlp-input");
  const clearBtn     = document.getElementById("symptom-nlp-clear");
  const tagContainer = document.getElementById("symptom-nlp-tags");
  const badgeEl      = document.getElementById("symptom-nlp-badge");
  const suggestionEl = document.getElementById("symptom-nlp-suggestion");
  const pillGroup    = document.getElementById("symptoms-group");

  if (!inputEl || !pillGroup) return;   // Not on a page that needs this

  // Build a map from display label → pill element
  function getPillMap() {
    const map = {};
    pillGroup.querySelectorAll(".pill").forEach(p => {
      map[p.innerText.trim().toLowerCase()] = p;
    });
    return map;
  }

  function highlightPills(matchedSymptoms) {
    const pillMap = getPillMap();
    // Reset all nlp-highlighted pills (but preserve manually clicked ones)
    pillGroup.querySelectorAll(".pill.nlp-detected").forEach(p => {
      p.classList.remove("nlp-detected");
      if (!p.dataset.manualActive) p.classList.remove("active");
    });
    matchedSymptoms.forEach(symptom => {
      const pill = pillMap[symptom.toLowerCase()];
      if (pill) {
        pill.classList.add("active", "nlp-detected");
      }
    });
  }

  function renderTags(matchedSymptoms) {
    tagContainer.innerHTML = "";
    matchedSymptoms.forEach(s => {
      const tag = document.createElement("span");
      tag.className = "nlp-tag";

      const icon = document.createElement("i");
      icon.className = "fas fa-check-circle";
      tag.appendChild(icon);

      const text = document.createTextNode(" " + s + " ");
      tag.appendChild(text);

      const btn = document.createElement("button");
      btn.className = "nlp-tag-remove";
      btn.setAttribute("data-symptom", s);
      btn.title = "Remove";
      btn.innerText = "×";
      tag.appendChild(btn);

      tagContainer.appendChild(tag);
    });

    // Remove tag → deselect pill
    tagContainer.querySelectorAll(".nlp-tag-remove").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const symptom = btn.dataset.symptom;
        const pillMap = getPillMap();
        const pill = pillMap[symptom.toLowerCase()];
        if (pill) { pill.classList.remove("active", "nlp-detected"); delete pill.dataset.manualActive; }
        btn.closest(".nlp-tag").remove();
        updateBadge();
      });
    });
  }

    function updateBadge() {
    const count = pillGroup.querySelectorAll(".pill.active").length;
    if (!badgeEl) return;
    if (count === 0) {
      badgeEl.style.display = "none";
    } else {
      badgeEl.style.display = "inline-flex";
      // clear existing content
      badgeEl.textContent = "";
      const icon = document.createElement("i");
      icon.className = "fas fa-circle-check";
      badgeEl.appendChild(icon);
      const txt = document.createTextNode(` ${count} symptom${count !== 1 ? "s" : ""} detected`);
      badgeEl.appendChild(txt);
      badgeEl.className = "nlp-badge " + (count >= 4 ? "badge-high" : count >= 2 ? "badge-medium" : "badge-low");
    }
  }

    function renderSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
      suggestionEl.style.display = "none";
      return;
    }
    suggestionEl.style.display = "flex";
    suggestionEl.textContent = "";
    const icon = document.createElement("i");
    icon.className = "fas fa-lightbulb";
    suggestionEl.appendChild(icon);
    const span = document.createElement("span");
    span.textContent = " Did you mean: " + suggestions.join("  |  ");
    suggestionEl.appendChild(span);
  }

  function runParser(text) {
    const { matched, suggestions } = parseSymptoms(text);
    highlightPills(matched);
    renderTags(matched);
    updateBadge();
    renderSuggestions(matched.length === 0 ? suggestions : []);
  }

  // Real-time debounced parsing
  inputEl.addEventListener("input", () => {
    clearTimeout(_debounceTimer);
    const text = inputEl.value;

    if (!text.trim()) {
      clearNLP();
      return;
    }

    // Show typing indicator
    if (badgeEl) {
      badgeEl.style.display = "inline-flex";
      badgeEl.className = "nlp-badge badge-typing";
      badgeEl.textContent = "";
      const spinning = document.createElement("i");
      spinning.className = "fas fa-circle-notch fa-spin";
      badgeEl.appendChild(spinning);
      const t = document.createTextNode(" Analysing...");
      badgeEl.appendChild(t);
    }

    _debounceTimer = setTimeout(() => runParser(text), 500);
  });

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      inputEl.value = "";
      clearNLP();
      inputEl.focus();
    });
  }

  // Track manually toggled pills so NLP doesn't override them
  pillGroup.querySelectorAll(".pill").forEach(pill => {
    pill.addEventListener("click", () => {
      if (pill.classList.contains("active")) {
        pill.dataset.manualActive = "1";
      } else {
        delete pill.dataset.manualActive;
        pill.classList.remove("nlp-detected");
      }
      updateBadge();
    });
  });
}

/**
 * Reset all NLP-related UI state.
 * Also called by the form's "Clear Form" button.
 */
function clearNLP() {
  const inputEl      = document.getElementById("symptom-nlp-input");
  const tagContainer = document.getElementById("symptom-nlp-tags");
  const badgeEl      = document.getElementById("symptom-nlp-badge");
  const suggestionEl = document.getElementById("symptom-nlp-suggestion");
  const pillGroup    = document.getElementById("symptoms-group");

  if (inputEl)      inputEl.value = "";
  if (tagContainer) tagContainer.innerHTML = "";
  if (badgeEl)      { badgeEl.style.display = "none"; }
  if (suggestionEl) suggestionEl.style.display = "none";
  if (pillGroup) {
    pillGroup.querySelectorAll(".pill.nlp-detected").forEach(p => {
      p.classList.remove("nlp-detected", "active");
      delete p.dataset.manualActive;
    });
  }
}

// Auto-init when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSymptomNLP);
} else {
  initSymptomNLP();
}
