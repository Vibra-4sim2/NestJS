import { Controller, Get, Post, Body, Patch, Param, Delete, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

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



}
