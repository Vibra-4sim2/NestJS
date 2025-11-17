import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Participation, ParticipationSchema } from './participation.schema';
import { ParticipationService } from './participation.service';
import { ParticipationController } from './participation.controller';
import { SortieModule } from '../sortie/sortie.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Participation.name, schema: ParticipationSchema },
    ]),
    SortieModule,
    AuthModule,
  ],
  providers: [ParticipationService],
  controllers: [ParticipationController],
  exports: [ParticipationService],
})
export class ParticipationModule {}
