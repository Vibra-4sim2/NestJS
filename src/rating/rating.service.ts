import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Rating, RatingDocument } from './entities/rating.schema';
import { CreateRatingDto } from './dto/create-rating.dto';
import { SortieService } from '../sortie/sortie.service';
import { UserService } from '../user/user.service';
import { Participation } from '../participation/entities/participation.schema';
import { ParticipationStatus } from '../enums/participation-status.enum';
import { Sortie } from '../sortie/entities/sortie.schema';
import { Camping } from '../camping/camping.schema';

@Injectable()
export class RatingService {
  constructor(
    @InjectModel(Rating.name) private ratingModel: Model<RatingDocument>,
    @InjectModel(Participation.name)
    private participationModel: Model<Participation>,
    private sortieService: SortieService,
    private userService: UserService,
  ) {}

  /**
   * Rate a sortie (upsert: create or update rating)
   * Enforces membership validation and prevents self-rating
   */
  async rateSortie(
    userId: string,
    sortieId: string,
    createRatingDto: CreateRatingDto,
  ): Promise<RatingDocument> {
    // Validate ObjectIds
    if (!Types.ObjectId.isValid(sortieId)) {
      throw new BadRequestException('Invalid sortie ID');
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    // Validate stars range
    if (createRatingDto.stars < 1 || createRatingDto.stars > 5) {
      throw new BadRequestException('Stars must be between 1 and 5');
    }

    // Check sortie exists
    const sortie = await this.sortieService.findOne(sortieId);
    if (!sortie) {
      throw new NotFoundException('Sortie not found');
    }

    const userIdObj = new Types.ObjectId(userId);
    const sortieIdObj = new Types.ObjectId(sortieId);

    // Prevent self-rating: check if user is the creator
    if (sortie.createurId.toString() === userId) {
      throw new ForbiddenException('You cannot rate your own sortie');
    }

    // Validate membership: only accepted participants can rate
    const participation = await this.participationModel.findOne({
      userId: userIdObj,
      sortieId: sortieIdObj,
    });

    if (!participation) {
      throw new ForbiddenException(
        'You must be a participant to rate this sortie',
      );
    }

    if (participation.status !== ParticipationStatus.ACCEPTEE) {
      throw new ForbiddenException(
        'Only accepted participants can rate this sortie',
      );
    }

    // Upsert rating
    const rating = await this.ratingModel.findOneAndUpdate(
      { userId: userIdObj, sortieId: sortieIdObj },
      {
        userId: userIdObj,
        sortieId: sortieIdObj,
        stars: createRatingDto.stars,
        comment: createRatingDto.comment,
      },
      { upsert: true, new: true },
    );

    // Recompute rating summaries
    await this.recomputeSortieRatingSummary(sortieId);
    
    // Convert creator ID properly - handle both ObjectId and string
    const creatorIdStr = sortie.createurId 
      ? (typeof sortie.createurId === 'string' 
          ? sortie.createurId 
          : sortie.createurId.toString())
      : null;
    
    if (creatorIdStr && Types.ObjectId.isValid(creatorIdStr)) {
      await this.recomputeCreatorRatingSummary(creatorIdStr);
    } else {
      console.error('Invalid creator ID from sortie:', sortie.createurId);
    }

    return rating;
  }

  /**
   * Compute eligible sorties for rating for a user.
   * Rule: next day after sortie.date (non-camping) or next day after camping.dateFin when camping is enabled.
   */
  async getEligibleToRate(userId: string): Promise<
    Array<{
      sortieId: string;
      title: string;
      camping: boolean;
      eligibleDate: Date;
    }>
  > {
    if (!userId || !Types.ObjectId.isValid(userId)) return [];

    const userIdObj = new Types.ObjectId(userId);

    // Find participations for user and populate sortie with camping ref
    const participations = await this.participationModel
      .find({ userId: userIdObj })
      .populate({
        path: 'sortieId',
        populate: { path: 'camping', model: 'Camping' },
      })
      .lean();

    const now = new Date();
    const result: Array<{
      sortieId: string;
      title: string;
      camping: boolean;
      eligibleDate: Date;
    }> = [];

    for (const p of participations) {
      const s = p.sortieId as unknown as Sortie & { camping?: Camping | null } & any;
      if (!s) continue;

      // Only accepted participants are considered eligible to rate
      if (p.status !== ParticipationStatus.ACCEPTEE) continue;

      const isCampingEnabled = Boolean(s.option_camping);
      const baseDate = isCampingEnabled
        ? new Date(
            (s.camping && (s.camping as any).dateFin) ? (s.camping as any).dateFin : s.date,
          )
        : new Date(s.date);
      if (isNaN(baseDate.getTime())) continue;

      const eligibilityDate = new Date(baseDate);
      eligibilityDate.setDate(eligibilityDate.getDate() + 1);

      const already = await this.ratingModel.exists({
        userId: userIdObj,
        sortieId: new Types.ObjectId(String((s as any)._id)),
      });
      if (already) continue;

      if (now >= eligibilityDate) {
        result.push({
          sortieId: String((s as any)._id),
          title: (s as any).titre ?? (s as any).name ?? 'Sortie',
          camping: isCampingEnabled,
          eligibleDate: eligibilityDate,
        });
      }
    }

    return result;
  }

  /**
   * Assert a sortie is eligible for the user to rate now; throws if not.
   */
  async assertSortieIsEligibleForUser(userId: string, sortieId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(sortieId)) {
      throw new BadRequestException('Invalid IDs');
    }

    const userIdObj = new Types.ObjectId(userId);
    const sortieIdObj = new Types.ObjectId(sortieId);

    // Must be an accepted participant
    const participation = await this.participationModel.findOne({
      userId: userIdObj,
      sortieId: sortieIdObj,
    });
    if (!participation || participation.status !== ParticipationStatus.ACCEPTEE) {
      throw new ForbiddenException('Only accepted participants can rate this sortie');
    }

    // Exclude duplicates
    const already = await this.ratingModel.exists({ userId: userIdObj, sortieId: sortieIdObj });
    if (already) {
      throw new ConflictException('You have already rated this sortie');
    }

    // Load sortie and camping
    const sortie = await this.sortieService.findOne(sortieId);
    if (!sortie) throw new NotFoundException('Sortie not found');

    const isCampingEnabled = Boolean((sortie as any).option_camping);
    const baseDate = isCampingEnabled
      ? new Date(
          (sortie as any).camping && (sortie as any).camping.dateFin
            ? (sortie as any).camping.dateFin
            : (sortie as any).date,
        )
      : new Date((sortie as any).date);
    if (isNaN(baseDate.getTime())) throw new BadRequestException('Invalid sortie date');

    const eligibilityDate = new Date(baseDate);
    eligibilityDate.setDate(eligibilityDate.getDate() + 1);

    if (new Date() < eligibilityDate) {
      throw new ForbiddenException('Rating not yet eligible for this sortie');
    }
  }

  /**
   * Delete a user's rating for a sortie
   * Enforces membership validation
   */
  async deleteRating(userId: string, sortieId: string): Promise<void> {
    // Validate ObjectIds
    if (!Types.ObjectId.isValid(sortieId)) {
      throw new BadRequestException('Invalid sortie ID');
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    // Check sortie exists
    const sortie = await this.sortieService.findOne(sortieId);
    if (!sortie) {
      throw new NotFoundException('Sortie not found');
    }

    const userIdObj = new Types.ObjectId(userId);
    const sortieIdObj = new Types.ObjectId(sortieId);

    // Validate membership
    const participation = await this.participationModel.findOne({
      userId: userIdObj,
      sortieId: sortieIdObj,
    });

    if (!participation) {
      throw new ForbiddenException(
        'You must be a participant to delete a rating',
      );
    }

    if (participation.status !== ParticipationStatus.ACCEPTEE) {
      throw new ForbiddenException(
        'Only accepted participants can delete ratings',
      );
    }

    // Delete rating
    const result = await this.ratingModel.deleteOne({
      userId: userIdObj,
      sortieId: sortieIdObj,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Rating not found');
    }

    // Recompute rating summaries
    await this.recomputeSortieRatingSummary(sortieId);
    
    // Convert creator ID properly - handle both ObjectId and string
    const creatorIdStr = sortie.createurId 
      ? (typeof sortie.createurId === 'string' 
          ? sortie.createurId 
          : sortie.createurId.toString())
      : null;
    
    if (creatorIdStr && Types.ObjectId.isValid(creatorIdStr)) {
      await this.recomputeCreatorRatingSummary(creatorIdStr);
    } else {
      console.error('Invalid creator ID from sortie:', sortie.createurId);
    }
  }

  /**
   * Get a user's rating for a specific sortie
   */
  async getUserRatingForSortie(
    userId: string,
    sortieId: string,
  ): Promise<RatingDocument | null> {
    if (!Types.ObjectId.isValid(sortieId)) {
      throw new BadRequestException('Invalid sortie ID');
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.ratingModel
      .findOne({
        userId: new Types.ObjectId(userId),
        sortieId: new Types.ObjectId(sortieId),
      })
      .exec();
  }

  /**
   * Get paginated ratings for a sortie
   */
  async getRatingsForSortie(
    sortieId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    ratings: RatingDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (!Types.ObjectId.isValid(sortieId)) {
      throw new BadRequestException('Invalid sortie ID');
    }

    const sortieIdObj = new Types.ObjectId(sortieId);
    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      this.ratingModel
        .find({ sortieId: sortieIdObj })
        .populate('userId', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.ratingModel.countDocuments({ sortieId: sortieIdObj }),
    ]);

    return {
      ratings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get creator's rating summary
   */
  async getCreatorRatingSummary(
    userId: string,
  ): Promise<{ average: number; count: number }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userService.findOneById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Return only the summary fields, not the whole user object
    const summary = user.creatorRatingSummary || { average: 0, count: 0 };
    return {
      average: summary.average,
      count: summary.count,
    };
  }

  /**
   * Recompute and persist sortie rating summary
   */
  async recomputeSortieRatingSummary(sortieId: string): Promise<void> {
    if (!Types.ObjectId.isValid(sortieId)) {
      throw new BadRequestException('Invalid sortie ID');
    }

    const sortieIdObj = new Types.ObjectId(sortieId);

    const result = await this.ratingModel.aggregate([
      { $match: { sortieId: sortieIdObj } },
      {
        $group: {
          _id: null,
          average: { $avg: '$stars' },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary =
      result.length > 0
        ? { average: Math.round(result[0].average * 10) / 10, count: result[0].count }
        : { average: 0, count: 0 };

    await this.sortieService.updateRatingSummary(sortieId, summary);
  }

  /**
   * Recompute and persist creator rating summary based on all their sorties
   */
  async recomputeCreatorRatingSummary(creatorId: string): Promise<void> {
    if (!Types.ObjectId.isValid(creatorId)) {
      throw new BadRequestException('Invalid creator ID');
    }

    const creatorIdObj = new Types.ObjectId(creatorId);

    // Get all sorties created by this user
    const sorties = await this.sortieService.findByCreator(creatorId);
    console.log(`Found ${sorties.length} sorties for creator ${creatorId}`);
    
    const sortieIds = sorties.map((s) => new Types.ObjectId(String(s._id)));

    if (sortieIds.length === 0) {
      // Creator has no sorties, set summary to 0
      await this.userService.updateCreatorRatingSummary(creatorId, {
        average: 0,
        count: 0,
      });
      return;
    }

    // Aggregate all ratings for creator's sorties
    const result = await this.ratingModel.aggregate([
      { $match: { sortieId: { $in: sortieIds } } },
      {
        $group: {
          _id: null,
          average: { $avg: '$stars' },
          count: { $sum: 1 },
        },
      },
    ]);

    console.log(`Rating aggregation result for creator ${creatorId}:`, result);

    const summary =
      result.length > 0
        ? { average: Math.round(result[0].average * 10) / 10, count: result[0].count }
        : { average: 0, count: 0 };

    console.log(`Updating creator ${creatorId} summary:`, summary);
    await this.userService.updateCreatorRatingSummary(creatorId, summary);
  }

  /**
   * Delete all ratings for a sortie (called when sortie is deleted)
   */
  async deleteRatingsForSortie(sortieId: string): Promise<void> {
    if (!Types.ObjectId.isValid(sortieId)) {
      return;
    }

    await this.ratingModel.deleteMany({
      sortieId: new Types.ObjectId(sortieId),
    });
  }
}
