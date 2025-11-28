# Tests API - Système de Recommandations

## 1. Health Check (sans authentification)

### cURL
```bash
curl -X GET http://localhost:3000/recommendations/health/check
```

### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/recommendations/health/check" -Method Get
```

### Réponse attendue
```json
{
  "status": "ok",
  "pythonAvailable": true
}
```

---

## 2. Obtenir les recommandations (avec authentification)

### cURL
```bash
curl -X GET http://localhost:3000/recommendations/YOUR_USER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### PowerShell
```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_JWT_TOKEN"
}

Invoke-RestMethod -Uri "http://localhost:3000/recommendations/YOUR_USER_ID" `
  -Method Get `
  -Headers $headers
```

### Réponse attendue
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "userCluster": 2,
  "recommendations": [
    {
      "_id": "507f191e810c19729de860ea",
      "titre": "Randonnée en montagne",
      "description": "Belle randonnée avec vue panoramique",
      "type": "RANDONNEE",
      "difficulte": "MOYEN",
      "date": "2025-12-01T10:00:00.000Z",
      "option_camping": false,
      "createurId": "507f1f77bcf86cd799439012",
      "capacite": 15,
      "itineraire": {
        "pointDepart": {
          "latitude": 48.8566,
          "longitude": 2.3522
        },
        "pointArrivee": {
          "latitude": 48.9000,
          "longitude": 2.4000
        },
        "distance": 12,
        "duree_estimee": 4
      },
      "participants": [],
      "createdAt": "2025-11-20T10:00:00.000Z",
      "updatedAt": "2025-11-20T10:00:00.000Z"
    }
  ],
  "debug": {
    "allSortiesWithClusters": [
      { "id": "507f191e810c19729de860ea", "cluster": 2 },
      { "id": "507f191e810c19729de860eb", "cluster": 1 },
      { "id": "507f191e810c19729de860ec", "cluster": 2 }
    ]
  }
}
```

---

## 3. Test complet avec Postman

### Collection Postman

Créez une collection avec ces requêtes :

#### Request 1 : Health Check
- **Method :** GET
- **URL :** `{{baseUrl}}/recommendations/health/check`
- **Headers :** Aucun
- **Tests :**
  ```javascript
  pm.test("Status is 200", function () {
    pm.response.to.have.status(200);
  });

  pm.test("Python is available", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.pythonAvailable).to.be.true;
  });
  ```

#### Request 2 : Get Recommendations
- **Method :** GET
- **URL :** `{{baseUrl}}/recommendations/{{userId}}`
- **Headers :**
  - `Authorization: Bearer {{jwtToken}}`
- **Tests :**
  ```javascript
  pm.test("Status is 200", function () {
    pm.response.to.have.status(200);
  });

  pm.test("Has userId", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.userId).to.exist;
  });

  pm.test("Has userCluster", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.userCluster).to.be.a('number');
  });

  pm.test("Has recommendations array", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.recommendations).to.be.an('array');
  });
  ```

#### Variables d'environnement
```json
{
  "baseUrl": "http://localhost:3000",
  "userId": "YOUR_USER_ID",
  "jwtToken": "YOUR_JWT_TOKEN"
}
```

---

## 4. Scénarios de test

### Scénario 1 : Utilisateur sans préférences
**Attente :** Erreur 404 - "Préférences non trouvées"

```bash
curl -X GET http://localhost:3000/recommendations/NEW_USER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Scénario 2 : Utilisateur avec préférences, aucune sortie
**Attente :** Réponse avec `recommendations: []`

### Scénario 3 : Utilisateur avec préférences, plusieurs sorties
**Attente :** Réponse avec liste de sorties filtrées par cluster

---

## 5. Tests d'erreur

### Utilisateur inexistant
```bash
curl -X GET http://localhost:3000/recommendations/invalid_id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**Réponse :** 404 - "Utilisateur invalid_id non trouvé"

### Sans token JWT
```bash
curl -X GET http://localhost:3000/recommendations/YOUR_USER_ID
```
**Réponse :** 401 - "Unauthorized"

### Token JWT invalide
```bash
curl -X GET http://localhost:3000/recommendations/YOUR_USER_ID \
  -H "Authorization: Bearer invalid_token"
```
**Réponse :** 401 - "Unauthorized"

---

## 6. Monitoring & Logs

Lors de l'exécution, surveillez les logs NestJS :

```bash
npm run start:dev
```

Vous devriez voir :
```
[RecommendationsController] Requête de recommandations pour l'utilisateur 507f...
[RecommendationsService] Calcul des recommandations pour l'utilisateur 507f...
[PythonMlService] Lancement du script Python pour les recommandations
[PythonMlService] Recommandations calculées: cluster 2, 3 sorties correspondantes
[RecommendationsService] 3 sorties recommandées sur 10 disponibles
```

---

## 7. Performance

Temps d'exécution typique :
- **Health check :** < 100ms
- **Recommandations (10 sorties) :** 500-1500ms (dépend de Python)
- **Recommandations (100 sorties) :** 1000-3000ms

Si le temps est trop long, envisagez :
- Mise en cache des résultats
- Pré-calcul des clusters
- Optimisation des modèles ML
