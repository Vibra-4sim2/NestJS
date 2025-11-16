import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PublicationService } from './publication.service';
import { PublicationController } from './publication.controller';
import { Publication, publicationSchema } from './entities/publication.entity';
import { User, userSchema } from '../user/entities/user.entity'; // ✅ IMPORT


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Publication.name, schema: publicationSchema },
       { name: User.name, schema: userSchema },   // ✅ AJOUT ICI
    ])
  ],
  controllers: [PublicationController],
  providers: [PublicationService],
  exports: [PublicationService]
})
export class PublicationModule {}