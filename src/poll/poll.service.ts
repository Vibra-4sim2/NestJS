import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Poll, PollDocument } from './entities/poll.schema';
import { CreatePollDto } from './dto/create-poll.dto';
import { VoteDto } from './dto/vote.dto';
import { PollResponseDto, PaginatedPollsResponseDto } from './dto/poll-response.dto';
import { ChatService } from '../chat/chat.service';

/**
 * PollService
 * Handles all poll-related operations including creation, voting, closing, and queries
 */
@Injectable()
export class PollService {
  private readonly logger = new Logger(PollService.name);

  constructor(
    @InjectModel(Poll.name) private pollModel: Model<PollDocument>,
    private chatService: ChatService,
  ) {}

  /**
   * Create a new poll in a chat
   * @param chatId - The ID of the chat
   * @param creatorId - The ID of the user creating the poll
   * @param createPollDto - Poll creation data
   * @returns The created poll
   */
  async createPoll(
    chatId: string | Types.ObjectId,
    creatorId: string | Types.ObjectId,
    createPollDto: CreatePollDto,
  ): Promise<PollResponseDto> {
    try {
      const chatObjectId = new Types.ObjectId(chatId);
      const creatorObjectId = new Types.ObjectId(creatorId);

      // Verify chat exists and user is a member
      const chat = await this.chatService.getChatById(chatObjectId);
      const isMember = chat.members.some((member) => member.equals(creatorObjectId));

      if (!isMember) {
        throw new ForbiddenException('You must be a chat member to create polls');
      }

      // Generate unique option IDs and format options
      const options = createPollDto.options.map((text, index) => ({
        optionId: `opt_${Date.now()}_${index}`,
        text,
        votes: 0,
      }));

      // Create poll document
      const poll = new this.pollModel({
        chatId: chatObjectId,
        creatorId: creatorObjectId,
        question: createPollDto.question,
        options,
        allowMultiple: createPollDto.allowMultiple ?? false,
        closesAt: createPollDto.closesAt ? new Date(createPollDto.closesAt) : null,
        votes: [],
        closed: false,
      });

      const savedPoll = await poll.save();
      this.logger.log(`Poll created: ${savedPoll._id} by user ${creatorId} in chat ${chatId}`);

      return this.formatPollResponse(savedPoll, creatorObjectId);
    } catch (error) {
      this.logger.error(`Error creating poll: ${error.message}`);
      throw error;
    }
  }

  /**
   * Vote on a poll
   * @param pollId - The ID of the poll
   * @param userId - The ID of the user voting
   * @param voteDto - Vote data with option IDs
   * @returns The updated poll
   */
  async vote(
    pollId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    voteDto: VoteDto,
  ): Promise<PollResponseDto> {
    try {
      const pollObjectId = new Types.ObjectId(pollId);
      const userObjectId = new Types.ObjectId(userId);

      const poll = await this.pollModel.findById(pollObjectId);
      if (!poll) {
        throw new NotFoundException('Poll not found');
      }

      // Verify chat membership
      const chat = await this.chatService.getChatById(poll.chatId);
      const isMember = chat.members.some((member) => member.equals(userObjectId));
      if (!isMember) {
        throw new ForbiddenException('You must be a chat member to vote');
      }

      // Check if poll is closed
      if (poll.closed) {
        throw new BadRequestException('Poll is closed');
      }

      // Check if poll has expired
      if (poll.closesAt && new Date() > poll.closesAt) {
        poll.closed = true;
        await poll.save();
        throw new BadRequestException('Poll has expired');
      }

      // Validate option IDs
      const validOptionIds = poll.options.map((opt) => opt.optionId);
      const invalidOptions = voteDto.optionIds.filter((id) => !validOptionIds.includes(id));
      if (invalidOptions.length > 0) {
        throw new BadRequestException(`Invalid option IDs: ${invalidOptions.join(', ')}`);
      }

      // Validate multiple votes
      if (!poll.allowMultiple && voteDto.optionIds.length > 1) {
        throw new BadRequestException('This poll does not allow voting for multiple options');
      }

      // Remove previous votes by this user
      const previousVotes = poll.votes.filter((vote) => vote.userId.equals(userObjectId));
      poll.votes = poll.votes.filter((vote) => !vote.userId.equals(userObjectId));

      // Decrease vote counts for previous votes
      previousVotes.forEach((prevVote) => {
        const option = poll.options.find((opt) => opt.optionId === prevVote.optionId);
        if (option) {
          option.votes = Math.max(0, option.votes - 1);
        }
      });

      // Add new votes
      const now = new Date();
      voteDto.optionIds.forEach((optionId) => {
        poll.votes.push({
          userId: userObjectId,
          optionId,
          votedAt: now,
        });

        // Increase vote count
        const option = poll.options.find((opt) => opt.optionId === optionId);
        if (option) {
          option.votes += 1;
        }
      });

      const updatedPoll = await poll.save();
      this.logger.log(`User ${userId} voted on poll ${pollId}: ${voteDto.optionIds.join(', ')}`);

      return this.formatPollResponse(updatedPoll, userObjectId);
    } catch (error) {
      this.logger.error(`Error voting on poll ${pollId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Close a poll (only creator can close)
   * @param pollId - The ID of the poll
   * @param userId - The ID of the user attempting to close
   * @returns The updated poll
   */
  async closePoll(
    pollId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<PollResponseDto> {
    try {
      const pollObjectId = new Types.ObjectId(pollId);
      const userObjectId = new Types.ObjectId(userId);

      const poll = await this.pollModel.findById(pollObjectId);
      if (!poll) {
        throw new NotFoundException('Poll not found');
      }

      // Only creator can close the poll
      if (!poll.creatorId.equals(userObjectId)) {
        throw new ForbiddenException('Only the poll creator can close it');
      }

      if (poll.closed) {
        throw new BadRequestException('Poll is already closed');
      }

      poll.closed = true;
      const updatedPoll = await poll.save();

      this.logger.log(`Poll ${pollId} closed by creator ${userId}`);
      return this.formatPollResponse(updatedPoll, userObjectId);
    } catch (error) {
      this.logger.error(`Error closing poll ${pollId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get polls for a chat with pagination
   * @param chatId - The ID of the chat
   * @param userId - The ID of the user requesting
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Paginated polls
   */
  async getChatPolls(
    chatId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    page = 1,
    limit = 10,
  ): Promise<PaginatedPollsResponseDto> {
    try {
      const chatObjectId = new Types.ObjectId(chatId);
      const userObjectId = new Types.ObjectId(userId);

      // Verify chat membership
      const chat = await this.chatService.getChatById(chatObjectId);
      const isMember = chat.members.some((member) => member.equals(userObjectId));
      if (!isMember) {
        throw new ForbiddenException('You must be a chat member to view polls');
      }

      const skip = (page - 1) * limit;

      const [polls, total] = await Promise.all([
        this.pollModel
          .find({ chatId: chatObjectId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.pollModel.countDocuments({ chatId: chatObjectId }),
      ]);

      const pollResponses = polls.map((poll) => this.formatPollResponse(poll, userObjectId));

      return {
        polls: pollResponses,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Error fetching polls for chat ${chatId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a single poll by ID
   * @param pollId - The ID of the poll
   * @param userId - The ID of the user requesting
   * @returns The poll details
   */
  async getPoll(
    pollId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<PollResponseDto> {
    try {
      const pollObjectId = new Types.ObjectId(pollId);
      const userObjectId = new Types.ObjectId(userId);

      const poll = await this.pollModel.findById(pollObjectId);
      if (!poll) {
        throw new NotFoundException('Poll not found');
      }

      // Verify chat membership
      const chat = await this.chatService.getChatById(poll.chatId);
      const isMember = chat.members.some((member) => member.equals(userObjectId));
      if (!isMember) {
        throw new ForbiddenException('You must be a chat member to view this poll');
      }

      return this.formatPollResponse(poll, userObjectId);
    } catch (error) {
      this.logger.error(`Error fetching poll ${pollId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format a poll document to response DTO
   * @param poll - The poll document
   * @param userId - The current user's ID
   * @returns Formatted poll response
   */
  private formatPollResponse(poll: PollDocument, userId: Types.ObjectId): PollResponseDto {
    const userVotedOptionIds = poll.votes
      .filter((vote) => vote.userId.equals(userId))
      .map((vote) => vote.optionId);

    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

    return {
      _id: String(poll._id),
      chatId: String(poll.chatId),
      creatorId: String(poll.creatorId),
      question: poll.question,
      options: poll.options.map((opt) => ({
        optionId: opt.optionId,
        text: opt.text,
        votes: opt.votes,
      })),
      allowMultiple: poll.allowMultiple,
      closesAt: poll.closesAt,
      closed: poll.closed,
      userVotedOptionIds,
      totalVotes,
      createdAt: poll.createdAt,
      updatedAt: poll.updatedAt,
    };
  }
}
