import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { Publication, PublicationDocument } from './entities/publication.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import cloudinary from 'src/config/cloudinary.config';
import * as streamifier from 'streamifier';


@Injectable()
export class PublicationService {
  constructor(
    @InjectModel(Publication.name) private publicationModel: Model<PublicationDocument>,
     @InjectModel('User') private userModel: Model<any> // Ajouter injection User
  ) {}

  // async create(createPublicationDto: CreatePublicationDto): Promise<Publication> {
  //      const authorExists = await this.userModel.findById(createPublicationDto.author);
  //   if (!authorExists) {
  //     throw new NotFoundException('Author (User) not found');
  //   }

  //   // ✅ Vérifier que les mentions existent (optionnel mais recommandé)
  //   if (createPublicationDto.mentions && createPublicationDto.mentions.length > 0) {
  //     const mentionsExist = await this.userModel.countDocuments({
  //       _id: { $in: createPublicationDto.mentions }
  //     });
  //     if (mentionsExist !== createPublicationDto.mentions.length) {
  //       throw new BadRequestException('Some mentioned users do not exist');
  //     }
  //   }

  //   const toSave = {
  //     ...createPublicationDto,
  //     author: new Types.ObjectId(createPublicationDto.author),
  //     mentions: createPublicationDto.mentions?.map(id => new Types.ObjectId(id)) || [],
  //     tags: createPublicationDto.tags || [],
  //     likesCount: 0,
  //     commentsCount: 0,
  //     sharesCount: 0,
  //     likedBy: [],
  //     isActive: true
  //   };

  //   const newPublication = new this.publicationModel(toSave);
  //   return newPublication.save();
  // }
async create(dto: CreatePublicationDto, file?: Express.Multer.File) {
  const authorExists = await this.userModel.findById(dto.author);
  if (!authorExists) throw new NotFoundException('Author not found');

  let image: string | undefined = undefined;
  if (file) {
    image = await this.uploadToCloudinary(file);
  }

  // SPLIT ICI
  const tagsArray = dto.tags
    ? dto.tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const mentionsArray = dto.mentions
    ? dto.mentions.split(',').map(m => m.trim()).filter(Boolean)
    : [];

  const newPub = new this.publicationModel({
    author: new Types.ObjectId(dto.author),
    content: dto.content,
    tags: tagsArray,
    mentions: mentionsArray.map(id => new Types.ObjectId(id)),
    location: dto.location || undefined,
    image,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    isActive: true,
  });

  return newPub.save();
}

  



  async findAll(): Promise<Publication[]> {
    return this.publicationModel
      .find({ isActive: true })
      .populate('author', 'firstName lastName avatar')
      .populate('mentions', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByAuthor(authorId: string): Promise<Publication[]> {
    return this.publicationModel
      .find({ author: new Types.ObjectId(authorId), isActive: true })
      .populate('author', 'firstName lastName avatar')
      .populate('mentions', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Publication | null> {
    return this.publicationModel
      .findById(id)
      .populate('author', 'firstName lastName avatar')
      .populate('mentions', 'firstName lastName')
      .populate('likedBy', 'firstName lastName')
      .exec()
      .catch(err => {
        throw new NotFoundException('Publication not found');
      });
  }

  // async update(id: string, updatePublicationDto: UpdatePublicationDto): Promise<Publication | null> {
  //   const update: any = { ...updatePublicationDto };
    
  //   if (updatePublicationDto.mentions) {
  //     update.mentions = updatePublicationDto.mentions.map(id => new Types.ObjectId(id));
  //   }

  //   return this.publicationModel
  //     .findByIdAndUpdate(id, update, { new: true })
  //     .populate('author', 'firstName lastName avatar')
  //     .exec()
  //     .catch(err => {
  //       throw new NotFoundException('Publication not found');
  //     });
  // }
async update(id: string, updatePublicationDto: UpdatePublicationDto): Promise<Publication | null> {
  const update: any = { ...updatePublicationDto };

  // SPLIT MENTIONS SI C'EST UNE STRING
  if (updatePublicationDto.mentions) {
    const mentionsArray = typeof updatePublicationDto.mentions === 'string'
      ? updatePublicationDto.mentions.split(',').map(m => m.trim()).filter(Boolean)
      : updatePublicationDto.mentions;

    // Valide les ObjectIds
    const validMentions = mentionsArray.filter(id => Types.ObjectId.isValid(id));
    if (validMentions.length !== mentionsArray.length) {
      throw new BadRequestException('Invalid mention ID');
    }

    update.mentions = validMentions.map(id => new Types.ObjectId(id));
  }

  return this.publicationModel
    .findByIdAndUpdate(id, update, { new: true })
    .populate('author', 'firstName lastName avatar')
    .exec()
    .catch(err => {
      throw new NotFoundException('Publication not found');
    });
}
  async remove(id: string): Promise<Publication | null> {
    return this.publicationModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .exec()
      .catch(err => {
        throw new NotFoundException('Publication not found');
      });
  }

  async hardRemove(id: string): Promise<Publication | null> {
    return this.publicationModel
      .findByIdAndDelete(id)
      .exec()
      .catch(err => {
        throw new NotFoundException('Publication not found');
      });
  }

  async likePublication(publicationId: string, userId: string): Promise<Publication> {
    const publication = await this.publicationModel.findById(publicationId).exec();
    
    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    const isAlreadyLiked = publication.likedBy.some(id => id.equals(userObjectId));

    if (isAlreadyLiked) {
      publication.likedBy = publication.likedBy.filter(id => !id.equals(userObjectId));
      publication.likesCount = Math.max(0, publication.likesCount - 1);
    } else {
      publication.likedBy.push(userObjectId);
      publication.likesCount += 1;
    }

    return publication.save();
  }

  async incrementCommentsCount(publicationId: string): Promise<Publication> {
  const publication = await this.publicationModel
    .findByIdAndUpdate(
      publicationId,
      { $inc: { commentsCount: 1 } },
      { new: true }
    )
    .exec();

  if (!publication) {
    throw new NotFoundException('Publication not found');
  }

  return publication;
}

async incrementSharesCount(publicationId: string): Promise<Publication> {
  const publication = await this.publicationModel
    .findByIdAndUpdate(
      publicationId,
      { $inc: { sharesCount: 1 } },
      { new: true }
    )
    .exec();

  if (!publication) {
    throw new NotFoundException('Publication not found');
  }

  return publication;
}

  async setPublicationImage(id: string, file: Express.Multer.File): Promise<Publication> {
    const imageUrl = await this.uploadToCloudinary(file);

    const publication = await this.publicationModel
      .findByIdAndUpdate(id, { imageUrl }, { new: true })
      .exec();

    if (!publication) {
      throw new NotFoundException(`Publication with id ${id} not found`);
    }

    return publication;
  }

  private async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'publications' },
        (error, result) => {
          if (error) return reject(error);
          if (!result || !result.secure_url) {
            return reject(new Error('Cloudinary upload failed'));
          }
          resolve(result.secure_url);
        },
      );
      streamifier.createReadStream(file.buffer)
        .on('error', reject)
        .pipe(uploadStream);
    });
  }

  async findByTag(tag: string): Promise<Publication[]> {
    return this.publicationModel
      .find({ tags: { $in: [tag] }, isActive: true })
      .populate('author', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getFeed(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [publications, total] = await Promise.all([
      this.publicationModel
        .find({ isActive: true })
        .populate('author', 'firstName lastName avatar')
        .populate('mentions', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.publicationModel.countDocuments({ isActive: true })
    ]);

    return {
      publications,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}