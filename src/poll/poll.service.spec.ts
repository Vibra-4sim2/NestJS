import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PollService } from './poll.service';
import { Poll, PollDocument } from './entities/poll.schema';
import { ChatService } from '../chat/chat.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { VoteDto } from './dto/vote.dto';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('PollService', () => {
  let service: PollService;
  let pollModel: Model<PollDocument>;
  let chatService: ChatService;

  const mockChatId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockCreatorId = new Types.ObjectId();
  const mockPollId = new Types.ObjectId();

  const mockChat = {
    _id: mockChatId,
    sortieId: new Types.ObjectId(),
    members: [mockCreatorId, mockUserId],
  };

  const mockPoll = {
    _id: mockPollId,
    chatId: mockChatId,
    creatorId: mockCreatorId,
    question: 'Test question?',
    options: [
      { optionId: 'opt_1_0', text: 'Option A', votes: 0 },
      { optionId: 'opt_1_1', text: 'Option B', votes: 0 },
    ],
    votes: [],
    allowMultiple: false,
    closesAt: null,
    closed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PollService,
        {
          provide: getModelToken(Poll.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockPoll),
            constructor: jest.fn().mockResolvedValue(mockPoll),
            find: jest.fn(),
            findById: jest.fn(),
            countDocuments: jest.fn(),
            create: jest.fn(),
            exec: jest.fn(),
          },
        },
        {
          provide: ChatService,
          useValue: {
            getChatById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PollService>(PollService);
    pollModel = module.get<Model<PollDocument>>(getModelToken(Poll.name));
    chatService = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPoll', () => {
    it('should create a poll successfully', async () => {
      const createPollDto: CreatePollDto = {
        question: 'Test question?',
        options: ['Option A', 'Option B'],
        allowMultiple: false,
      };

      jest.spyOn(chatService, 'getChatById').mockResolvedValue(mockChat as any);

      const saveMock = jest.fn().mockResolvedValue({
        ...mockPoll,
        _id: mockPollId,
      });

      jest.spyOn(pollModel, 'prototype' as any).save = saveMock;
      (pollModel as any).mockImplementation(() => ({
        save: saveMock,
      }));

      // Mock the constructor
      const pollInstance = {
        ...mockPoll,
        save: saveMock,
      };
      (pollModel as any) = jest.fn(() => pollInstance);

      const result = await service.createPoll(mockChatId, mockCreatorId, createPollDto);

      expect(chatService.getChatById).toHaveBeenCalledWith(mockChatId);
      expect(result).toBeDefined();
      expect(result.question).toBe(createPollDto.question);
    });

    it('should throw ForbiddenException if user is not a chat member', async () => {
      const createPollDto: CreatePollDto = {
        question: 'Test question?',
        options: ['Option A', 'Option B'],
      };

      const chatWithoutUser = {
        ...mockChat,
        members: [new Types.ObjectId()],
      };

      jest.spyOn(chatService, 'getChatById').mockResolvedValue(chatWithoutUser as any);

      await expect(service.createPoll(mockChatId, mockUserId, createPollDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('vote', () => {
    it('should record a vote successfully', async () => {
      const voteDto: VoteDto = {
        optionIds: ['opt_1_0'],
      };

      const pollWithVote = {
        ...mockPoll,
        votes: [{ userId: mockUserId, optionId: 'opt_1_0', votedAt: new Date() }],
        options: [
          { optionId: 'opt_1_0', text: 'Option A', votes: 1 },
          { optionId: 'opt_1_1', text: 'Option B', votes: 0 },
        ],
      };

      jest.spyOn(pollModel, 'findById').mockResolvedValue(pollWithVote as any);
      jest.spyOn(chatService, 'getChatById').mockResolvedValue(mockChat as any);

      const result = await service.vote(mockPollId, mockUserId, voteDto);

      expect(pollModel.findById).toHaveBeenCalledWith(mockPollId);
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if poll not found', async () => {
      const voteDto: VoteDto = {
        optionIds: ['opt_1_0'],
      };

      jest.spyOn(pollModel, 'findById').mockResolvedValue(null);

      await expect(service.vote(mockPollId, mockUserId, voteDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if poll is closed', async () => {
      const voteDto: VoteDto = {
        optionIds: ['opt_1_0'],
      };

      const closedPoll = {
        ...mockPoll,
        closed: true,
      };

      jest.spyOn(pollModel, 'findById').mockResolvedValue(closedPoll as any);
      jest.spyOn(chatService, 'getChatById').mockResolvedValue(mockChat as any);

      await expect(service.vote(mockPollId, mockUserId, voteDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid option IDs', async () => {
      const voteDto: VoteDto = {
        optionIds: ['invalid_option'],
      };

      jest.spyOn(pollModel, 'findById').mockResolvedValue(mockPoll as any);
      jest.spyOn(chatService, 'getChatById').mockResolvedValue(mockChat as any);

      await expect(service.vote(mockPollId, mockUserId, voteDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for multiple votes when not allowed', async () => {
      const voteDto: VoteDto = {
        optionIds: ['opt_1_0', 'opt_1_1'],
      };

      jest.spyOn(pollModel, 'findById').mockResolvedValue(mockPoll as any);
      jest.spyOn(chatService, 'getChatById').mockResolvedValue(mockChat as any);

      await expect(service.vote(mockPollId, mockUserId, voteDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('closePoll', () => {
    it('should close poll successfully when called by creator', async () => {
      const pollToClose = {
        ...mockPoll,
        save: jest.fn().mockResolvedValue({ ...mockPoll, closed: true }),
      };

      jest.spyOn(pollModel, 'findById').mockResolvedValue(pollToClose as any);

      const result = await service.closePoll(mockPollId, mockCreatorId);

      expect(pollModel.findById).toHaveBeenCalledWith(mockPollId);
      expect(result.closed).toBe(true);
    });

    it('should throw ForbiddenException when non-creator tries to close', async () => {
      jest.spyOn(pollModel, 'findById').mockResolvedValue(mockPoll as any);

      await expect(service.closePoll(mockPollId, mockUserId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if poll already closed', async () => {
      const closedPoll = {
        ...mockPoll,
        closed: true,
      };

      jest.spyOn(pollModel, 'findById').mockResolvedValue(closedPoll as any);

      await expect(service.closePoll(mockPollId, mockCreatorId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getChatPolls', () => {
    it('should return paginated polls', async () => {
      const mockPolls = [mockPoll];

      jest.spyOn(chatService, 'getChatById').mockResolvedValue(mockChat as any);
      jest.spyOn(pollModel, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockPolls),
            }),
          }),
        }),
      } as any);
      jest.spyOn(pollModel, 'countDocuments').mockResolvedValue(1);

      const result = await service.getChatPolls(mockChatId, mockUserId, 1, 10);

      expect(result).toBeDefined();
      expect(result.polls).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should throw ForbiddenException if user is not a member', async () => {
      const chatWithoutUser = {
        ...mockChat,
        members: [new Types.ObjectId()],
      };

      jest.spyOn(chatService, 'getChatById').mockResolvedValue(chatWithoutUser as any);

      await expect(service.getChatPolls(mockChatId, mockUserId, 1, 10)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getPoll', () => {
    it('should return poll details', async () => {
      jest.spyOn(pollModel, 'findById').mockResolvedValue(mockPoll as any);
      jest.spyOn(chatService, 'getChatById').mockResolvedValue(mockChat as any);

      const result = await service.getPoll(mockPollId, mockUserId);

      expect(result).toBeDefined();
      expect(result._id).toBe(String(mockPollId));
    });

    it('should throw NotFoundException if poll not found', async () => {
      jest.spyOn(pollModel, 'findById').mockResolvedValue(null);

      await expect(service.getPoll(mockPollId, mockUserId)).rejects.toThrow(NotFoundException);
    });
  });
});
