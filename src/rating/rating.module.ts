import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Rating, RatingSchema } from './entities/rating.schema';
import { Participation, ParticipationSchema } from '../participation/entities/participation.schema';
import { RatingService } from './rating.service';
import { RatingController } from './rating.controller';
import { SortieModule } from '../sortie/sortie.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Rating.name, schema: RatingSchema },
      { name: Participation.name, schema: ParticipationSchema },
    ]),
    forwardRef(() => SortieModule), // Use forwardRef to avoid potential circular dependency
    UserModule,
    AuthModule,
  ],
  providers: [RatingService],
  controllers: [RatingController],
  exports: [RatingService],
})
export class RatingModule implements OnModuleInit {
  constructor(@InjectConnection() private connection: Connection) {}

  async onModuleInit() {
    // Ensure indexes are created when module initializes
    const ratingCollection = this.connection.collection('ratings');
    try {
      await ratingCollection.createIndex(
        { userId: 1, sortieId: 1 },
        { unique: true }
      );
      console.log('✅ Rating indexes created successfully');
    } catch (error) {
      console.log('ℹ️ Rating indexes already exist or error:', error.message);
    }
  }
}
