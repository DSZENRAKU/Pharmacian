# backend/reinforcement_engine.py

import json
import os
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
from collections import defaultdict

FEEDBACK_FILE = Path(__file__).resolve().parent.parent / "saved_models" / "feedback_store.json"

def load_feedback() -> Dict:
    """Load all stored feedback from disk."""
    if not FEEDBACK_FILE.exists():
        return {"total_feedbacks": 0, "disease_scores": {}, "symptom_disease_map": {}, "feedback_log": []}
    try:
        with open(FEEDBACK_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        logging.warning(f"Failed to load feedback: {e}")
        return {"total_feedbacks": 0, "disease_scores": {}, "symptom_disease_map": {}, "feedback_log": []}

def save_feedback(data: Dict) -> None:
    """Persist feedback to disk."""
    FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(FEEDBACK_FILE, "w") as f:
        json.dump(data, f, indent=2)

def record_feedback(
    predicted_disease: str,
    actual_disease: Optional[str],
    symptoms_used: List[str],
    is_correct: bool,
    confidence: float,
    session_id: str = ""
) -> Dict:
    """
    Record doctor feedback for a prediction.
    
    Args:
        predicted_disease: What AI predicted
        actual_disease: What doctor says it actually is (None if just correct/wrong)
        symptoms_used: List of symptoms that drove this prediction
        is_correct: True = AI was right, False = AI was wrong
        confidence: AI's confidence score (0-100)
        session_id: Optional unique ID for this session
    
    Returns: Updated stats dict
    """
    store = load_feedback()
    
    # Update disease-level score (0.0 = always wrong, 1.0 = always right)
    if predicted_disease not in store["disease_scores"]:
        store["disease_scores"][predicted_disease] = {
            "correct": 0, "total": 0, "accuracy": 1.0, "weight_modifier": 1.0
        }
    
    d = store["disease_scores"][predicted_disease]
    d["total"] += 1
    if is_correct:
        d["correct"] += 1
    d["accuracy"] = round(d["correct"] / d["total"], 4)
    
    # Weight modifier: boost confidence for high-accuracy diseases,
    # penalize for low-accuracy ones. Range: 0.5 to 1.5
    d["weight_modifier"] = round(0.5 + d["accuracy"], 4)
    
    # Update symptom→disease reliability map
    for symptom in symptoms_used:
        key = f"{symptom}::{predicted_disease}"
        if key not in store["symptom_disease_map"]:
            store["symptom_disease_map"][key] = {"correct": 0, "total": 0, "reliability": 1.0}
        sm = store["symptom_disease_map"][key]
        sm["total"] += 1
        if is_correct:
            sm["correct"] += 1
        sm["reliability"] = round(sm["correct"] / sm["total"], 4)
    
    # Append to feedback log (keep last 500)
    store["feedback_log"].append({
        "timestamp": datetime.utcnow().isoformat(),
        "predicted": predicted_disease,
        "actual": actual_disease,
        "is_correct": is_correct,
        "confidence": confidence,
        "symptoms": symptoms_used[:5],
        "session_id": session_id
    })
    if len(store["feedback_log"]) > 500:
        store["feedback_log"] = store["feedback_log"][-500:]
    
    store["total_feedbacks"] += 1
    save_feedback(store)
    
    logging.info(f"[RL] Feedback recorded: {predicted_disease} | correct={is_correct} | total_feedbacks={store['total_feedbacks']}")
    
    return {
        "status": "recorded",
        "disease_accuracy": d["accuracy"],
        "weight_modifier": d["weight_modifier"],
        "total_feedbacks": store["total_feedbacks"]
    }

def get_weight_modifier(disease: str) -> float:
    """Get the learned weight modifier for a disease. Returns 1.0 if no data."""
    store = load_feedback()
    if disease in store["disease_scores"]:
        return store["disease_scores"][disease].get("weight_modifier", 1.0)
    return 1.0

def get_feedback_stats() -> Dict:
    """Get summary stats for the feedback dashboard."""
    store = load_feedback()
    
    top_accurate = sorted(
        [(d, v["accuracy"]) for d, v in store["disease_scores"].items() if v["total"] >= 2],
        key=lambda x: x[1], reverse=True
    )[:5]
    
    needs_improvement = sorted(
        [(d, v["accuracy"]) for d, v in store["disease_scores"].items() if v["total"] >= 2],
        key=lambda x: x[1]
    )[:5]
    
    return {
        "total_feedbacks": store["total_feedbacks"],
        "diseases_tracked": len(store["disease_scores"]),
        "top_accurate": [{"disease": d, "accuracy": round(a * 100, 1)} for d, a in top_accurate],
        "needs_improvement": [{"disease": d, "accuracy": round(a * 100, 1)} for d, a in needs_improvement],
        "recent_feedback_count": len(store["feedback_log"][-50:])
    }

def apply_rl_boost(predictions: List[Dict]) -> List[Dict]:
    """
    Apply learned weight modifiers to re-rank predictions.
    Called AFTER the base ML prediction.
    
    Args:
        predictions: List of {"disease": str, "probability": float, "info": dict}
    
    Returns: Re-ranked predictions with RL-adjusted scores
    """
    store = load_feedback()
    
    for pred in predictions:
        disease = pred["disease"]
        modifier = 1.0
        
        if disease in store["disease_scores"] and store["disease_scores"][disease]["total"] >= 3:
            modifier = store["disease_scores"][disease]["weight_modifier"]
        
        original_prob = pred["probability"]
        # Apply modifier but cap between 1% and 99%
        adjusted = min(99.0, max(1.0, original_prob * modifier))
        pred["rl_adjusted_probability"] = round(adjusted, 2)
        pred["rl_modifier"] = round(modifier, 3)
        pred["rl_feedback_count"] = store["disease_scores"].get(disease, {}).get("total", 0)
    
    # Re-sort by RL-adjusted probability
    predictions.sort(key=lambda x: x.get("rl_adjusted_probability", x["probability"]), reverse=True)
    return predictions
