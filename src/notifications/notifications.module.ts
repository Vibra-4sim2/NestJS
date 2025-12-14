import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { FcmToken, FcmTokenSchema } from './schemas/fcm-token.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FcmToken.name, schema: FcmTokenSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
    FirebaseModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
