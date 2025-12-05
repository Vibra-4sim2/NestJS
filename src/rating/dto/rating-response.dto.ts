import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RatingSummaryDto {
  @ApiProperty({
    description: 'Average rating',
    example: 4.2,
  })
  average: number;

  @ApiProperty({
    description: 'Number of ratings',
    example: 15,
  })
  count: number;
}

export class RatingResponseDto {
  @ApiProperty({
    description: 'Rating ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'User ID who rated',
    example: '507f1f77bcf86cd799439012',
  })
  userId: string;

  @ApiProperty({
    description: 'Sortie ID that was rated',
    example: '507f1f77bcf86cd799439013',
  })
  sortieId: string;

  @ApiProperty({
    description: 'Rating stars (1-5)',
    example: 4,
  })
  stars: number;

  @ApiPropertyOptional({
    description: 'Optional comment for the rating',
    example: 'Great experience!',
  })
  comment?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-12-05T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-12-05T10:30:00.000Z',
  })
  updatedAt: Date;
}

export class PaginatedRatingsResponseDto {
  @ApiProperty({
    description: 'Array of ratings',
    type: [RatingResponseDto],
  })
  ratings: RatingResponseDto[];

  @ApiProperty({
    description: 'Total count of ratings',
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
