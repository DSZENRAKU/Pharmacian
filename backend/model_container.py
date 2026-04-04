from dataclasses import dataclass, field
from typing import List, Optional

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB


@dataclass
class ModelState:
    df_train: Optional[pd.DataFrame] = None
    symptoms_list: List[str] = field(default_factory=list)
    random_forest: Optional[RandomForestClassifier] = None
    decision_tree: Optional[DecisionTreeClassifier] = None
    naive_bayes: Optional[GaussianNB] = None
