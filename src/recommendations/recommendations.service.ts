import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { PreferencesService } from '../preferences/preferences.service';
import { SortieService } from '../sortie/sortie.service';
import { PythonMlService } from './python-ml.service';
import { RecommendationsResponseDto } from './dto';
import { ML_CONFIG } from './ml.config';
import { Types } from 'mongoose';

/**
 * Service principal pour gérer les recommandations.
 * Orchestre la récupération des données et l'appel au ML.
 */
@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly userService: UserService,
    private readonly preferencesService: PreferencesService,
    private readonly sortieService: SortieService,
    private readonly pythonMlService: PythonMlService,
  ) {}

  /**
   * Obtient les recommandations de sorties pour un utilisateur donné.
   * 
   * @param userId - ID de l'utilisateur
   * @returns Recommandations avec cluster et sorties correspondantes
   */
  async getRecommendationsForUser(
    userId: string,
  ): Promise<RecommendationsResponseDto> {
    this.logger.debug(`Calcul des recommandations pour l'utilisateur ${userId}`);

    // 1. Vérifier que l'utilisateur existe
    const user = await this.userService.findOneById(userId);
    if (!user) {
      throw new NotFoundException(`Utilisateur ${userId} non trouvé`);
    }

    // 2. Récupérer les préférences de l'utilisateur
    let userPreferences;
    try {
      userPreferences = await this.preferencesService.getForUser(userId);
    } catch (error) {
      throw new NotFoundException(
        `Préférences non trouvées pour l'utilisateur ${userId}`,
      );
    }

    // 3. Récupérer toutes les sorties disponibles
    const allSorties = await this.sortieService.findAll();

    if (allSorties.length === 0) {
      this.logger.warn('Aucune sortie disponible dans la base de données');
      return {
        userId,
        userCluster: -1,
        recommendations: [],
        debug: {
          allSortiesWithClusters: [],
        },
      };
    }

    // 4. Préparer les données pour le script Python
    // Transformer les sorties en objets plats pour Python
    const sortiesForPython = allSorties.map((sortie) => {
      const sortieObj = sortie.toObject ? sortie.toObject() : sortie;
      
      return {
        id: sortieObj._id?.toString() || sortieObj.id,
        titre: sortieObj.titre,
        description: sortieObj.description,
        difficulte: sortieObj.difficulte,
        date: sortieObj.date,
        type: sortieObj.type,
        option_camping: sortieObj.option_camping,
        camping: !!sortieObj.camping,
        capacite: sortieObj.capacite,
        distance: sortieObj.itineraire?.distance,
        duree_estimee: sortieObj.itineraire?.duree_estimee,
        depart_lat: sortieObj.itineraire?.pointDepart?.latitude,
        depart_lon: sortieObj.itineraire?.pointDepart?.longitude,
        arrivee_lat: sortieObj.itineraire?.pointArrivee?.latitude,
        arrivee_lon: sortieObj.itineraire?.pointArrivee?.longitude,
        itineraire_description: sortieObj.itineraire?.description,
        photo: sortieObj.photo,
        createurId: sortieObj.createurId?.toString(),
      };
    });

    // Transformer les préférences pour Python
    const preferencesForPython = {
      onboardingComplete: userPreferences.onboardingComplete,
      level: userPreferences.level,
      cyclingType: userPreferences.cyclingType,
      cyclingFrequency: userPreferences.cyclingFrequency,
      cyclingDistance: userPreferences.cyclingDistance,
      cyclingGroupInterest: userPreferences.cyclingGroupInterest,
      hikeType: userPreferences.hikeType,
      hikeDuration: userPreferences.hikeDuration,
      hikePreference: userPreferences.hikePreference,
      campingPractice: userPreferences.campingPractice,
      campingType: userPreferences.campingType,
      campingDuration: userPreferences.campingDuration,
      availableDays: userPreferences.availableDays,
      start: userPreferences.start,
      end: userPreferences.end,
      latitude: userPreferences.latitude,
      longitude: userPreferences.longitude,
      averageSpeed: userPreferences.averageSpeed,
    };

    // 5. Appeler le service Python ML
    const mlResult = await this.pythonMlService.getRecommendations(
      preferencesForPython,
      sortiesForPython,
    );

    // 6. Filtrer les sorties pour ne garder que les recommandations
    const matchedIds = new Set(
      mlResult.matchedSortieIds.map((id) => id.toString()),
    );

    const recommendations = allSorties.filter((sortie) => {
      const sortieId = sortie._id?.toString() || (sortie as any).id?.toString();
      return matchedIds.has(sortieId);
    });

    this.logger.debug(
      `${recommendations.length} sorties recommandées sur ${allSorties.length} disponibles`,
    );

    // 7. Construire la réponse
    const response: RecommendationsResponseDto = {
      userId,
      userCluster: mlResult.userCluster,
      recommendations: recommendations as any[], // Cast pour compatibilité avec le type Sortie
    };

    // Inclure les infos de debug uniquement en développement
    if (ML_CONFIG.includeDebugInfo) {
      response.debug = {
        allSortiesWithClusters: mlResult.sortiesWithClusters,
      };
    }

    return response;
  }

  /**
   * Vérifie que le système de recommandations est fonctionnel (health check).
   */
  async healthCheck(): Promise<{ status: string; pythonAvailable: boolean }> {
    const pythonAvailable = await this.pythonMlService.checkPythonAvailability();
    return {
      status: pythonAvailable ? 'ok' : 'python_unavailable',
      pythonAvailable,
    };
  }
}
