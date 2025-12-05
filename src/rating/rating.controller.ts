import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RatingService } from './rating.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import {
  RatingResponseDto,
  PaginatedRatingsResponseDto,
  RatingSummaryDto,
} from './dto/rating-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Ratings')
@Controller('ratings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post('sortie/:sortieId')
  @ApiOperation({
    summary: 'Rate a sortie (create or update rating)',
    description:
      'Users can rate a sortie they participated in. Creators cannot rate their own sorties. Only accepted participants can rate.',
  })
  @ApiParam({
    name: 'sortieId',
    description: 'ID of the sortie to rate',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 201,
    description: 'Rating created or updated successfully',
    type: RatingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input (sortieId, stars out of range)',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden (self-rating, not a participant, or not accepted)',
  })
  @ApiResponse({
    status: 404,
    description: 'Sortie not found',
  })
  async rateSortie(
    @Param('sortieId') sortieId: string,
    @Body() createRatingDto: CreateRatingDto,
    @Request() req,
  ): Promise<RatingResponseDto> {
    const userId = req.user.userId || req.user.sub;
    const rating = await this.ratingService.rateSortie(
      userId,
      sortieId,
      createRatingDto,
    );

    return {
      id: String(rating._id),
      userId: rating.userId.toString(),
      sortieId: rating.sortieId.toString(),
      stars: rating.stars,
      comment: rating.comment,
      createdAt: rating.createdAt,
      updatedAt: rating.updatedAt,
    };
  }

  @Delete('sortie/:sortieId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete your rating for a sortie',
    description:
      'Delete the current user rating for a specific sortie. Only accepted participants can delete their ratings.',
  })
  @ApiParam({
    name: 'sortieId',
    description: 'ID of the sortie',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 204,
    description: 'Rating deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid sortie ID',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (not a participant or not accepted)',
  })
  @ApiResponse({
    status: 404,
    description: 'Rating or sortie not found',
  })
  async deleteRating(
    @Param('sortieId') sortieId: string,
    @Request() req,
  ): Promise<void> {
    const userId = req.user.userId || req.user.sub;
    await this.ratingService.deleteRating(userId, sortieId);
  }

  @Get('sortie/:sortieId')
  @ApiOperation({
    summary: 'Get paginated ratings for a sortie',
    description: 'Retrieve all ratings for a specific sortie with pagination.',
  })
  @ApiParam({
    name: 'sortieId',
    description: 'ID of the sortie',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Ratings retrieved successfully',
    type: PaginatedRatingsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid sortie ID',
  })
  async getRatingsForSortie(
    @Param('sortieId') sortieId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<PaginatedRatingsResponseDto> {
    const result = await this.ratingService.getRatingsForSortie(
      sortieId,
      page || 1,
      limit || 10,
    );

    return {
      ratings: result.ratings.map((rating) => ({
        id: String(rating._id),
        userId: rating.userId.toString(),
        sortieId: rating.sortieId.toString(),
        stars: rating.stars,
        comment: rating.comment,
        createdAt: rating.createdAt,
        updatedAt: rating.updatedAt,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('sortie/:sortieId/me')
  @ApiOperation({
    summary: 'Get current user rating for a sortie',
    description: 'Retrieve the authenticated user rating for a specific sortie.',
  })
  @ApiParam({
    name: 'sortieId',
    description: 'ID of the sortie',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'User rating retrieved successfully',
    type: RatingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Rating not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid sortie ID',
  })
  async getCurrentUserRating(
    @Param('sortieId') sortieId: string,
    @Request() req,
  ): Promise<RatingResponseDto | null> {
    const userId = req.user.userId || req.user.sub;
    const rating = await this.ratingService.getUserRatingForSortie(
      userId,
      sortieId,
    );

    if (!rating) {
      return null;
    }

    return {
      id: String(rating._id),
      userId: rating.userId.toString(),
      sortieId: rating.sortieId.toString(),
      stars: rating.stars,
      comment: rating.comment,
      createdAt: rating.createdAt,
      updatedAt: rating.updatedAt,
    };
  }

  @Get('creator/:userId')
  @ApiOperation({
    summary: 'Get creator rating summary',
    description:
      'Retrieve the aggregated rating summary for all sorties created by a specific user.',
  })
  @ApiParam({
    name: 'userId',
    description: 'ID of the creator/user',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiResponse({
    status: 200,
    description: 'Creator rating summary retrieved successfully',
    type: RatingSummaryDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid user ID',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getCreatorRatingSummary(
    @Param('userId') userId: string,
  ): Promise<RatingSummaryDto> {
    return this.ratingService.getCreatorRatingSummary(userId);
  }

  @Post('recompute/creator/:userId')
  @ApiOperation({
    summary: 'Manually recompute creator rating summary',
    description: 'Force recomputation of creator rating summary (for debugging)',
  })
  async recomputeCreatorSummary(@Param('userId') userId: string) {
    await this.ratingService.recomputeCreatorRatingSummary(userId);
    return { message: 'Creator summary recomputed successfully' };
  }
}
