# Guide de Démarrage Rapide - Système de Recommandations

## ✅ Prérequis

1. **Python** installé avec les packages suivants :
   ```bash
   pip install pandas numpy joblib python-dateutil scikit-learn
   ```

2. **Modèles ML** : Placez vos 6 fichiers `.joblib` dans `src/ai/models/`

3. **NestJS** : Backend déjà configuré avec toutes les dépendances

## 🚀 Installation en 3 étapes

### Étape 1 : Créer le dossier des modèles

```bash
mkdir -p src/ai/models
```

### Étape 2 : Copier vos modèles ML

Copiez vos fichiers `.joblib` dans `src/ai/models/` :
- `preferences_scaler.joblib`
- `preferences_kmeans.joblib`
- `preferences_features.joblib`
- `sorties_scaler.joblib`
- `sorties_kmeans.joblib`
- `sorties_features.joblib`

### Étape 3 : Tester le système

#### Test 1 : Script Python seul

```bash
cd src/ai
python recommendation_runner.py < ../../test_input.json
```

**Résultat attendu :** JSON avec `userCluster`, `sortiesWithClusters`, `matchedSortieIds`

#### Test 2 : Via Node.js

```bash
node test-recommendations.js
```

**Résultat attendu :** Affichage des recommandations avec clusters

#### Test 3 : Via l'API NestJS

1. Démarrez le serveur :
   ```bash
   npm run start:dev
   ```

2. Testez le health check :
   ```bash
   curl http://localhost:3000/recommendations/health/check
   ```

3. Testez avec un vrai utilisateur :
   ```bash
   curl -X GET http://localhost:3000/recommendations/USER_ID_HERE \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

## 🎯 Structure créée

```
src/
├── ai/
│   ├── models/                          # ⬅️ VOUS DEVEZ CRÉER CE DOSSIER
│   │   ├── preferences_scaler.joblib    # ⬅️ VOS FICHIERS .joblib ICI
│   │   ├── preferences_kmeans.joblib
│   │   ├── preferences_features.joblib
│   │   ├── sorties_scaler.joblib
│   │   ├── sorties_kmeans.joblib
│   │   └── sorties_features.joblib
│   ├── recommendation_runner.py         # ✅ Script principal ML
│   ├── prep_preferences.py              # ✅ Preprocessing utilisateur
│   └── prep_sorties.py                  # ✅ Preprocessing sorties
└── recommendations/
    ├── dto/
    │   ├── index.ts
    │   ├── ml-result.dto.ts
    │   └── recommendations-response.dto.ts
    ├── recommendations.controller.ts     # ✅ Routes API
    ├── recommendations.service.ts        # ✅ Logique métier
    ├── recommendations.module.ts         # ✅ Module NestJS
    └── python-ml.service.ts             # ✅ Communication avec Python

test-recommendations.js                  # ✅ Script de test Node
test_input.json                          # ✅ Données de test
RECOMMENDATIONS_README.md                # ✅ Documentation complète
```

## 🔍 Vérification rapide

### ✅ Python est installé ?
```bash
python --version
```

### ✅ Packages Python installés ?
```bash
python -c "import pandas, numpy, joblib; print('OK')"
```

### ✅ Modèles présents ?
```bash
# Windows PowerShell
Get-ChildItem src/ai/models/*.joblib

# Ou dans Git Bash / Linux
ls src/ai/models/*.joblib
```

Vous devriez voir 6 fichiers.

### ✅ Scripts Python présents ?
```bash
# Windows PowerShell
Get-ChildItem src/ai/*.py

# Ou dans Git Bash / Linux
ls src/ai/*.py
```

Vous devriez voir 3 fichiers : `recommendation_runner.py`, `prep_preferences.py`, `prep_sorties.py`

## 📡 Routes API disponibles

### GET /recommendations/:userId
Obtient les recommandations pour un utilisateur.

**Authentification :** Requise (JWT)

**Réponse :**
```json
{
  "userId": "string",
  "userCluster": 2,
  "recommendations": [
    {
      "_id": "...",
      "titre": "...",
      "type": "VELO",
      ...
    }
  ],
  "debug": {
    "allSortiesWithClusters": [...]
  }
}
```

### GET /recommendations/health/check
Vérifie la disponibilité de Python.

**Authentification :** Non requise

**Réponse :**
```json
{
  "status": "ok",
  "pythonAvailable": true
}
```

## ❌ Dépannage Express

### Erreur : "Python not found"
- **Windows :** Essayez `py` au lieu de `python` dans `python-ml.service.ts` (ligne 49)
- Vérifiez le PATH : `python --version`

### Erreur : "No module named 'pandas'"
```bash
pip install pandas numpy joblib python-dateutil scikit-learn
```

### Erreur : "Model not found"
- Vérifiez que les 6 `.joblib` sont dans `src/ai/models/`
- Vérifiez les permissions

### Erreur : "Preferences not found"
- L'utilisateur doit avoir complété son onboarding
- Vérifiez dans MongoDB que les préférences existent

## 🎉 C'est tout !

Le système est maintenant opérationnel. Pour plus de détails, consultez `RECOMMENDATIONS_README.md`.
