import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sortie, SortieDocument } from './entities/sortie.schema';
import { CreateSortieDto, UpdateSortieDto } from './dto/sortie.dto';
import { SortieType } from '../enums/sortie-type.enum';
import { CampingService } from '../camping/camping.service';
import { CreateCampingDto } from '../camping/camping.dto';
import { ChatService } from '../chat/chat.service';
import { Participation } from '../participation/entities/participation.schema';
import { ParticipationStatus } from '../enums/participation-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import cloudinary from 'src/config/cloudinary.config';
import * as streamifier from 'streamifier';


@Injectable()
export class SortieService {
  private readonly logger = new Logger(SortieService.name);

  constructor(
    @InjectModel(Sortie.name) private sortieModel: Model<SortieDocument>,
    @InjectModel(Participation.name) private participationModel: Model<Participation>,
    @InjectModel('User') private userModel: Model<any>,
    private campingService: CampingService,
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
    private notificationsService: NotificationsService,
  ) {}




 async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'sorties' }, // Different folder from avatars
        (error, result) => {
          if (error) return reject(error);
          if (!result || !result.secure_url) {
            return reject(new Error('Cloudinary upload failed or returned no URL'));
          }
          resolve(result.secure_url);
        },
      );
      streamifier.createReadStream(file.buffer)
        .on('error', reject)
        .pipe(uploadStream);
    });
  }





async create(
    createSortieDto: CreateSortieDto,
    userId: string,
    file?: Express.Multer.File, // ✅ ADD THIS PARAMETER
  ): Promise<SortieDocument> {
    const { type, option_camping, campingId, camping, ...rest } =
      createSortieDto;

    // Validate business rules
    if (type === SortieType.CAMPING) {
      if (!campingId && !camping) {
        throw new BadRequestException(
          'For CAMPING sorties, either campingId or camping DTO must be provided',
        );
      }
    } else if (type === SortieType.VELO || type === SortieType.RANDONNEE) {
      if (option_camping === true) {
        if (!campingId && !camping) {
          throw new BadRequestException(
            'For VELO/RANDONNEE with option_camping=true, either campingId or camping DTO must be provided',
          );
        }
      } else if (option_camping === false) {
        if (campingId || camping) {
          throw new BadRequestException(
            'For VELO/RANDONNEE with option_camping=false, camping must not be provided',
          );
        }
      }
    }

    let campingId_resolved: Types.ObjectId | null = null;

    if (camping) {
      const createdCamping = await this.campingService.create(camping);
      campingId_resolved = new Types.ObjectId(String(createdCamping._id));
    } else if (campingId) {
      await this.campingService.findOne(campingId);
      campingId_resolved = new Types.ObjectId(campingId);
    }

    // ✅ ADD THIS: Handle photo upload
    let photoUrl: string | undefined;
    if (file) {
      photoUrl = await this.uploadToCloudinary(file);
    }

    const sortieData = {
      ...rest,
      type,
      option_camping,
      createurId: new Types.ObjectId(userId),
      camping: campingId_resolved,
      participants: [],
      photo: photoUrl, // ✅ ADD THIS
    };

    const sortie = new this.sortieModel(sortieData);
    const savedSortie = await sortie.save();

    // ✅ CREATE CHAT FOR THE SORTIE AUTOMATICALLY
    try {
      await this.chatService.createChatForSortie(
        savedSortie._id as Types.ObjectId,
        savedSortie.createurId,
        savedSortie.titre, // Use sortie title as chat name
      );
    } catch (error) {
      // Log error but don't fail sortie creation
      console.error('Failed to create chat for sortie:', error.message);
    }

    // ✅ CREATE AUTOMATIC PARTICIPATION FOR THE CREATOR WITH ACCEPTEE STATUS
    try {
      const creatorParticipation = new this.participationModel({
        userId: savedSortie.createurId,
        sortieId: savedSortie._id,
        status: ParticipationStatus.ACCEPTEE,
      });
      const savedParticipation = await creatorParticipation.save();
      
      // Add participation to sortie.participants
      await this.addParticipant(String(savedSortie._id), String(savedParticipation._id));
    } catch (error) {
      // Log error but don't fail sortie creation
      console.error('Failed to create automatic participation for creator:', error.message);
    }

    // 🔔 SEND NOTIFICATIONS TO FOLLOWERS
    try {
      const creator = await this.userModel.findById(savedSortie.createurId).exec();
      if (creator && creator.followers && creator.followers.length > 0) {
        const followerIds = creator.followers.map((id: any) => String(id));
        
        const notificationPayload = {
          title: `${creator.firstName} ${creator.lastName} a créé une sortie`,
          body: savedSortie.titre || 'Nouvelle sortie disponible',
          data: {
            type: 'new_sortie',
            sortieId: String(savedSortie._id),
            sortieType: savedSortie.type,
            creatorId: String(savedSortie.createurId),
            creatorName: `${creator.firstName} ${creator.lastName}`,
          },
        };

        this.logger.log(`📤 Envoi de notifications de sortie à ${followerIds.length} followers`);
        await this.notificationsService.notifyUsers(followerIds, notificationPayload);
        this.logger.log('✅ Notifications de sortie envoyées avec succès');
      }
    } catch (error) {
      this.logger.error('❌ Erreur lors de l\'envoi des notifications de sortie:', error.message);
    }

    return savedSortie;
  }

  async findAll(): Promise<SortieDocument[]> {
    return this.sortieModel
      .find()
      .populate('createurId', 'name email')
      .populate('camping')
      .populate('participants')
      .exec();
  }

  async findOne(id: string): Promise<SortieDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid sortie ID');
    }

    const sortie = await this.sortieModel
      .findById(id)
      .populate('createurId', 'name email')
      .populate('camping')
      .populate('participants')
      .exec();

    if (!sortie) {
      throw new NotFoundException('Sortie not found');
    }

    return sortie;
  }

  async findByCreator(creatorId: string): Promise<SortieDocument[]> {
    if (!Types.ObjectId.isValid(creatorId)) {
      throw new BadRequestException('Invalid creator ID');
    }

    return this.sortieModel
      .find({ createurId: new Types.ObjectId(creatorId) })
      .exec();
  }

  async update(
    id: string,
    updateSortieDto: UpdateSortieDto,
    userId: string,
  ): Promise<SortieDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid sortie ID');
    }

    const sortie = await this.sortieModel.findById(id).exec();
    if (!sortie) {
      throw new NotFoundException('Sortie not found');
    }

    // Check authorization: only creator can update
    if (sortie.createurId.toString() !== userId) {
      throw new ForbiddenException(
        'Only the creator can update this sortie',
      );
    }

    const { type, option_camping, campingId, camping, ...rest } =
      updateSortieDto;

    let updateData: any = rest;

    if (type !== undefined) {
      updateData.type = type;
    }
    if (option_camping !== undefined) {
      updateData.option_camping = option_camping;
    }

    // Handle camping updates
    if (camping) {
      const createdCamping = await this.campingService.create(camping);
      updateData.camping = new Types.ObjectId(String(createdCamping._id));
    } else if (campingId) {
      await this.campingService.findOne(campingId);
      updateData.camping = new Types.ObjectId(campingId);
    }

    const updated = await this.sortieModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('createurId', 'name email')
      .populate('camping')
      .populate('participants')
      .exec();

    if (!updated) {
      throw new NotFoundException('Sortie not found after update');
    }

    return updated;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid sortie ID');
    }

    const sortie = await this.sortieModel.findById(id).exec();
    if (!sortie) {
      throw new NotFoundException('Sortie not found');
    }

    // Check authorization: only creator can delete
    if (sortie.createurId.toString() !== userId) {
      throw new ForbiddenException(
        'Only the creator can delete this sortie',
      );
    }

    await this.sortieModel.findByIdAndDelete(id).exec();
  }

  async addParticipant(sortieId: string, participationId: string): Promise<void> {
    await this.sortieModel.findByIdAndUpdate(
      sortieId,
      { $push: { participants: new Types.ObjectId(participationId) } },
    );
  }

  async removeParticipant(sortieId: string, participationId: string): Promise<void> {
    await this.sortieModel.findByIdAndUpdate(
      sortieId,
      { $pull: { participants: new Types.ObjectId(participationId) } },
    );
  }

  async getParticipantCount(sortieId: string): Promise<number> {
    const sortie = await this.sortieModel.findById(sortieId).exec();
    return sortie?.participants?.length || 0;
  }

async setPhoto(id: string, file: Express.Multer.File, userId: string): Promise<SortieDocument> {
    const sortie = await this.sortieModel.findById(id).exec();
    if (!sortie) {
      throw new NotFoundException('Sortie not found');
    }

    // Check authorization
    if (sortie.createurId.toString() !== userId) {
      throw new ForbiddenException('Only the creator can update the photo');
    }

    const photoUrl = await this.uploadToCloudinary(file);

    const updated = await this.sortieModel
      .findByIdAndUpdate(id, { photo: photoUrl }, { new: true })
      .exec();

    if (!updated) throw new NotFoundException('Sortie not found after update');

    return updated;
  }

  /**
   * Update rating summary for a sortie (used by RatingService)
   */
  async updateRatingSummary(
    sortieId: string,
    summary: { average: number; count: number },
  ): Promise<void> {
    const updated = await this.sortieModel
      .findByIdAndUpdate(
        sortieId,
        { ratingSummary: summary },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Sortie not found');
    }
  }
}
