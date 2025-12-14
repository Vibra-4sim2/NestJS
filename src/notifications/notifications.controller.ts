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
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('notifications')
@ApiBearerAuth('JWT')
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
    const userId = req.user.sub || req.user.userId || req.user.id || req.user._id;
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
    const userId = req.user.sub || req.user.userId || req.user.id || req.user._id;
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
    const userId = req.user.sub || req.user.userId || req.user.id || req.user._id;
    const tokens = await this.notificationsService.getUserTokens(userId);

    return {
      success: true,
      data: {
        count: tokens.length,
        tokens,
      },
    };
  }

  /**
   * Test: Envoyer une notification de test à soi-même
   * POST /notifications/test
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send test notification to yourself' })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  async sendTestNotification(
    @Request() req,
    @Body() body?: { title?: string; message?: string },
  ) {
    const userId = req.user.sub || req.user.userId || req.user.id || req.user._id;

    const result = await this.notificationsService.notifyUsers(
      [userId],
      {
        title: body?.title || '🧪 Test Notification',
        body: body?.message || 'This is a test notification from your NestJS backend!',
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
        },
      },
    );

    return {
      success: result.successCount > 0,
      message: result.successCount > 0 
        ? 'Test notification sent successfully!' 
        : 'Failed to send notification. Make sure you have registered an FCM token.',
      data: {
        successCount: result.successCount,
        failureCount: result.failureCount,
      },
    };
  }

  /**
   * Test: Envoyer une notification à des utilisateurs spécifiques
   * POST /notifications/send
   */
  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send notification to specific users' })
  @ApiResponse({ status: 200, description: 'Notification sent' })
  async sendNotification(
    @Request() req,
    @Body() body: {
      userIds: string[];
      title: string;
      message: string;
      data?: { [key: string]: string };
      imageUrl?: string;
    },
  ) {
    const result = await this.notificationsService.notifyUsers(
      body.userIds,
      {
        title: body.title,
        body: body.message,
        data: body.data,
        imageUrl: body.imageUrl,
      },
    );

    return {
      success: result.successCount > 0,
      message: `Sent to ${result.successCount} users, failed for ${result.failureCount} users`,
      data: {
        successCount: result.successCount,
        failureCount: result.failureCount,
      },
    };
  }

  // ========================================
  // HYBRID MODE: Polling + Local Notifications
  // ========================================

  /**
   * Query notifications (for mobile polling)
   * GET /notifications
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Query notifications for current user (polling)' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved' })
  async getNotifications(
    @Request() req,
    @Query() query: QueryNotificationsDto,
  ) {
    const userId = req.user.sub || req.user.userId || req.user.id || req.user._id;
    
    const notifications = await this.notificationsService.queryNotifications(userId, {
      unreadOnly: query.unreadOnly,
      limit: query.limit,
      offset: query.offset,
    });

    return notifications.map((n: any) => ({
      id: n._id.toString(),
      title: n.title,
      body: n.body,
      type: n.type || 'general',
      data: n.data || {},
      isRead: n.isRead,
      createdAt: n.createdAt,
      readAt: n.readAt,
    }));
  }

  /**
   * Mark notification as read
   * PATCH /notifications/:id/read
   */
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@Request() req, @Param('id') notificationId: string) {
    const userId = req.user.sub || req.user.userId || req.user.id || req.user._id;
    
    const success = await this.notificationsService.markAsRead(notificationId, userId);

    return {
      success,
      message: success
        ? 'Notification marquée comme lue'
        : 'Notification introuvable ou accès refusé',
    };
  }

  /**
   * Get unread notification count
   * GET /notifications/unread-count
   */
  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get unread notification count (for badge)' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved' })
  async getUnreadCount(@Request() req) {
    const userId = req.user.sub || req.user.userId || req.user.id || req.user._id;
    
    const count = await this.notificationsService.getUnreadCount(userId);

    return { count };
  }
}
