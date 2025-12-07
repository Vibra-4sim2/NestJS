import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FcmToken, FcmTokenDocument } from './entities/fcm-token.entity';
import { FirebaseService, NotificationPayload } from '../firebase/firebase.service';
import { RegisterTokenDto } from './dto/register-token.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(FcmToken.name)
    private fcmTokenModel: Model<FcmTokenDocument>,
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
        return { successCount: 0, failureCount: 0 };
      }

      this.logger.log(`📤 Envoi de ${tokens.length} notification(s)...`);
      const result = await this.firebaseService.sendToTokens(tokens, payload);
      this.logger.log(`✅ Résultat: ${result.successCount} succès, ${result.failureCount} échecs`);
      return result;
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
}