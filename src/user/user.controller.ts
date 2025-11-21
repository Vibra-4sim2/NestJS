import { Controller, Get, Post, Body, Patch, Param, Delete, UploadedFile, UseInterceptors, UseGuards, Request, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth('JWT')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post()
  
  
  @ApiOperation({ summary: 'Create a user ' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

 @Post(':id/upload')
@ApiOperation({ summary: 'Upload user avatar to Cloudinary' })
@UseInterceptors(FileInterceptor('file'))
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      file: { type: 'string', format: 'binary' },
    },
  },
})
async uploadFile(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
) {
  if (!file) {
    return { message: 'No file uploaded' };
  }

  // We now send the file buffer to Cloudinary
  return this.userService.setUserImage(id, file);
}

  @Get(':id')

  @ApiOperation({ summary: 'Get one user by id' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ schema: { example: { _id: '67117a4a9f19a4f4b2f4be92', firstName: 'Alice', lastName: 'Doe', Gender: 'Female', email: 'alice@example.com', avatar: '', role: 'USER' } } })
  findOne(@Param('id') id: string) {
    return this.userService.findOneById(id);
  }

  @Get()

  @ApiOperation({ summary: 'Get all users' })
  @ApiOkResponse({ schema: { example: [{ _id: '67117a4a9f19a4f4b2f4be92', firstName: 'Alice', lastName: 'Doe', Gender: 'Female', email: 'alice@example.com', avatar: '', role: 'USER' }] } })
  findAll() {
    return this.userService.findAll();
  }

  @Patch(':id')
  
  
  @ApiOperation({ summary: 'Update user ' })
  @ApiParam({ name: 'id', type: 'string' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  

  @ApiOperation({ summary: 'Delete user ' })
  @ApiParam({ name: 'id', type: 'string' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  // ==================== FOLLOWERS ENDPOINTS ====================

  @Post(':userId/follow')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Follow a user' })
  @ApiParam({ name: 'userId', description: 'ID of the user to follow' })
  async followUser(@Param('userId') targetUserId: string, @Request() req: any) {
    const currentUserId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.userService.followUser(currentUserId, targetUserId);
  }

  @Delete(':userId/follow')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiParam({ name: 'userId', description: 'ID of the user to unfollow' })
  async unfollowUser(@Param('userId') targetUserId: string, @Request() req: any) {
    const currentUserId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.userService.unfollowUser(currentUserId, targetUserId);
  }

  @Get(':userId/followers')
  @ApiOperation({ summary: 'Get followers of a user' })
  @ApiParam({ name: 'userId', description: 'ID of the user' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async getFollowers(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.userService.getFollowers(userId, Number(page) || 1, Number(limit) || 20);
  }

  @Get(':userId/following')
  @ApiOperation({ summary: 'Get users that a user is following' })
  @ApiParam({ name: 'userId', description: 'ID of the user' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async getFollowing(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.userService.getFollowing(userId, Number(page) || 1, Number(limit) || 20);
  }

  @Get(':userId/follow-stats')
  @ApiOperation({ summary: 'Get follow statistics for a user' })
  @ApiParam({ name: 'userId', description: 'ID of the user' })
  async getFollowStats(@Param('userId') userId: string) {
    return this.userService.getFollowStats(userId);
  }

  @Get(':userId/is-following')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check if current user is following another user' })
  @ApiParam({ name: 'userId', description: 'ID of the user to check' })
  async isFollowing(@Param('userId') targetUserId: string, @Request() req: any) {
    const currentUserId = req.user?.sub || req.user?.userId || req.user?.id;
    const isFollowing = await this.userService.isFollowing(currentUserId, targetUserId);
    return { isFollowing };
  }

  @Get(':userId/mutual-followers')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get mutual followers (users who follow each other)' })
  @ApiParam({ name: 'userId', description: 'ID of the user' })
  async getMutualFollowers(@Param('userId') userId: string) {
    return this.userService.getMutualFollowers(userId);
  }

  @Get('suggestions/follow')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get follow suggestions based on popularity' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of suggestions' })
  async getFollowSuggestions(@Request() req: any, @Query('limit') limit?: number) {
    const currentUserId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.userService.getFollowSuggestions(currentUserId, Number(limit) || 10);
  }



}

