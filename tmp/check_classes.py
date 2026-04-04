import pandas as pd
import os

file_path = r'c:\Users\omkar\OneDrive\Desktop\DarkSlayers\Pharmacian-monitoring\data\disease-prediction\Training.csv'
if os.path.exists(file_path):
    df = pd.read_csv(file_path)
    print(f'Dataset: {file_path}')
    print(f'Number of classes: {df["prognosis"].nunique()}')
    print('Classes:')
    for item in sorted(df["prognosis"].unique()):
        print(f'- {item}')
else:
    print(f'File not found: {file_path}')
