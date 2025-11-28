/**
 * Configuration pour le système de recommandations ML
 */
export const ML_CONFIG = {
  /**
   * Commande Python à utiliser
   * Sur Windows, vous pourriez avoir besoin de 'py' au lieu de 'python'
   */
  pythonCommand: 'python',

  /**
   * Chemin relatif vers le script Python depuis la racine du projet
   */
  scriptPath: 'src/ai/recommendation_runner.py',

  /**
   * Timeout pour l'exécution du script Python (en ms)
   */
  executionTimeout: 30000,

  /**
   * Activer les logs détaillés pour le debug
   */
  verboseLogging: process.env.NODE_ENV === 'development',

  /**
   * Inclure les données de debug dans les réponses API
   */
  includeDebugInfo: process.env.NODE_ENV === 'development',
};
