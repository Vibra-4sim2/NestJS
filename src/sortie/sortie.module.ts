import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sortie, SortieSchema } from './entities/sortie.schema';
import { Participation, ParticipationSchema } from '../participation/entities/participation.schema';
import { SortieService } from './sortie.service';
import { SortieController } from './sortie.controller';
import { CampingModule } from '../camping/camping.module';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sortie.name, schema: SortieSchema },
      { name: Participation.name, schema: ParticipationSchema },
    ]),
    CampingModule,
    AuthModule,
    forwardRef(() => ChatModule), // Use forwardRef to avoid circular dependency
  ],
  providers: [SortieService],
  controllers: [SortieController],
  exports: [SortieService],
})
export class SortieModule {}
