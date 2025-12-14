/**
 * OPTIONAL: Cron service for scheduled/retry notification sending
 * 
 * To enable this service:
 * 1. Install @nestjs/schedule: npm install @nestjs/schedule
 * 2. Import ScheduleModule in notifications.module.ts
 * 3. Add NotificationCronService to providers
 * 
 * This file is provided for future use but not currently active.
 */

import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationsService } from '../notifications.service';
import { Notification, NotificationDocument } from '../schemas/notification.schema';

@Injectable()
export class NotificationCronService {
  private readonly logger = new Logger(NotificationCronService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Process queued notifications every minute
   * Uncomment @Cron decorator after installing @nestjs/schedule
   */
  // @Cron(CronExpression.EVERY_MINUTE)
  async processQueue() {
    try {
      const due = await this.notificationModel
        .find({
          status: 'queued',
          scheduledAt: { $lte: new Date() },
          attempts: { $lt: 5 },
        })
        .limit(100)
        .lean();

      if (due.length === 0) {
        return;
      }

      this.logger.log(`Processing ${due.length} queued notifications`);

      for (const notification of due) {
        try {
          // Skip if no userIds (legacy queue format)
          if (!notification.userIds || notification.userIds.length === 0) {
            continue;
          }

          const { successCount, failureCount } = await this.notificationsService.notifyUsers(
            notification.userIds.map(String),
            {
              title: notification.title,
              body: notification.body,
              data: notification.data,
              imageUrl: notification.imageUrl,
            },
          );

          const newStatus = failureCount === 0 && successCount > 0 ? 'sent' : 'failed';
          
          await this.notificationModel.updateOne(
            { _id: notification._id },
            {
              $set: { status: newStatus },
              $inc: { attempts: 1 },
            },
          );

          this.logger.log(
            `Notification ${notification._id}: ${successCount} sent, ${failureCount} failed`,
          );
        } catch (error) {
          this.logger.error(
            `Error processing notification ${notification._id}:`,
            error.message,
          );
          
          await this.notificationModel.updateOne(
            { _id: notification._id },
            {
              $set: { status: 'failed', lastError: error.message },
              $inc: { attempts: 1 },
            },
          );
        }
      }
    } catch (error) {
      this.logger.error('Error in processQueue cron:', error.message);
    }
  }

  /**
   * Cleanup invalid tokens daily at 3 AM
   * Uncomment @Cron decorator after installing @nestjs/schedule
   */
  // @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupInvalidTokens() {
    try {
      const count = await this.notificationsService.cleanupInactiveTokens();
      this.logger.log(`Cleaned up ${count} inactive FCM tokens`);
    } catch (error) {
      this.logger.error('Error in cleanupInvalidTokens cron:', error.message);
    }
  }

  /**
   * Archive old sent notifications (older than 30 days) monthly
   * Uncomment @Cron decorator after installing @nestjs/schedule
   */
  // @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async archiveOldNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.notificationModel.deleteMany({
        status: 'sent',
        createdAt: { $lt: thirtyDaysAgo },
      });

      this.logger.log(`Archived ${result.deletedCount} old notifications`);
    } catch (error) {
      this.logger.error('Error in archiveOldNotifications cron:', error.message);
    }
  }
}
