import requests
import logging
from typing import List, Dict

OPENFDA_URL = "https://api.fda.gov/drug/label.json"

SEVERITY_KEYWORDS = {
    "contraindicated": "Contraindicated",
    "do not use": "Contraindicated",
    "must not": "Contraindicated",
    "fatal": "Major",
    "life-threatening": "Major",
    "serious": "Major",
    "severe": "Major",
    "major": "Major",
    "significant": "Moderate",
    "moderate": "Moderate",
    "caution": "Minor",
    "minor": "Minor",
}

def classify_severity(text: str) -> str:
    text_lower = text.lower()
    for keyword, severity in SEVERITY_KEYWORDS.items():
        if keyword in text_lower:
            return severity
    return "Minor"

def fetch_drug_interactions(drug_name: str) -> List[Dict]:
    try:
        params = {
            "search": f"openfda.brand_name:\"{drug_name}\" OR openfda.generic_name:\"{drug_name}\"",
            "limit": 1
        }
        res = requests.get(OPENFDA_URL, params=params, timeout=10)
        if res.status_code != 200:
            return []
        
        data = res.json()
        if not data.get("results"):
            return []
            
        result = data["results"][0]
        interactions = []
        
        # Check standard FDA interaction fields
        fields = ["drug_interactions", "precautions", "warnings", "contraindications"]
        for field in fields:
            if field in result:
                text = " ".join(result[field]) if isinstance(result[field], list) else result[field]
                interactions.append({
                    "type": field.capitalize(),
                    "severity": classify_severity(text),
                    "note": text[:500] + ("..." if len(text) > 500 else "")
                })
        
        return interactions
    except Exception as e:
        logging.error(f"FDA API Error for {drug_name}: {str(e)}")
        return []

def get_multiple_interactions(meds: List[str]) -> List[Dict]:
    """Pairwise check for common known interactions (Mock + FDA search)."""
    all_warnings = []
    
    # 1. FDA Real-time lookups for each drug
    for med in meds:
        results = fetch_drug_interactions(med)
        if results:
            all_warnings.extend(results)
            
    # 2. Basic pairwise logic for highly common clinical interactions
    processed = [m.lower() for m in meds]
    if "aspirin" in processed and "warfarin" in processed:
        all_warnings.append({
            "type": "Contraindicated",
            "severity": "Contraindicated",
            "note": "Combined use of Aspirin and Warfarin significantly increases major bleeding risk."
        })
    if "ibuprofen" in processed and "aspirin" in processed:
        all_warnings.append({
            "type": "Major",
            "severity": "Major",
            "note": "NSAID duplication: Increased risk of gastric perforation and bleeding."
        })
        
    return all_warnings
