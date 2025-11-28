import { Controller, Get, Param, UseGuards, Logger, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Controller pour les recommandations de sorties basées sur le ML.
 */
@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  private readonly logger = new Logger(RecommendationsController.name);

  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  /**
   * Health check pour vérifier que le système de recommandations fonctionne.
   */
  @Get('health/check')
  async healthCheck(): Promise<{ status: string; pythonAvailable: boolean }> {
    return this.recommendationsService.healthCheck();
  }

  /**
   * Obtient les recommandations pour un utilisateur spécifique (admin).
   * 
   * @param userId - ID de l'utilisateur
   * @returns Recommandations personnalisées
   */
  @Get('user/:userId')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  async getRecommendationsForUser(
    @Param('userId') userId: string,
  ): Promise<RecommendationsResponseDto> {
    this.logger.log(`Requête de recommandations pour l'utilisateur ${userId}`);
    return this.recommendationsService.getRecommendationsForUser(userId);
  }

  /**
   * Obtient les recommandations de sorties pour l'utilisateur connecté.
   * L'ID utilisateur est récupéré automatiquement du JWT.
   * 
   * @returns Recommandations personnalisées
   */
  @Get()
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  async getRecommendations(
    @Request() req: any,
  ): Promise<RecommendationsResponseDto> {
    const userId = req.user.userId || req.user.sub || req.user._id;
    this.logger.log(`Requête de recommandations pour l'utilisateur ${userId}`);
    return this.recommendationsService.getRecommendationsForUser(userId);
  }
}
