import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Camping, CampingSchema } from './camping.schema';
import { CampingService } from './camping.service';
import { CampingController } from './camping.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Camping.name, schema: CampingSchema }]),
  ],
  providers: [CampingService],
  controllers: [CampingController],
  exports: [CampingService],
})
export class CampingModule {}
