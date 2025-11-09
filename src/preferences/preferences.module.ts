import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Preferences, PreferencesSchema } from './entities/preference.entity';
import { PreferencesController } from './preferences.controller';
import { PreferencesService } from './preferences.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Preferences.name, schema: PreferencesSchema }])],
  controllers: [PreferencesController],
  providers: [PreferencesService],
  exports: [PreferencesService],
})
export class PreferencesModule {}