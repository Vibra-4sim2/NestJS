import { Test, TestingModule } from '@nestjs/testing';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';
import { Types } from 'mongoose';

describe('RatingController', () => {
  let controller: RatingController;
  let service: RatingService;

  const mockRatingService = {
    rateSortie: jest.fn(),
    deleteRating: jest.fn(),
    getRatingsForSortie: jest.fn(),
    getUserRatingForSortie: jest.fn(),
    getCreatorRatingSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RatingController],
      providers: [
        {
          provide: RatingService,
          useValue: mockRatingService,
        },
      ],
    }).compile();

    controller = module.get<RatingController>(RatingController);
    service = module.get<RatingService>(RatingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('rateSortie', () => {
    it('should rate a sortie', async () => {
      const sortieId = new Types.ObjectId().toString();
      const userId = new Types.ObjectId().toString();
      const createRatingDto = { stars: 4, comment: 'Great!' };
      const mockRating = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(userId),
        sortieId: new Types.ObjectId(sortieId),
        stars: 4,
        comment: 'Great!',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const req = { user: { userId } };

      mockRatingService.rateSortie.mockResolvedValue(mockRating);

      const result = await controller.rateSortie(sortieId, createRatingDto, req);

      expect(result.stars).toBe(4);
      expect(result.comment).toBe('Great!');
      expect(mockRatingService.rateSortie).toHaveBeenCalledWith(
        userId,
        sortieId,
        createRatingDto,
      );
    });
  });

  describe('deleteRating', () => {
    it('should delete a rating', async () => {
      const sortieId = new Types.ObjectId().toString();
      const userId = new Types.ObjectId().toString();
      const req = { user: { userId } };

      mockRatingService.deleteRating.mockResolvedValue(undefined);

      await controller.deleteRating(sortieId, req);

      expect(mockRatingService.deleteRating).toHaveBeenCalledWith(
        userId,
        sortieId,
      );
    });
  });

  describe('getRatingsForSortie', () => {
    it('should return paginated ratings', async () => {
      const sortieId = new Types.ObjectId().toString();
      const mockResult = {
        ratings: [
          {
            _id: new Types.ObjectId(),
            userId: new Types.ObjectId(),
            sortieId: new Types.ObjectId(sortieId),
            stars: 5,
            comment: 'Excellent!',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockRatingService.getRatingsForSortie.mockResolvedValue(mockResult);

      const result = await controller.getRatingsForSortie(sortieId, 1, 10);

      expect(result.total).toBe(1);
      expect(result.ratings).toHaveLength(1);
      expect(mockRatingService.getRatingsForSortie).toHaveBeenCalledWith(
        sortieId,
        1,
        10,
      );
    });
  });

  describe('getCurrentUserRating', () => {
    it('should return user rating for sortie', async () => {
      const sortieId = new Types.ObjectId().toString();
      const userId = new Types.ObjectId().toString();
      const mockRating = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(userId),
        sortieId: new Types.ObjectId(sortieId),
        stars: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const req = { user: { userId } };

      mockRatingService.getUserRatingForSortie.mockResolvedValue(mockRating);

      const result = await controller.getCurrentUserRating(sortieId, req);

      expect(result).toBeDefined();
      expect(result?.stars).toBe(4);
      expect(mockRatingService.getUserRatingForSortie).toHaveBeenCalledWith(
        userId,
        sortieId,
      );
    });

    it('should return null if no rating exists', async () => {
      const sortieId = new Types.ObjectId().toString();
      const userId = new Types.ObjectId().toString();
      const req = { user: { userId } };

      mockRatingService.getUserRatingForSortie.mockResolvedValue(null);

      const result = await controller.getCurrentUserRating(sortieId, req);

      expect(result).toBeNull();
    });
  });

  describe('getCreatorRatingSummary', () => {
    it('should return creator rating summary', async () => {
      const userId = new Types.ObjectId().toString();
      const mockSummary = { average: 4.5, count: 20 };

      mockRatingService.getCreatorRatingSummary.mockResolvedValue(mockSummary);

      const result = await controller.getCreatorRatingSummary(userId);

      expect(result.average).toBe(4.5);
      expect(result.count).toBe(20);
      expect(mockRatingService.getCreatorRatingSummary).toHaveBeenCalledWith(
        userId,
      );
    });
  });
});
