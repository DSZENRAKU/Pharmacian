import requests
import json

url = "http://127.0.0.1:5000/predict"
payload = {
    "symptoms": "I feel very tired and always thirsty",
    "age": 45,
    "gender": 1,
    "weight": 80,
    "h_hyper": 1,
    "h_diabe": 1,
    "h_asthma": 0,
    "h_allergy": 0,
    "h_surgery": 0,
    "medications": [],
    "notes": "",
    "is_refined": False
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
