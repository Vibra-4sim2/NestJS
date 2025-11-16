import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sortie, SortieSchema } from './entities/sortie.schema';
import { SortieService } from './sortie.service';
import { SortieController } from './sortie.controller';
import { CampingModule } from '../camping/camping.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Sortie.name, schema: SortieSchema }]),
    CampingModule,
    AuthModule,
  ],
  providers: [SortieService],
  controllers: [SortieController],
  exports: [SortieService],
})
export class SortieModule {}
