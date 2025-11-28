import { Module } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { PythonMlService } from './python-ml.service';
import { UserModule } from '../user/user.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { SortieModule } from '../sortie/sortie.module';

/**
 * Module pour le système de recommandations basé sur le ML.
 * Intègre les services Python via child_process.
 */
@Module({
  imports: [
    UserModule,
    PreferencesModule,
    SortieModule,
  ],
  controllers: [RecommendationsController],
  providers: [
    RecommendationsService,
    PythonMlService,
  ],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
