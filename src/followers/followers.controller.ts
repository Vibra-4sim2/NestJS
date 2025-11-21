import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FollowersService } from './followers.service';

@ApiTags('followers')
@ApiBearerAuth('JWT')
@Controller('followers')
@UseGuards(JwtAuthGuard)
export class FollowersController {
  constructor(private readonly followersService: FollowersService) {}

  @Post('follow/:userId')
  @ApiOperation({ summary: 'Follow a user' })
  async followUser(@Param('userId') userId: string, @Request() req: any) {
    const currentUserId = req.user?.userId || req.user?.sub || req.user?.id;
    return this.followersService.followUser(currentUserId, userId);
  }

  @Delete('unfollow/:userId')
  @ApiOperation({ summary: 'Unfollow a user' })
  async unfollowUser(@Param('userId') userId: string, @Request() req: any) {
    const currentUserId = req.user?.userId || req.user?.sub || req.user?.id;
    return this.followersService.unfollowUser(currentUserId, userId);
  }

  @Get('followers/:userId')
  @ApiOperation({ summary: 'Get followers of a user' })
  async getFollowers(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.followersService.getFollowers(userId, Number(page), Number(limit));
  }

  @Get('following/:userId')
  @ApiOperation({ summary: 'Get users that a user is following' })
  async getFollowing(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.followersService.getFollowing(userId, Number(page), Number(limit));
  }

  @Get('stats/:userId')
  @ApiOperation({ summary: 'Get follower statistics for a user' })
  async getFollowStats(@Param('userId') userId: string) {
    return this.followersService.getFollowStats(userId);
  }

  @Get('is-following/:userId')
  @ApiOperation({ summary: 'Check if current user is following another user' })
  async isFollowing(@Param('userId') userId: string, @Request() req: any) {
    const currentUserId = req.user?.userId || req.user?.sub || req.user?.id;
    const isFollowing = await this.followersService.isFollowing(currentUserId, userId);
    return { isFollowing };
  }
}
