"""
Script Python pour calculer les recommandations de sorties via clustering KMeans.
Appelé par NestJS via child_process.

Entrée (stdin): JSON avec userPreferences et sorties
Sortie (stdout): JSON avec userCluster, sortiesWithClusters et matchedSortieIds
"""

import sys
import json
import os
try:
    import joblib  # bibliothèque de sérialisation des modèles
except ImportError:
    try:
        # Ancien fallback (peu probable aujourd'hui)
        from sklearn.externals import joblib as joblib  # type: ignore
    except Exception:
        print("Erreur: le module 'joblib' est introuvable. Installez-le avec 'pip install joblib' ou 'pip install -r src/ai/requirements.txt'.", file=sys.stderr)
        sys.exit(1)

import pandas as pd
import numpy as np
from pathlib import Path

# Import des fonctions de preprocessing
try:
    from prep_preferences import prepare_preferences_dataframe
    from prep_sorties import prepare_sorties_dataframe
except ImportError:
    # Si exécuté depuis la racine du projet
    sys.path.insert(0, str(Path(__file__).parent))
    from prep_preferences import prepare_preferences_dataframe
    from prep_sorties import prepare_sorties_dataframe


def load_models():
    """Charge tous les modèles joblib nécessaires."""
    try:
        # Déterminer le chemin des modèles
        script_dir = Path(__file__).parent
        models_dir = script_dir / "models"
        
        models = {
            "preferences_scaler": joblib.load(models_dir / "preferences_scaler.joblib"),
            "preferences_kmeans": joblib.load(models_dir / "preferences_kmeans.joblib"),
            "preferences_features": joblib.load(models_dir / "preferences_features.joblib"),
            "sorties_scaler": joblib.load(models_dir / "sorties_scaler.joblib"),
            "sorties_kmeans": joblib.load(models_dir / "sorties_kmeans.joblib"),
            "sorties_features": joblib.load(models_dir / "sorties_features.joblib"),
        }
        
        return models
    except Exception as e:
        print(f"Erreur lors du chargement des modèles: {str(e)}", file=sys.stderr)
        sys.exit(1)


def ensure_features(df, required_features):
    """
    Garantit que le DataFrame contient toutes les colonnes requises.
    Ajoute les colonnes manquantes avec des 0.
    """
    for feature in required_features:
        if feature not in df.columns:
            df[feature] = 0
    
    # Retourner uniquement les colonnes dans l'ordre attendu
    return df[required_features]


def predict_user_cluster(user_prefs, models):
    """
    Prédit le cluster de l'utilisateur à partir de ses préférences.
    
    Args:
        user_prefs: dict contenant les préférences de l'utilisateur
        models: dict des modèles chargés
    
    Returns:
        int: numéro du cluster
    """
    try:
        # Convertir en DataFrame (1 ligne)
        df = pd.DataFrame([user_prefs])
        
        # Appliquer le preprocessing
        df_processed = prepare_preferences_dataframe(df)
        
        # Garantir toutes les features
        df_features = ensure_features(df_processed, models["preferences_features"])
        
        # Scaler
        df_scaled = models["preferences_scaler"].transform(df_features)
        
        # Prédire le cluster
        cluster = models["preferences_kmeans"].predict(df_scaled)[0]
        
        return int(cluster)
    
    except Exception as e:
        print(f"Erreur lors de la prédiction du cluster utilisateur: {str(e)}", file=sys.stderr)
        raise


def predict_sorties_clusters(sorties, models):
    """
    Prédit les clusters pour chaque sortie.
    
    Args:
        sorties: list de dict contenant les sorties
        models: dict des modèles chargés
    
    Returns:
        list: [{id, cluster}, ...]
    """
    try:
        if not sorties:
            return []
        
        # Convertir en DataFrame
        df = pd.DataFrame(sorties)
        
        # Garder les IDs à part
        sortie_ids = df["id"].tolist() if "id" in df.columns else list(range(len(df)))
        
        # Appliquer le preprocessing
        df_processed = prepare_sorties_dataframe(df)
        
        # Garantir toutes les features
        df_features = ensure_features(df_processed, models["sorties_features"])
        
        # Scaler
        df_scaled = models["sorties_scaler"].transform(df_features)
        
        # Prédire les clusters
        clusters = models["sorties_kmeans"].predict(df_scaled)
        
        # Construire le résultat
        result = []
        for i, sortie_id in enumerate(sortie_ids):
            result.append({
                "id": sortie_id,
                "cluster": int(clusters[i])
            })
        
        return result
    
    except Exception as e:
        print(f"Erreur lors de la prédiction des clusters de sorties: {str(e)}", file=sys.stderr)
        raise


def main():
    """Point d'entrée principal du script."""
    try:
        # Charger les modèles
        models = load_models()
        
        # Lire les données depuis stdin
        input_data = sys.stdin.read()
        
        if not input_data:
            print("Erreur: aucune donnée reçue sur stdin", file=sys.stderr)
            sys.exit(1)
        
        # Parser le JSON
        try:
            data = json.loads(input_data)
        except json.JSONDecodeError as e:
            print(f"Erreur: JSON invalide - {str(e)}", file=sys.stderr)
            sys.exit(1)
        
        # Valider la structure
        if "userPreferences" not in data:
            print("Erreur: 'userPreferences' manquant dans les données", file=sys.stderr)
            sys.exit(1)
        
        if "sorties" not in data:
            print("Erreur: 'sorties' manquant dans les données", file=sys.stderr)
            sys.exit(1)
        
        # Prédire le cluster de l'utilisateur
        user_cluster = predict_user_cluster(data["userPreferences"], models)
        
        # Prédire les clusters des sorties
        sorties_with_clusters = predict_sorties_clusters(data["sorties"], models)
        
        # Trouver les sorties correspondantes
        matched_sortie_ids = [
            item["id"] 
            for item in sorties_with_clusters 
            if item["cluster"] == user_cluster
        ]
        
        # Construire le résultat
        result = {
            "userCluster": user_cluster,
            "sortiesWithClusters": sorties_with_clusters,
            "matchedSortieIds": matched_sortie_ids
        }
        
        # Imprimer le résultat sur stdout
        print(json.dumps(result))
        sys.exit(0)
    
    except Exception as e:
        print(f"Erreur non gérée: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
