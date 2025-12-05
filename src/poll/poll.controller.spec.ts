import { Test, TestingModule } from '@nestjs/testing';
import { PollController } from './poll.controller';
import { PollService } from './poll.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { VoteDto } from './dto/vote.dto';
import { PollResponseDto } from './dto/poll-response.dto';

describe('PollController', () => {
  let controller: PollController;
  let service: PollService;

  const mockPollResponse: PollResponseDto = {
    _id: '507f1f77bcf86cd799439011',
    chatId: '507f1f77bcf86cd799439012',
    creatorId: '507f1f77bcf86cd799439013',
    question: 'Test question?',
    options: [
      { optionId: 'opt_1_0', text: 'Option A', votes: 0 },
      { optionId: 'opt_1_1', text: 'Option B', votes: 0 },
    ],
    allowMultiple: false,
    closesAt: null,
    closed: false,
    userVotedOptionIds: [],
    totalVotes: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest = {
    user: {
      userId: '507f1f77bcf86cd799439013',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PollController],
      providers: [
        {
          provide: PollService,
          useValue: {
            createPoll: jest.fn(),
            vote: jest.fn(),
            closePoll: jest.fn(),
            getChatPolls: jest.fn(),
            getPoll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PollController>(PollController);
    service = module.get<PollService>(PollService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPoll', () => {
    it('should create a poll', async () => {
      const chatId = '507f1f77bcf86cd799439012';
      const createPollDto: CreatePollDto = {
        question: 'Test question?',
        options: ['Option A', 'Option B'],
      };

      jest.spyOn(service, 'createPoll').mockResolvedValue(mockPollResponse);

      const result = await controller.createPoll(chatId, mockRequest, createPollDto);

      expect(service.createPoll).toHaveBeenCalledWith(
        chatId,
        mockRequest.user.userId,
        createPollDto,
      );
      expect(result).toEqual(mockPollResponse);
    });
  });

  describe('vote', () => {
    it('should record a vote', async () => {
      const pollId = '507f1f77bcf86cd799439011';
      const voteDto: VoteDto = {
        optionIds: ['opt_1_0'],
      };

      const voteResponse = {
        ...mockPollResponse,
        userVotedOptionIds: ['opt_1_0'],
        options: [
          { optionId: 'opt_1_0', text: 'Option A', votes: 1 },
          { optionId: 'opt_1_1', text: 'Option B', votes: 0 },
        ],
        totalVotes: 1,
      };

      jest.spyOn(service, 'vote').mockResolvedValue(voteResponse);

      const result = await controller.vote(pollId, mockRequest, voteDto);

      expect(service.vote).toHaveBeenCalledWith(pollId, mockRequest.user.userId, voteDto);
      expect(result).toEqual(voteResponse);
    });
  });

  describe('closePoll', () => {
    it('should close a poll', async () => {
      const pollId = '507f1f77bcf86cd799439011';
      const closedResponse = {
        ...mockPollResponse,
        closed: true,
      };

      jest.spyOn(service, 'closePoll').mockResolvedValue(closedResponse);

      const result = await controller.closePoll(pollId, mockRequest);

      expect(service.closePoll).toHaveBeenCalledWith(pollId, mockRequest.user.userId);
      expect(result).toEqual(closedResponse);
    });
  });

  describe('getChatPolls', () => {
    it('should return paginated polls', async () => {
      const chatId = '507f1f77bcf86cd799439012';
      const paginatedResponse = {
        polls: [mockPollResponse],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      jest.spyOn(service, 'getChatPolls').mockResolvedValue(paginatedResponse);

      const result = await controller.getChatPolls(chatId, mockRequest, 1, 10);

      expect(service.getChatPolls).toHaveBeenCalledWith(chatId, mockRequest.user.userId, 1, 10);
      expect(result).toEqual(paginatedResponse);
    });

    it('should use default pagination values', async () => {
      const chatId = '507f1f77bcf86cd799439012';
      const paginatedResponse = {
        polls: [mockPollResponse],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      jest.spyOn(service, 'getChatPolls').mockResolvedValue(paginatedResponse);

      const result = await controller.getChatPolls(chatId, mockRequest);

      expect(service.getChatPolls).toHaveBeenCalledWith(chatId, mockRequest.user.userId, 1, 10);
      expect(result).toEqual(paginatedResponse);
    });
  });

  describe('getPoll', () => {
    it('should return a single poll', async () => {
      const pollId = '507f1f77bcf86cd799439011';

      jest.spyOn(service, 'getPoll').mockResolvedValue(mockPollResponse);

      const result = await controller.getPoll(pollId, mockRequest);

      expect(service.getPoll).toHaveBeenCalledWith(pollId, mockRequest.user.userId);
      expect(result).toEqual(mockPollResponse);
    });
  });
});
