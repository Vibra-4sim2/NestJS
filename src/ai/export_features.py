import joblib
import json
from pathlib import Path

features = joblib.load(Path("models/user_match_features.joblib"))
with open("models/user_match_features.json", "w", encoding="utf-8") as f:
    json.dump(list(features), f, ensure_ascii=False, indent=2)
print("user_match_features.json exporté avec succès.")