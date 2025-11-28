import { Sortie } from '../../sortie/entities/sortie.schema';

/**
 * DTO pour la réponse complète des recommandations
 */
export class RecommendationsResponseDto {
  userId: string;
  userCluster: number;
  recommendations: Sortie[];
  debug?: {
    allSortiesWithClusters: Array<{ id: string | number; cluster: number }>;
  };
}
