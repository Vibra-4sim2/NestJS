import { Test, TestingModule } from '@nestjs/testing';
import { RatingService } from './rating.service';
import { getModelToken } from '@nestjs/mongoose';
import { Rating } from './entities/rating.schema';
import { Participation } from '../participation/entities/participation.schema';
import { SortieService } from '../sortie/sortie.service';
import { UserService } from '../user/user.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ParticipationStatus } from '../enums/participation-status.enum';
import { Types } from 'mongoose';

describe('RatingService', () => {
  let service: RatingService;
  let ratingModel: any;
  let participationModel: any;
  let sortieService: any;
  let userService: any;

  const mockRatingModel = {
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    deleteMany: jest.fn(),
  };

  const mockParticipationModel = {
    findOne: jest.fn(),
  };

  const mockSortieService = {
    findOne: jest.fn(),
    updateRatingSummary: jest.fn(),
    findByCreator: jest.fn(),
  };

  const mockUserService = {
    findOneById: jest.fn(),
    updateCreatorRatingSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingService,
        {
          provide: getModelToken(Rating.name),
          useValue: mockRatingModel,
        },
        {
          provide: getModelToken(Participation.name),
          useValue: mockParticipationModel,
        },
        {
          provide: SortieService,
          useValue: mockSortieService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    service = module.get<RatingService>(RatingService);
    ratingModel = module.get(getModelToken(Rating.name));
    participationModel = module.get(getModelToken(Participation.name));
    sortieService = module.get<SortieService>(SortieService);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rateSortie', () => {
    const userId = new Types.ObjectId().toString();
    const sortieId = new Types.ObjectId().toString();
    const creatorId = new Types.ObjectId().toString();
    const createRatingDto = { stars: 4, comment: 'Great sortie!' };

    it('should successfully create a rating for an accepted participant', async () => {
      const mockSortie = {
        _id: new Types.ObjectId(sortieId),
        createurId: new Types.ObjectId(creatorId),
      };

      const mockParticipation = {
        userId: new Types.ObjectId(userId),
        sortieId: new Types.ObjectId(sortieId),
        status: ParticipationStatus.ACCEPTEE,
      };

      const mockRating = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(userId),
        sortieId: new Types.ObjectId(sortieId),
        stars: 4,
        comment: 'Great sortie!',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSortieService.findOne.mockResolvedValue(mockSortie);
      mockParticipationModel.findOne.mockResolvedValue(mockParticipation);
      mockRatingModel.findOneAndUpdate.mockResolvedValue(mockRating);
      mockRatingModel.aggregate.mockResolvedValue([{ average: 4, count: 1 }]);
      mockSortieService.findByCreator.mockResolvedValue([mockSortie]);

      const result = await service.rateSortie(userId, sortieId, createRatingDto);

      expect(result).toEqual(mockRating);
      expect(mockSortieService.findOne).toHaveBeenCalledWith(sortieId);
      expect(mockParticipationModel.findOne).toHaveBeenCalled();
      expect(mockRatingModel.findOneAndUpdate).toHaveBeenCalled();
      expect(mockSortieService.updateRatingSummary).toHaveBeenCalled();
      expect(mockUserService.updateCreatorRatingSummary).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user tries to rate their own sortie', async () => {
      const mockSortie = {
        _id: new Types.ObjectId(sortieId),
        createurId: new Types.ObjectId(userId), // Same as rater
      };

      mockSortieService.findOne.mockResolvedValue(mockSortie);

      await expect(
        service.rateSortie(userId, sortieId, createRatingDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is not a participant', async () => {
      const mockSortie = {
        _id: new Types.ObjectId(sortieId),
        createurId: new Types.ObjectId(creatorId),
      };

      mockSortieService.findOne.mockResolvedValue(mockSortie);
      mockParticipationModel.findOne.mockResolvedValue(null);

      await expect(
        service.rateSortie(userId, sortieId, createRatingDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if participation is not accepted', async () => {
      const mockSortie = {
        _id: new Types.ObjectId(sortieId),
        createurId: new Types.ObjectId(creatorId),
      };

      const mockParticipation = {
        userId: new Types.ObjectId(userId),
        sortieId: new Types.ObjectId(sortieId),
        status: ParticipationStatus.EN_ATTENTE,
      };

      mockSortieService.findOne.mockResolvedValue(mockSortie);
      mockParticipationModel.findOne.mockResolvedValue(mockParticipation);

      await expect(
        service.rateSortie(userId, sortieId, createRatingDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if stars are out of range', async () => {
      await expect(
        service.rateSortie(userId, sortieId, { stars: 6 }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.rateSortie(userId, sortieId, { stars: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if sortie does not exist', async () => {
      mockSortieService.findOne.mockResolvedValue(null);

      await expect(
        service.rateSortie(userId, sortieId, createRatingDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteRating', () => {
    const userId = new Types.ObjectId().toString();
    const sortieId = new Types.ObjectId().toString();
    const creatorId = new Types.ObjectId().toString();

    it('should successfully delete a rating', async () => {
      const mockSortie = {
        _id: new Types.ObjectId(sortieId),
        createurId: new Types.ObjectId(creatorId),
      };

      const mockParticipation = {
        userId: new Types.ObjectId(userId),
        sortieId: new Types.ObjectId(sortieId),
        status: ParticipationStatus.ACCEPTEE,
      };

      mockSortieService.findOne.mockResolvedValue(mockSortie);
      mockParticipationModel.findOne.mockResolvedValue(mockParticipation);
      mockRatingModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
      mockRatingModel.aggregate.mockResolvedValue([]);
      mockSortieService.findByCreator.mockResolvedValue([mockSortie]);

      await service.deleteRating(userId, sortieId);

      expect(mockRatingModel.deleteOne).toHaveBeenCalled();
      expect(mockSortieService.updateRatingSummary).toHaveBeenCalled();
      expect(mockUserService.updateCreatorRatingSummary).toHaveBeenCalled();
    });

    it('should throw NotFoundException if rating does not exist', async () => {
      const mockSortie = {
        _id: new Types.ObjectId(sortieId),
        createurId: new Types.ObjectId(creatorId),
      };

      const mockParticipation = {
        userId: new Types.ObjectId(userId),
        sortieId: new Types.ObjectId(sortieId),
        status: ParticipationStatus.ACCEPTEE,
      };

      mockSortieService.findOne.mockResolvedValue(mockSortie);
      mockParticipationModel.findOne.mockResolvedValue(mockParticipation);
      mockRatingModel.deleteOne.mockResolvedValue({ deletedCount: 0 });

      await expect(service.deleteRating(userId, sortieId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserRatingForSortie', () => {
    it('should return user rating for a sortie', async () => {
      const userId = new Types.ObjectId().toString();
      const sortieId = new Types.ObjectId().toString();
      const mockRating = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(userId),
        sortieId: new Types.ObjectId(sortieId),
        stars: 5,
      };

      mockRatingModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRating),
      });

      const result = await service.getUserRatingForSortie(userId, sortieId);

      expect(result).toEqual(mockRating);
    });

    it('should return null if no rating exists', async () => {
      const userId = new Types.ObjectId().toString();
      const sortieId = new Types.ObjectId().toString();

      mockRatingModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getUserRatingForSortie(userId, sortieId);

      expect(result).toBeNull();
    });
  });

  describe('getRatingsForSortie', () => {
    it('should return paginated ratings', async () => {
      const sortieId = new Types.ObjectId().toString();
      const mockRatings = [
        { _id: new Types.ObjectId(), stars: 4 },
        { _id: new Types.ObjectId(), stars: 5 },
      ];

      mockRatingModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockRatings),
      });

      mockRatingModel.countDocuments.mockResolvedValue(2);

      const result = await service.getRatingsForSortie(sortieId, 1, 10);

      expect(result.ratings).toEqual(mockRatings);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getCreatorRatingSummary', () => {
    it('should return creator rating summary', async () => {
      const userId = new Types.ObjectId().toString();
      const mockUser = {
        _id: new Types.ObjectId(userId),
        creatorRatingSummary: { average: 4.5, count: 10 },
      };

      mockUserService.findOneById.mockResolvedValue(mockUser);

      const result = await service.getCreatorRatingSummary(userId);

      expect(result).toEqual({ average: 4.5, count: 10 });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = new Types.ObjectId().toString();

      mockUserService.findOneById.mockResolvedValue(null);

      await expect(service.getCreatorRatingSummary(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('recomputeSortieRatingSummary', () => {
    it('should recompute and update sortie rating summary', async () => {
      const sortieId = new Types.ObjectId().toString();

      mockRatingModel.aggregate.mockResolvedValue([
        { average: 4.3, count: 3 },
      ]);

      await service.recomputeSortieRatingSummary(sortieId);

      expect(mockSortieService.updateRatingSummary).toHaveBeenCalledWith(
        sortieId,
        { average: 4.3, count: 3 },
      );
    });

    it('should set summary to zero if no ratings exist', async () => {
      const sortieId = new Types.ObjectId().toString();

      mockRatingModel.aggregate.mockResolvedValue([]);

      await service.recomputeSortieRatingSummary(sortieId);

      expect(mockSortieService.updateRatingSummary).toHaveBeenCalledWith(
        sortieId,
        { average: 0, count: 0 },
      );
    });
  });

  describe('recomputeCreatorRatingSummary', () => {
    it('should recompute and update creator rating summary', async () => {
      const creatorId = new Types.ObjectId().toString();
      const mockSorties = [
        { _id: new Types.ObjectId() },
        { _id: new Types.ObjectId() },
      ];

      mockSortieService.findByCreator.mockResolvedValue(mockSorties);
      mockRatingModel.aggregate.mockResolvedValue([
        { average: 4.7, count: 10 },
      ]);

      await service.recomputeCreatorRatingSummary(creatorId);

      expect(mockUserService.updateCreatorRatingSummary).toHaveBeenCalledWith(
        creatorId,
        { average: 4.7, count: 10 },
      );
    });

    it('should set summary to zero if creator has no sorties', async () => {
      const creatorId = new Types.ObjectId().toString();

      mockSortieService.findByCreator.mockResolvedValue([]);

      await service.recomputeCreatorRatingSummary(creatorId);

      expect(mockUserService.updateCreatorRatingSummary).toHaveBeenCalledWith(
        creatorId,
        { average: 0, count: 0 },
      );
    });
  });
});
