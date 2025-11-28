import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { join } from 'path';
import { MlResultDto } from './dto';
import { ML_CONFIG } from './ml.config';

/**
 * Service pour interagir avec les scripts Python via child_process.
 * Lance le script recommendation_runner.py et communique via stdin/stdout.
 */
@Injectable()
export class PythonMlService {
  private readonly logger = new Logger(PythonMlService.name);
  private readonly pythonScriptPath: string;

  constructor() {
    // Chemin vers le script Python depuis la racine du projet
    this.pythonScriptPath = join(process.cwd(), ML_CONFIG.scriptPath);
    
    if (ML_CONFIG.verboseLogging) {
      this.logger.debug(`Script Python: ${this.pythonScriptPath}`);
      this.logger.debug(`Commande Python: ${ML_CONFIG.pythonCommand}`);
    }
  }

  /**
   * Appelle le script Python pour obtenir les recommandations.
   * 
   * @param userPreferences - Préférences de l'utilisateur (format brut depuis DB)
   * @param sorties - Liste des sorties disponibles
   * @returns Résultat ML avec clusters et recommandations
   */
  async getRecommendations(
    userPreferences: any,
    sorties: any[],
  ): Promise<MlResultDto> {
    return new Promise((resolve, reject) => {
      if (ML_CONFIG.verboseLogging) {
        this.logger.debug('Lancement du script Python pour les recommandations');
        this.logger.debug(`Nombre de sorties: ${sorties.length}`);
      }

      // Créer le processus Python
      const pythonProcess = spawn(ML_CONFIG.pythonCommand, [this.pythonScriptPath], {
        cwd: process.cwd(),
      });

      let stdoutData = '';
      let stderrData = '';

      // Collecter stdout
      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      // Collecter stderr
      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
        this.logger.warn(`Python stderr: ${data.toString()}`);
      });

      // Gérer la fermeture du processus
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(
            `Le script Python s'est terminé avec le code ${code}`,
          );
          this.logger.error(`Stderr: ${stderrData}`);
          reject(
            new InternalServerErrorException(
              `Erreur lors de l'exécution du script Python: ${stderrData}`,
            ),
          );
          return;
        }

        try {
          // Parser le résultat JSON
          const result: MlResultDto = JSON.parse(stdoutData);
          
          if (ML_CONFIG.verboseLogging) {
            this.logger.debug(
              `Recommandations calculées: cluster ${result.userCluster}, ${result.matchedSortieIds.length} sorties correspondantes`,
            );
          }
          
          resolve(result);
        } catch (error) {
          this.logger.error('Erreur lors du parsing du résultat JSON');
          this.logger.error(`Stdout: ${stdoutData}`);
          reject(
            new InternalServerErrorException(
              'Réponse invalide du script Python',
            ),
          );
        }
      });

      // Gérer les erreurs de processus
      pythonProcess.on('error', (error) => {
        this.logger.error('Erreur lors du lancement du processus Python', error);
        reject(
          new InternalServerErrorException(
            `Impossible de lancer le script Python: ${error.message}`,
          ),
        );
      });

      // Envoyer les données au script via stdin
      const payload = {
        userPreferences,
        sorties,
      };

      try {
        const jsonPayload = JSON.stringify(payload);
        pythonProcess.stdin.write(jsonPayload);
        pythonProcess.stdin.end();
      } catch (error) {
        this.logger.error('Erreur lors de l\'écriture dans stdin', error);
        pythonProcess.kill();
        reject(
          new InternalServerErrorException(
            'Erreur lors de l\'envoi des données au script Python',
          ),
        );
      }
    });
  }

  /**
   * Vérifie que Python et les dépendances sont disponibles (méthode utilitaire).
   * Peut être utilisée pour un health check.
   */
  async checkPythonAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      const pythonProcess = spawn(ML_CONFIG.pythonCommand, ['--version']);

      pythonProcess.on('close', (code) => {
        resolve(code === 0);
      });

      pythonProcess.on('error', () => {
        resolve(false);
      });
    });
  }
}
