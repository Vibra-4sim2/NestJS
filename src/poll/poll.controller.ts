import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PollService } from './poll.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { VoteDto } from './dto/vote.dto';
import { PollResponseDto, PaginatedPollsResponseDto } from './dto/poll-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Polls')
@ApiBearerAuth('JWT')
@Controller('polls')
@UseGuards(JwtAuthGuard)
export class PollController {
  constructor(private readonly pollService: PollService) {}

  /**
   * Create a new poll in a chat
   */
  @Post(':chatId')
  @ApiOperation({
    summary: 'Create a new poll',
    description: 'Creates a poll in a chat. Only chat members can create polls.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Poll created successfully',
    type: PollResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a member of the chat',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Chat not found',
  })
  async createPoll(
    @Param('chatId') chatId: string,
    @Request() req,
    @Body() createPollDto: CreatePollDto,
  ): Promise<PollResponseDto> {
    const userId = req.user.sub;
    return this.pollService.createPoll(chatId, userId, createPollDto);
  }

  /**
   * Create a new poll for a sortie (using sortieId)
   */
  @Post('sortie/:sortieId')
  @ApiOperation({
    summary: 'Create a new poll for a sortie',
    description: 'Creates a poll for a sortie using sortieId. Only sortie participants can create polls.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Poll created successfully',
    type: PollResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a member of the sortie',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Chat not found for this sortie',
  })
  async createPollForSortie(
    @Param('sortieId') sortieId: string,
    @Request() req,
    @Body() createPollDto: CreatePollDto,
  ): Promise<PollResponseDto> {
    const userId = req.user.sub;
    return this.pollService.createPollForSortie(sortieId, userId, createPollDto);
  }

  /**
   * Vote on a poll
   */
  @Post(':pollId/vote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vote on a poll',
    description:
      'Vote for one or more options. Previous votes by the same user are replaced. Only chat members can vote.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vote recorded successfully',
    type: PollResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Poll is closed, expired, or invalid options provided',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a member of the chat',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Poll not found',
  })
  async vote(
    @Param('pollId') pollId: string,
    @Request() req,
    @Body() voteDto: VoteDto,
  ): Promise<PollResponseDto> {
    const userId = req.user.sub;
    return this.pollService.vote(pollId, userId, voteDto);
  }

  /**
   * Close a poll (creator only)
   */
  @Patch(':pollId/close')
  @ApiOperation({
    summary: 'Close a poll',
    description: 'Close a poll to prevent further voting. Only the poll creator can close it.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Poll closed successfully',
    type: PollResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the poll creator can close it',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Poll not found',
  })
  async closePoll(@Param('pollId') pollId: string, @Request() req): Promise<PollResponseDto> {
    const userId = req.user.sub;
    return this.pollService.closePoll(pollId, userId);
  }

  /**
   * Get all polls for a chat
   */
  @Get('chat/:chatId')
  @ApiOperation({
    summary: 'Get all polls for a chat',
    description: 'Retrieve paginated list of polls in a chat. Only chat members can view polls.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Polls retrieved successfully',
    type: PaginatedPollsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a member of the chat',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Chat not found',
  })
  async getChatPolls(
    @Param('chatId') chatId: string,
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedPollsResponseDto> {
    const userId = req.user.sub;
    return this.pollService.getChatPolls(
      chatId,
      userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  /**
   * Get all polls for a sortie
   */
  @Get('sortie/:sortieId')
  @ApiOperation({
    summary: 'Get all polls for a sortie',
    description: 'Retrieve paginated list of polls for a sortie. Only sortie participants can view polls.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Polls retrieved successfully',
    type: PaginatedPollsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a sortie participant',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Chat not found for this sortie',
  })
  async getSortiePolls(
    @Param('sortieId') sortieId: string,
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedPollsResponseDto> {
    const userId = req.user.sub;
    return this.pollService.getSortiePolls(
      sortieId,
      userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  /**
   * Get a single poll by ID
   */
  @Get(':pollId')
  @ApiOperation({
    summary: 'Get poll by ID',
    description: 'Retrieve detailed information about a specific poll. Only chat members can view.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Poll retrieved successfully',
    type: PollResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a member of the chat',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Poll not found',
  })
  async getPoll(@Param('pollId') pollId: string, @Request() req): Promise<PollResponseDto> {
    const userId = req.user.sub;
    return this.pollService.getPoll(pollId, userId);
  }
}
