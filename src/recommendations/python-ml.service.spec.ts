import { Test, TestingModule } from '@nestjs/testing';
import { PythonMlService } from './python-ml.service';

describe('PythonMlService', () => {
  let service: PythonMlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PythonMlService],
    }).compile();

    service = module.get<PythonMlService>(PythonMlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkPythonAvailability', () => {
    it('should check if Python is available', async () => {
      const result = await service.checkPythonAvailability();
      expect(typeof result).toBe('boolean');
    });
  });

  // Note : Les tests suivants nécessitent Python et les modèles .joblib
  // Ils peuvent être désactivés si Python n'est pas disponible dans l'environnement CI

  describe('getRecommendations', () => {
    it('should return ML results with valid input', async () => {
      // Arrange
      const userPreferences = {
        onboardingComplete: true,
        level: 'INTERMEDIATE',
        cyclingType: 'ROAD',
        cyclingFrequency: 'WEEKLY',
        cyclingDistance: '20_50',
        cyclingGroupInterest: true,
        hikeType: 'MOUNTAIN',
        hikeDuration: 'HALF_DAY',
        hikePreference: 'NATURE',
        campingPractice: true,
        campingType: 'TENT',
        campingDuration: 'WEEKEND',
        availableDays: 'SATURDAY|SUNDAY',
        start: '09:00',
        end: '18:00',
        latitude: 48.8566,
        longitude: 2.3522,
        averageSpeed: 20,
      };

      const sorties = [
        {
          id: '1',
          type: 'VELO',
          difficulte: 'MOYEN',
          date: '2025-12-01T10:00:00.000Z',
          option_camping: false,
          camping: false,
          capacite: 10,
          distance: 35,
          duree_estimee: 2.5,
        },
      ];

      // Act & Assert
      // Désactiver ce test si Python n'est pas disponible
      const pythonAvailable = await service.checkPythonAvailability();
      if (!pythonAvailable) {
        console.warn('Python not available, skipping ML test');
        return;
      }

      const result = await service.getRecommendations(
        userPreferences,
        sorties,
      );

      expect(result).toBeDefined();
      expect(typeof result.userCluster).toBe('number');
      expect(Array.isArray(result.sortiesWithClusters)).toBe(true);
      expect(Array.isArray(result.matchedSortieIds)).toBe(true);
    }, 30000); // Timeout de 30s pour l'exécution Python
  });
});
