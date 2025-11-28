# Système de Recommandations ML

Ce système intègre un modèle de clustering KMeans Python dans NestJS pour recommander des sorties aux utilisateurs.

## Architecture

- **NestJS** : Seul serveur HTTP, gère toutes les routes API
- **Python** : Script local appelé via `child_process` pour l'inférence ML
- **Communication** : stdin/stdout entre NestJS et Python

## Fichiers créés

### Python (`src/ai/`)
- `recommendation_runner.py` : Script principal d'inférence ML
- `prep_preferences.py` : Preprocessing des préférences utilisateur
- `prep_sorties.py` : Preprocessing des sorties
- `models/` : Dossier contenant les 6 fichiers `.joblib`

### NestJS (`src/recommendations/`)
- `recommendations.module.ts` : Module NestJS
- `recommendations.controller.ts` : Controller avec routes API
- `recommendations.service.ts` : Logique métier et orchestration
- `python-ml.service.ts` : Service de communication avec Python
- `dto/` : DTOs TypeScript pour les types de données

## Installation

### 1. Placer les modèles ML

Copiez vos 6 fichiers `.joblib` dans le dossier :
```
src/ai/models/
├── preferences_scaler.joblib
├── preferences_kmeans.joblib
├── preferences_features.joblib
├── sorties_scaler.joblib
├── sorties_kmeans.joblib
└── sorties_features.joblib
```

### 2. Installer les dépendances Python

```bash
pip install pandas numpy joblib python-dateutil scikit-learn
```

## Utilisation

### API Endpoint

**Route principale :**
```
GET /recommendations/:userId
```

**Exemple de requête :**
```bash
curl -X GET http://localhost:3000/recommendations/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Réponse :**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "userCluster": 2,
  "recommendations": [
    {
      "_id": "507f191e810c19729de860ea",
      "titre": "Randonnée en montagne",
      "description": "Belle randonnée...",
      "type": "RANDONNEE",
      "date": "2025-12-01T10:00:00.000Z",
      "difficulte": "MOYEN",
      ...
    }
  ],
  "debug": {
    "allSortiesWithClusters": [
      { "id": "507f191e810c19729de860ea", "cluster": 2 },
      { "id": "507f191e810c19729de860eb", "cluster": 1 }
    ]
  }
}
```

**Health Check :**
```
GET /recommendations/health/check
```

## Test du script Python directement

Vous pouvez tester le script Python indépendamment de NestJS :

### 1. Créer un fichier de test `test_input.json` :

```json
{
  "userPreferences": {
    "onboardingComplete": true,
    "level": "INTERMEDIATE",
    "cyclingType": "ROAD",
    "cyclingFrequency": "WEEKLY",
    "cyclingDistance": "20_50",
    "cyclingGroupInterest": true,
    "hikeType": "MOUNTAIN",
    "hikeDuration": "HALF_DAY",
    "hikePreference": "NATURE",
    "campingPractice": true,
    "campingType": "TENT",
    "campingDuration": "WEEKEND",
    "availableDays": "SATURDAY|SUNDAY",
    "start": "09:00",
    "end": "18:00",
    "latitude": 48.8566,
    "longitude": 2.3522,
    "averageSpeed": 20
  },
  "sorties": [
    {
      "id": "1",
      "type": "VELO",
      "difficulte": "MOYEN",
      "date": "2025-12-01T10:00:00.000Z",
      "option_camping": false,
      "camping": false,
      "capacite": 10,
      "distance": 35,
      "duree_estimee": 2.5
    },
    {
      "id": "2",
      "type": "RANDONNEE",
      "difficulte": "FACILE",
      "date": "2025-12-05T09:00:00.000Z",
      "option_camping": true,
      "camping": true,
      "capacite": 8,
      "distance": 12,
      "duree_estimee": 4
    }
  ]
}
```

### 2. Tester le script :

```bash
cd src/ai
python recommendation_runner.py < test_input.json
```

**Sortie attendue :**
```json
{
  "userCluster": 2,
  "sortiesWithClusters": [
    {"id": "1", "cluster": 2},
    {"id": "2", "cluster": 1}
  ],
  "matchedSortieIds": ["1"]
}
```

## Test avec Node.js

Créez un fichier `test-recommendations.js` à la racine :

```javascript
const { spawn } = require('child_process');
const path = require('path');

const testData = {
  userPreferences: {
    onboardingComplete: true,
    level: "INTERMEDIATE",
    cyclingType: "ROAD",
    // ... autres champs
  },
  sorties: [
    {
      id: "1",
      type: "VELO",
      difficulte: "MOYEN",
      // ... autres champs
    }
  ]
};

const pythonProcess = spawn('python', [
  path.join(__dirname, 'src', 'ai', 'recommendation_runner.py')
]);

let output = '';

pythonProcess.stdout.on('data', (data) => {
  output += data.toString();
});

pythonProcess.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

pythonProcess.on('close', (code) => {
  if (code === 0) {
    console.log('Résultat:', JSON.parse(output));
  } else {
    console.error('Exit code:', code);
  }
});

pythonProcess.stdin.write(JSON.stringify(testData));
pythonProcess.stdin.end();
```

Exécutez :
```bash
node test-recommendations.js
```

## Dépannage

### Erreur "Python not found"
- Vérifiez que Python est dans le PATH : `python --version`
- Sur Windows, essayez `py` au lieu de `python` dans `python-ml.service.ts`

### Erreur "Module not found"
- Vérifiez que les imports dans `recommendation_runner.py` fonctionnent
- Vérifiez que les fichiers `prep_preferences.py` et `prep_sorties.py` sont bien dans `src/ai/`

### Erreur "Model not found"
- Vérifiez que les 6 fichiers `.joblib` sont dans `src/ai/models/`
- Vérifiez les permissions de lecture

### Erreur "Invalid JSON"
- Activez les logs debug dans NestJS pour voir le payload envoyé
- Vérifiez que les données ne contiennent pas de valeurs `undefined` ou `NaN`

## Améliorations futures

1. **Cache** : Mettre en cache les résultats pour éviter des recalculs fréquents
2. **Async** : Exécuter les recommandations en arrière-plan avec une queue (Bull)
3. **Monitoring** : Ajouter des métriques sur les temps d'exécution
4. **Fallback** : Recommandations par défaut si Python échoue
5. **Batch** : Calculer les recommandations pour plusieurs utilisateurs en une fois
