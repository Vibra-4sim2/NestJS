import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Participation, ParticipationSchema } from './entities/participation.schema';
import { ParticipationService } from './participation.service';
import { ParticipationController } from './participation.controller';
import { SortieModule } from '../sortie/sortie.module';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Participation.name, schema: ParticipationSchema },
    ]),
    SortieModule,
    AuthModule,
    forwardRef(() => ChatModule), // Use forwardRef to avoid circular dependency
  ],
  providers: [ParticipationService],
  controllers: [ParticipationController],
  exports: [ParticipationService],
})
export class ParticipationModule {}
