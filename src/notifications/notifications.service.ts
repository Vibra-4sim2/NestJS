import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FcmToken, FcmTokenDocument } from './schemas/fcm-token.schema';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { FirebaseService, NotificationPayload } from '../firebase/firebase.service';
import { RegisterTokenDto } from './dto/register-token.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(FcmToken.name)
    private fcmTokenModel: Model<FcmTokenDocument>,
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    private firebaseService: FirebaseService,
  ) {}

  /**
   * Enregistrer ou mettre à jour un token FCM pour un utilisateur
   */
  async registerToken(
    userId: string,
    registerTokenDto: RegisterTokenDto,
  ): Promise<FcmToken> {
    try {
      const { token, deviceId, platform } = registerTokenDto;

      // Vérifier si le token existe déjà pour cet utilisateur
      const existingToken = await this.fcmTokenModel.findOne({
        userId: new Types.ObjectId(userId),
        token,
      });

      if (existingToken) {
        // Mettre à jour le token existant
        existingToken.isActive = true;
        existingToken.lastUsedAt = new Date();
        if (deviceId) existingToken.deviceId = deviceId;
        if (platform) existingToken.platform = platform;
        await existingToken.save();
        this.logger.log(`Token FCM mis à jour pour l'utilisateur ${userId}`);
        return existingToken;
      }

      // Créer un nouveau token
      const newToken = await this.fcmTokenModel.create({
        userId: new Types.ObjectId(userId),
        token,
        deviceId,
        platform,
        isActive: true,
        lastUsedAt: new Date(),
      });

      this.logger.log(`Nouveau token FCM enregistré pour l'utilisateur ${userId}`);
      return newToken;
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'enregistrement du token pour l'utilisateur ${userId}`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Désactiver un token FCM
   */
  async unregisterToken(userId: string, token: string): Promise<boolean> {
    try {
      const result = await this.fcmTokenModel.updateOne(
        { userId: new Types.ObjectId(userId), token },
        { isActive: false },
      );

      this.logger.log(
        `Token FCM désactivé pour l'utilisateur ${userId}: ${result.modifiedCount > 0}`,
      );
      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la désactivation du token pour l'utilisateur ${userId}`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Récupérer tous les tokens actifs d'un utilisateur
   */
  async getUserTokens(userId: string): Promise<string[]> {
    try {
      const tokens = await this.fcmTokenModel.find({
        userId: new Types.ObjectId(userId),
        isActive: true,
      });

      return tokens.map((t) => t.token);
    } catch (error) {
      this.logger.error(
        `Erreur lors de la récupération des tokens pour l'utilisateur ${userId}`,
        error.message,
      );
      return [];
    }
  }

  /**
   * Récupérer les tokens de plusieurs utilisateurs
   */
  async getUsersTokens(userIds: string[]): Promise<string[]> {
    try {
      // Normalize and validate IDs before casting to ObjectId
      const validIds = (userIds || [])
        .map((id) => String(id).trim())
        .filter((id) => Types.ObjectId.isValid(id));
      if (validIds.length === 0) {
        this.logger.warn(
          `Aucun ID valide fourni pour la récupération des tokens. IDs reçus: ${JSON.stringify(userIds)}`,
        );
        return [];
      }
      const objectIds = validIds.map((id) => new Types.ObjectId(id));
      const tokens = await this.fcmTokenModel.find({
        userId: { $in: objectIds },
        isActive: true,
      });

      // Deduplicate and filter empty
      const unique = Array.from(new Set(tokens.map((t) => t.token))).filter(Boolean);
      return unique;
    } catch (error) {
      this.logger.error(
        'Erreur lors de la récupération des tokens pour plusieurs utilisateurs',
        error.message,
      );
      return [];
    }
  }

  /**
   * Envoyer une notification à un utilisateur spécifique
   */
  async notifyUser(
    userId: string,
    payload: NotificationPayload,
  ): Promise<boolean> {
    try {
      const tokens = await this.getUserTokens(userId);

      if (tokens.length === 0) {
        this.logger.warn(
          `Aucun token FCM trouvé pour l'utilisateur ${userId}`,
        );
        return false;
      }

      const result = await this.firebaseService.sendToTokens(tokens, payload);
      return result.successCount > 0;
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'envoi de notification à l'utilisateur ${userId}`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Envoyer une notification à plusieurs utilisateurs
   * HYBRID MODE: sends push + persists notification per user
   */
  async notifyUsers(
    userIds: string[],
    payload: NotificationPayload,
  ): Promise<{ successCount: number; failureCount: number }> {
    try {
      // Log clean arrays of IDs
      const cleanIds = (userIds || []).map((id) => String(id).trim());
      this.logger.log(`🔍 Recherche de tokens pour les utilisateurs: ${JSON.stringify(cleanIds)}`);
      const tokens = await this.getUsersTokens(cleanIds);
      this.logger.log(`🎫 Tokens actifs trouvés: ${tokens.length} token(s)`);

      // STEP 1: Send push notifications (existing logic - UNTOUCHED)
      let pushResult = { successCount: 0, failureCount: 0 };
      if (tokens.length === 0) {
        // Vérifier en base de données pour debug (actifs ou non)
        const validIds = cleanIds.filter((id) => Types.ObjectId.isValid(id));
        const objectIds = validIds.map((id) => new Types.ObjectId(id));
        const allTokensInDb = await this.fcmTokenModel.find({
          userId: { $in: objectIds }
        });
        this.logger.warn(`⚠️ Aucun token FCM actif trouvé. Tokens en DB (actifs ou non): ${allTokensInDb.length}`);
        if (allTokensInDb.length > 0) {
          this.logger.warn(
            `📋 Tokens en DB: ${JSON.stringify(allTokensInDb.map(t => ({ userId: String(t.userId), isActive: t.isActive })))}`
          );
        }
      } else {
        this.logger.log(`📤 Envoi de ${tokens.length} notification(s)...`);
        pushResult = await this.firebaseService.sendToTokens(tokens, payload);
        this.logger.log(`✅ Résultat push: ${pushResult.successCount} succès, ${pushResult.failureCount} échecs`);
      }

      // STEP 2: Persist notification per user (NEW - HYBRID MODE)
      const validIds = cleanIds.filter((id) => Types.ObjectId.isValid(id));
      if (validIds.length > 0) {
        const notifications = validIds.map((userId) => ({
          userId: new Types.ObjectId(userId),
          title: payload.title,
          body: payload.body,
          type: payload.data?.type || 'general',
          data: payload.data,
          imageUrl: payload.imageUrl,
          isRead: false,
        }));

        await this.notificationModel.insertMany(notifications, { ordered: false });
        this.logger.log(`💾 ${notifications.length} notification(s) persistées pour polling`);
      }

      return pushResult;
    } catch (error) {
      this.logger.error(
        'Erreur lors de l\'envoi de notifications à plusieurs utilisateurs',
        error.message,
      );
      return { successCount: 0, failureCount: 0 };
    }
  }

  /**
   * Envoyer une notification à un topic
   */
  async notifyTopic(
    topic: string,
    payload: NotificationPayload,
  ): Promise<boolean> {
    return await this.firebaseService.sendToTopic(topic, payload);
  }

  /**
   * Souscrire un utilisateur à un topic
   */
  async subscribeUserToTopic(userId: string, topic: string): Promise<boolean> {
    try {
      const tokens = await this.getUserTokens(userId);

      if (tokens.length === 0) {
        this.logger.warn(
          `Aucun token FCM trouvé pour l'utilisateur ${userId}`,
        );
        return false;
      }

      return await this.firebaseService.subscribeToTopic(tokens, topic);
    } catch (error) {
      this.logger.error(
        `Erreur lors de la souscription de l'utilisateur ${userId} au topic ${topic}`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Désouscrire un utilisateur d'un topic
   */
  async unsubscribeUserFromTopic(
    userId: string,
    topic: string,
  ): Promise<boolean> {
    try {
      const tokens = await this.getUserTokens(userId);

      if (tokens.length === 0) {
        this.logger.warn(
          `Aucun token FCM trouvé pour l'utilisateur ${userId}`,
        );
        return false;
      }

      return await this.firebaseService.unsubscribeFromTopic(tokens, topic);
    } catch (error) {
      this.logger.error(
        `Erreur lors de la désouscription de l'utilisateur ${userId} du topic ${topic}`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Enqueue notification for scheduled/retry sending
   */
  async enqueue(
    userIds: string[],
    payload: NotificationPayload,
    scheduledAt?: Date,
  ): Promise<Notification> {
    try {
      const notification = await this.notificationModel.create({
        userIds: userIds.map((id) => new Types.ObjectId(id)),
        title: payload.title,
        body: payload.body,
        data: payload.data,
        imageUrl: payload.imageUrl,
        scheduledAt: scheduledAt ?? new Date(),
        status: 'queued',
        attempts: 0,
      });

      this.logger.log(`Notification enqueued with ID ${notification._id}`);
      return notification;
    } catch (error) {
      this.logger.error('Error enqueuing notification', error.message);
      throw error;
    }
  }

  /**
   * Nettoyer les tokens inactifs (plus de 90 jours)
   */
  async cleanupInactiveTokens(): Promise<number> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await this.fcmTokenModel.deleteMany({
        lastUsedAt: { $lt: ninetyDaysAgo },
        isActive: false,
      });

      this.logger.log(
        `${result.deletedCount} tokens inactifs supprimés`,
      );
      return result.deletedCount;
    } catch (error) {
      this.logger.error(
        'Erreur lors du nettoyage des tokens inactifs',
        error.message,
      );
      return 0;
    }
  }

  // ========================================
  // HYBRID MODE: Polling + Local Notifications
  // ========================================

  /**
   * Query notifications for polling (mobile clients)
   */
  async queryNotifications(
    userId: string,
    options: { unreadOnly?: boolean; limit?: number; offset?: number },
  ): Promise<Notification[]> {
    try {
      const { unreadOnly = true, limit = 50, offset = 0 } = options;
      const query: any = { userId: new Types.ObjectId(userId) };

      if (unreadOnly) {
        query.isRead = false;
      }

      const notifications = await this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(Math.min(limit, 100))
        .lean();

      return notifications;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la récupération des notifications pour l'utilisateur ${userId}`,
        error.message,
      );
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.notificationModel.updateOne(
        {
          _id: new Types.ObjectId(notificationId),
          userId: new Types.ObjectId(userId),
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        },
      );

      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(
        `Erreur lors du marquage de la notification ${notificationId} comme lue`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await this.notificationModel.countDocuments({
        userId: new Types.ObjectId(userId),
        isRead: false,
      });

      return count;
    } catch (error) {
      this.logger.error(
        `Erreur lors du comptage des notifications non lues pour l'utilisateur ${userId}`,
        error.message,
      );
      return 0;
    }
  }
}