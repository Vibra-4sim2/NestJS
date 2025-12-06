import { Injectable, Inject, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: { [key: string]: string };
  imageUrl?: string;
}

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(
    @Inject('FIREBASE_ADMIN')
    private readonly firebaseAdmin: typeof admin,
  ) {}

  /**
   * Envoyer une notification à un seul device token
   */
  async sendToDevice(
    token: string,
    payload: NotificationPayload,
  ): Promise<boolean> {
    if (!this.firebaseAdmin) {
      this.logger.warn('Firebase Admin not initialized. Skipping notification.');
      return false;
    }
    
    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      await this.firebaseAdmin.messaging().send(message);
      this.logger.log(`Notification envoyée avec succès au token: ${token.substring(0, 20)}...`);
      return true;
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'envoi de notification au token ${token.substring(0, 20)}...`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Envoyer une notification à plusieurs tokens
   */
  async sendToTokens(
    tokens: string[],
    payload: NotificationPayload,
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.firebaseAdmin) {
      this.logger.warn('Firebase Admin not initialized. Skipping notifications.');
      return { successCount: 0, failureCount: tokens.length };
    }
    
    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.firebaseAdmin.messaging().sendEachForMulticast(message);
      
      this.logger.log(
        `Notifications envoyées: ${response.successCount} succès, ${response.failureCount} échecs`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      this.logger.error('Erreur lors de l\'envoi de notifications multiples', error.message);
      return { successCount: 0, failureCount: tokens.length };
    }
  }

  /**
   * Envoyer une notification à un topic
   */
  async sendToTopic(
    topic: string,
    payload: NotificationPayload,
  ): Promise<boolean> {
    if (!this.firebaseAdmin) {
      this.logger.warn('Firebase Admin not initialized. Skipping topic notification.');
      return false;
    }
    
    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      await this.firebaseAdmin.messaging().send(message);
      this.logger.log(`Notification envoyée avec succès au topic: ${topic}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'envoi de notification au topic ${topic}`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Souscrire des tokens à un topic
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<boolean> {
    if (!this.firebaseAdmin) {
      this.logger.warn('Firebase Admin not initialized. Cannot subscribe to topic.');
      return false;
    }
    
    try {
      await this.firebaseAdmin.messaging().subscribeToTopic(tokens, topic);
      this.logger.log(`${tokens.length} token(s) souscrits au topic: ${topic}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la souscription au topic ${topic}`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Désouscrire des tokens d'un topic
   */
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<boolean> {
    if (!this.firebaseAdmin) {
      this.logger.warn('Firebase Admin not initialized. Cannot unsubscribe from topic.');
      return false;
    }
    
    try {
      await this.firebaseAdmin.messaging().unsubscribeFromTopic(tokens, topic);
      this.logger.log(`${tokens.length} token(s) désouscrits du topic: ${topic}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la désouscription du topic ${topic}`,
        error.message,
      );
      return false;
    }
  }
}
