import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sortie, SortieSchema } from './entities/sortie.schema';
import { Participation, ParticipationSchema } from '../participation/entities/participation.schema';
import { SortieService } from './sortie.service';
import { SortieController } from './sortie.controller';
import { CampingModule } from '../camping/camping.module';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sortie.name, schema: SortieSchema },
      { name: Participation.name, schema: ParticipationSchema },
      { name: 'User', schema: require('../users/schemas/user.schema').UserSchema },
    ]),
    CampingModule,
    AuthModule,
    forwardRef(() => ChatModule), // Use forwardRef to avoid circular dependency
    NotificationsModule,
  ],
  providers: [SortieService],
  controllers: [SortieController],
  exports: [SortieService],
})
export class SortieModule {}
