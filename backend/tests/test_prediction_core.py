import os
import sys
import pytest

# Ensure backend package is importable when running pytest from repo root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from model_container import ModelState, load_state_from_disk
from prediction_engine import sanitize_medications, SymptomTranslator


def test_sanitize_medications_valid():
    meds = [{"name": "Paracetamol", "dose": "500 mg", "frequency": "twice a day"}]
    cleaned = sanitize_medications(meds)
    assert isinstance(cleaned, list)
    assert cleaned[0]["name"] == "Paracetamol"
    assert cleaned[0]["dose"] == "500 mg"
    assert cleaned[0]["frequency"] == "twice a day"


def test_sanitize_medications_invalid_type():
    with pytest.raises(ValueError):
        sanitize_medications("not-a-list")


def test_sanitize_medications_invalid_item():
    with pytest.raises(ValueError):
        sanitize_medications(["not-a-dict"])


def test_symptom_translator_basic():
    assert SymptomTranslator.translate("सिरदर्द") == "headache"


def test_load_state_from_disk_missing_models():
    state = ModelState()
    # In a fresh repo without trained artifacts this should return False
    assert load_state_from_disk(state) is False
