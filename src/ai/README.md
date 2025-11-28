# AI / Machine Learning Module

Ce dossier contient les scripts Python et modèles ML pour le système de recommandations.

## Structure

```
ai/
├── models/                          # Modèles ML entraînés (.joblib)
│   ├── .gitignore                   # Ne pas commiter les .joblib
│   ├── preferences_scaler.joblib
│   ├── preferences_kmeans.joblib
│   ├── preferences_features.joblib
│   ├── sorties_scaler.joblib
│   ├── sorties_kmeans.joblib
│   └── sorties_features.joblib
├── recommendation_runner.py         # Script principal d'inférence
├── prep_preferences.py              # Preprocessing des préférences
└── prep_sorties.py                  # Preprocessing des sorties
```

## Fichiers

### `recommendation_runner.py`
Script principal appelé par NestJS via `child_process`. 
- **Entrée** : JSON via stdin avec `userPreferences` et `sorties`
- **Sortie** : JSON via stdout avec `userCluster` et `matchedSortieIds`

### `prep_preferences.py`
Fonction `prepare_preferences_dataframe()` pour transformer les préférences brutes en features ML :
- One-hot encoding des variables catégorielles
- Encodage des jours disponibles
- Parsing des heures
- Normalisation des valeurs numériques

### `prep_sorties.py`
Fonction `prepare_sorties_dataframe()` pour transformer les sorties brutes en features ML :
- One-hot encoding de la difficulté et du type
- Extraction du mois et jour de la semaine
- Normalisation des coordonnées GPS
- Suppression des colonnes textuelles

## Utilisation

### Test direct
```bash
cd src/ai
python recommendation_runner.py < ../../test_input.json
```

### Via NestJS
Le service `PythonMlService` gère automatiquement l'appel au script.

## Dépendances Python

```bash
pip install pandas numpy joblib python-dateutil scikit-learn
```

## Notes

- Les modèles `.joblib` doivent être générés par votre pipeline d'entraînement
- Assurez-vous que les features utilisées lors de l'entraînement correspondent à celles générées par les scripts de preprocessing
- Les modèles ne sont pas versionnés dans Git (fichiers volumineux)
