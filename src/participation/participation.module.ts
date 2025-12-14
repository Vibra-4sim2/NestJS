import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Participation, ParticipationSchema } from './entities/participation.schema';
import { ParticipationService } from './participation.service';
import { ParticipationController } from './participation.controller';
import { SortieModule } from '../sortie/sortie.module';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Participation.name, schema: ParticipationSchema },
      { name: 'User', schema: require('../users/schemas/user.schema').UserSchema },
    ]),
    SortieModule,
    AuthModule,
    forwardRef(() => ChatModule), // Use forwardRef to avoid circular dependency
    NotificationsModule,
  ],
  providers: [ParticipationService],
  controllers: [ParticipationController],
  exports: [ParticipationService],
})
export class ParticipationModule {}
