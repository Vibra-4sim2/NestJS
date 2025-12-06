import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Enregistrer un token FCM pour l'utilisateur connecté
   * POST /notifications/register
   */
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async registerToken(
    @Request() req,
    @Body() registerTokenDto: RegisterTokenDto,
  ) {
    const userId = req.user.userId || req.user.id || req.user._id;
    const token = await this.notificationsService.registerToken(
      userId,
      registerTokenDto,
    );

    return {
      success: true,
      message: 'Token FCM enregistré avec succès',
      data: {
        tokenId: (token as any)._id,
        isActive: token.isActive,
      },
    };
  }

  /**
   * Désactiver un token FCM
   * DELETE /notifications/unregister
   */
  @Delete('unregister')
  @HttpCode(HttpStatus.OK)
  async unregisterToken(@Request() req, @Body('token') token: string) {
    const userId = req.user.userId || req.user.id || req.user._id;
    const success = await this.notificationsService.unregisterToken(
      userId,
      token,
    );

    return {
      success,
      message: success
        ? 'Token FCM désactivé avec succès'
        : 'Token FCM introuvable',
    };
  }

  /**
   * Récupérer tous les tokens actifs de l'utilisateur
   * GET /notifications/tokens
   */
  @Get('tokens')
  @HttpCode(HttpStatus.OK)
  async getUserTokens(@Request() req) {
    const userId = req.user.userId || req.user.id || req.user._id;
    const tokens = await this.notificationsService.getUserTokens(userId);

    return {
      success: true,
      data: {
        count: tokens.length,
        tokens,
      },
    };
  }
}
