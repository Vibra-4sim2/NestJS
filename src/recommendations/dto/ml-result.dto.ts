/**
 * Résultat retourné par le script Python recommendation_runner.py
 */
export interface MlResultDto {
  userCluster: number;
  sortiesWithClusters: SortieClusterDto[];
  matchedSortieIds: (string | number)[];
}

/**
 * Représentation d'une sortie avec son cluster
 */
export interface SortieClusterDto {
  id: string | number;
  cluster: number;
}
