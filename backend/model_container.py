from dataclasses import dataclass, field
from typing import List, Optional

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB
import joblib
from pathlib import Path

from medical_kb_config import (
    RF_MODEL_PATH,
    DT_MODEL_PATH,
    NB_MODEL_PATH,
    SYMPTOMS_LIST_PATH,
    TRAINING_DATA_PATH,
)


@dataclass
class ModelState:
    df_train: Optional[pd.DataFrame] = None
    symptoms_list: List[str] = field(default_factory=list)
    random_forest: Optional[RandomForestClassifier] = None
    decision_tree: Optional[DecisionTreeClassifier] = None
    naive_bayes: Optional[GaussianNB] = None


def load_state_from_disk(state: ModelState) -> bool:
    """Attempt to load pre-trained models and training DataFrame from disk.

    Returns True if all artifacts were loaded successfully, False otherwise.
    """
    try:
        paths = [RF_MODEL_PATH, DT_MODEL_PATH, NB_MODEL_PATH, SYMPTOMS_LIST_PATH]
        if not all(Path(p).exists() for p in paths):
            return False

        state.random_forest = joblib.load(RF_MODEL_PATH)
        state.decision_tree = joblib.load(DT_MODEL_PATH)
        state.naive_bayes = joblib.load(NB_MODEL_PATH)
        state.symptoms_list = joblib.load(SYMPTOMS_LIST_PATH)
        # df_train used for refinement questions
        state.df_train = pd.read_csv(TRAINING_DATA_PATH)
        return True
    except Exception:
        return False
