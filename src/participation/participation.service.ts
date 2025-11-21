import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Participation, ParticipationDocument } from './entities/participation.schema';
import { CreateParticipationDto } from './dto/create-participation.dto';
import { ParticipationStatus } from '../enums/participation-status.enum';
import { SortieService } from '../sortie/sortie.service';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class ParticipationService {
  constructor(
    @InjectModel(Participation.name)
    private participationModel: Model<ParticipationDocument>,
    private sortieService: SortieService,
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
  ) {}

  async create(
    createParticipationDto: CreateParticipationDto,
    userId: string,
  ): Promise<ParticipationDocument> {
    const { sortieId } = createParticipationDto;

    if (!Types.ObjectId.isValid(sortieId)) {
      throw new BadRequestException('Invalid sortie ID');
    }

    // 1. Check sortie exists
    const sortie = await this.sortieService.findOne(sortieId);
    if (!sortie) {
      throw new NotFoundException('Sortie not found');
    }

    const userIdObj = new Types.ObjectId(userId);
    const sortieIdObj = new Types.ObjectId(sortieId);

    // 2. Check for duplicate participation
    const existingParticipation = await this.participationModel.findOne({
      userId: userIdObj,
      sortieId: sortieIdObj,
    });

    if (existingParticipation) {
      throw new ConflictException(
        'User already participates in this sortie',
      );
    }

    // 3. Check capacity if defined
    if (sortie.capacite !== undefined && sortie.capacite > 0) {
      const acceptedCount = await this.participationModel.countDocuments({
        sortieId: sortieIdObj,
        status: ParticipationStatus.ACCEPTEE,
      });

      if (acceptedCount >= sortie.capacite) {
        throw new BadRequestException(
          'Sortie is at full capacity',
        );
      }
    }

    // 4. Create participation
    const participation = new this.participationModel({
      userId: userIdObj,
      sortieId: sortieIdObj,
      status: ParticipationStatus.EN_ATTENTE,
    });

    const savedParticipation = await participation.save();

    // 5. Push participation to sortie.participants
    await this.sortieService.addParticipant(sortieId, String(savedParticipation._id));

    return savedParticipation;
  }

  async findBySortie(sortieId: string): Promise<ParticipationDocument[]> {
    if (!Types.ObjectId.isValid(sortieId)) {
      throw new BadRequestException('Invalid sortie ID');
    }

    return this.participationModel
      .find({ sortieId: new Types.ObjectId(sortieId) })
      .populate('userId', 'name email')
      .populate('sortieId')
      .exec();
  }

  async findOne(id: string): Promise<ParticipationDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid participation ID');
    }

    const participation = await this.participationModel
      .findById(id)
      .populate('userId', 'name email')
      .populate('sortieId')
      .exec();

    if (!participation) {
      throw new NotFoundException('Participation not found');
    }

    return participation;
  }

  async cancelParticipation(
    participationId: string,
    userId: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(participationId)) {
      throw new BadRequestException('Invalid participation ID');
    }

    const participation = await this.participationModel.findById(participationId);

    if (!participation) {
      throw new NotFoundException('Participation not found');
    }

    // Check authorization: user or sortie creator
    const userIdObj = new Types.ObjectId(userId);
    if (
      !participation.userId.equals(userIdObj)
    ) {
      // Could also check if user is sortie creator, add here if needed
      throw new ForbiddenException(
        'Only the participant can cancel their participation',
      );
    }

    // Remove from sortie.participants
    const sortieId = participation.sortieId.toString();
    await this.sortieService.removeParticipant(sortieId, participationId);

    // Delete participation
    await this.participationModel.findByIdAndDelete(participationId).exec();
  }

  async getParticipationsBySortieAndStatus(
    sortieId: string,
    status: ParticipationStatus,
  ): Promise<ParticipationDocument[]> {
    if (!Types.ObjectId.isValid(sortieId)) {
      throw new BadRequestException('Invalid sortie ID');
    }

    return this.participationModel
      .find({
        sortieId: new Types.ObjectId(sortieId),
        status,
      })
      .populate('userId', 'name email')
      .exec();
  }

  /**
   * Update participation status (e.g., accept or reject)
   * When status changes to ACCEPTEE, add user to chat
   */
  async updateStatus(
    participationId: string,
    status: ParticipationStatus,
    adminUserId: string,
  ): Promise<ParticipationDocument> {
    if (!Types.ObjectId.isValid(participationId)) {
      throw new BadRequestException('Invalid participation ID');
    }

    const participation = await this.participationModel.findById(participationId);
    if (!participation) {
      throw new NotFoundException('Participation not found');
    }

    // Verify that the admin is the creator of the sortie
    const sortie = await this.sortieService.findOne(participation.sortieId.toString());
    if (!sortie.createurId.equals(new Types.ObjectId(adminUserId))) {
      throw new ForbiddenException('Only the sortie creator can update participation status');
    }

    const previousStatus = participation.status;
    participation.status = status;
    const updatedParticipation = await participation.save();

    // ✅ If participation is accepted, add user to chat
    if (status === ParticipationStatus.ACCEPTEE && previousStatus !== ParticipationStatus.ACCEPTEE) {
      try {
        await this.chatService.addUserToChat(
          participation.sortieId,
          participation.userId,
        );
      } catch (error) {
        console.error('Failed to add user to chat:', error.message);
        // Don't fail the status update if chat update fails
      }
    }

    // ✅ If participation is rejected, remove user from chat
    if (
      status === ParticipationStatus.REFUSEE &&
      previousStatus === ParticipationStatus.ACCEPTEE
    ) {
      try {
        await this.chatService.removeUserFromChat(
          participation.sortieId,
          participation.userId,
        );
      } catch (error) {
        console.error('Failed to remove user from chat:', error.message);
      }
    }

    return updatedParticipation;
  }
}
