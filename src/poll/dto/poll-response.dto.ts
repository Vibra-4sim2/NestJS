import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PollOptionDto {
  @ApiProperty({
    description: 'Option ID',
    example: '507f1f77bcf86cd799439011',
  })
  optionId: string;

  @ApiProperty({
    description: 'Option text',
    example: 'Cafe A',
  })
  text: string;

  @ApiProperty({
    description: 'Number of votes',
    example: 5,
  })
  votes: number;
}

export class PollResponseDto {
  @ApiProperty({
    description: 'Poll ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Chat ID',
    example: '507f1f77bcf86cd799439012',
  })
  chatId: string;

  @ApiProperty({
    description: 'Creator user ID',
    example: '507f1f77bcf86cd799439013',
  })
  creatorId: string;

  @ApiProperty({
    description: 'Poll question',
    example: 'Where should we meet?',
  })
  question: string;

  @ApiProperty({
    description: 'Poll options with vote counts',
    type: [PollOptionDto],
  })
  options: PollOptionDto[];

  @ApiProperty({
    description: 'Allow multiple options',
    example: false,
  })
  allowMultiple: boolean;

  @ApiPropertyOptional({
    description: 'Poll expiration date',
    example: '2025-12-31T23:59:59.000Z',
  })
  closesAt: Date | null;

  @ApiProperty({
    description: 'Whether poll is closed',
    example: false,
  })
  closed: boolean;

  @ApiProperty({
    description: 'Option IDs current user voted for',
    type: [String],
    example: ['507f1f77bcf86cd799439011'],
  })
  userVotedOptionIds: string[];

  @ApiProperty({
    description: 'Total number of votes',
    example: 7,
  })
  totalVotes: number;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  updatedAt: Date;
}

export class PaginatedPollsResponseDto {
  @ApiProperty({
    description: 'Array of polls',
    type: [PollResponseDto],
  })
  polls: PollResponseDto[];

  @ApiProperty({
    description: 'Total count of polls',
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total pages',
    example: 5,
  })
  totalPages: number;
}
