import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query,
  UploadedFile,
  UseInterceptors 
} from '@nestjs/common';
import { PublicationService } from './publication.service';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { 
  ApiBearerAuth, 
  ApiBody, 
  ApiConsumes, 
  ApiOkResponse, 
  ApiOperation, 
  ApiParam, 
  ApiQuery,
  ApiTags 
} from '@nestjs/swagger';

@ApiTags('publications')
@ApiBearerAuth('JWT')
@Controller('publication')
export class PublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  // @Post()
  // @ApiOperation({ summary: 'Create a publication' })
  // create(@Body() createPublicationDto: CreatePublicationDto) {
  //   return this.publicationService.create(createPublicationDto);
  // }
@Post()
@ApiConsumes('multipart/form-data')
@UseInterceptors(FileInterceptor('file'))
create(
  @UploadedFile() file: Express.Multer.File,
  @Body() createPublicationDto: CreatePublicationDto,
) {
  return this.publicationService.create(createPublicationDto, file);
}





  @Get()
  @ApiOperation({ summary: 'Get all publications' })
  findAll() {
    return this.publicationService.findAll();
  }

  @Get('feed')
  @ApiOperation({ summary: 'Get paginated feed' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getFeed(
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.publicationService.getFeed(
      page ? +page : 1,
      limit ? +limit : 10
    );
  }

  @Get('tag/:tag')
  @ApiOperation({ summary: 'Get publications by tag' })
  @ApiParam({ name: 'tag', type: 'string' })
  findByTag(@Param('tag') tag: string) {
    return this.publicationService.findByTag(tag);
  }

  @Get('author/:authorId')
  @ApiOperation({ summary: 'Get publications by author' })
  @ApiParam({ name: 'authorId', type: 'string' })
  findByAuthor(@Param('authorId') authorId: string) {
    return this.publicationService.findByAuthor(authorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one publication by id' })
  @ApiParam({ name: 'id', type: 'string' })
  findOne(@Param('id') id: string) {
    return this.publicationService.findOne(id);
  }

  @Post(':id/upload')
  @ApiOperation({ summary: 'Upload publication image' })
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
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return { message: 'No file uploaded' }; // L'upload n'est pas requis
    }
    return this.publicationService.setPublicationImage(id, file);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Like/Unlike a publication' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ 
    schema: { 
      type: 'object',
      properties: {
        userId: { type: 'string' }
      }
    }
  })
  likePublication(
    @Param('id') id: string,
    @Body('userId') userId: string
  ) {
    return this.publicationService.likePublication(id, userId);
  }

  @Post(':id/comment')
  @ApiOperation({ summary: 'Increment comments count' })
  @ApiParam({ name: 'id', type: 'string' })
  incrementComments(@Param('id') id: string) {
    return this.publicationService.incrementCommentsCount(id);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Increment shares count' })
  @ApiParam({ name: 'id', type: 'string' })
  incrementShares(@Param('id') id: string) {
    return this.publicationService.incrementSharesCount(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update publication' })
  @ApiParam({ name: 'id', type: 'string' })
  update(
    @Param('id') id: string,
    @Body() updatePublicationDto: UpdatePublicationDto
  ) {
    return this.publicationService.update(id, updatePublicationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete publication' })
  @ApiParam({ name: 'id', type: 'string' })
  remove(@Param('id') id: string) {
    return this.publicationService.remove(id);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Hard delete publication' })
  @ApiParam({ name: 'id', type: 'string' })
  hardRemove(@Param('id') id: string) {
    return this.publicationService.hardRemove(id);
  }
}