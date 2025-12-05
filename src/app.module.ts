///////////////////////////////////////////////////////////////////////////////
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerMiddleware } from './logger/logger.middleware';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { PreferencesModule } from './preferences/preferences.module';
import { CampingModule } from './camping/camping.module';
import { SortieModule } from './sortie/sortie.module';
import { ParticipationModule } from './participation/participation.module';
import { PublicationModule } from './publication/publication.module';
import { ChatModule } from './chat/chat.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { RatingModule } from './rating/rating.module';

@Module({
  imports: [
    // ✅ Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // ✅ Database connection
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_URI'),
      }),
    }),

    // ✅ App feature modules
    UserModule,
    AuthModule,
    MailModule,
    PreferencesModule,
    CampingModule,
    SortieModule,
    ParticipationModule,
    PublicationModule,
    ChatModule, // ✅ Real-time chat module
    RecommendationsModule, // ✅ ML-based recommendations
    RatingModule, // ✅ Rating system
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
///////////////////////