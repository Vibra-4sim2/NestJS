import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsMongoId } from 'class-validator';

export class CreatePublicationDto {
  @ApiProperty({
    description: 'ID of the user creating the publication (must be a valid MongoDB ObjectId)',
    example: '690fdf18e5677cd4e2a25718',
  })
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  author: string;

  @ApiProperty({
    description: 'Content of the publication',
    example: 'Just completed a 45km ride through the mountains!',
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Optional image file to upload',
  })
  file?: any;

  @ApiPropertyOptional({
    description: 'Comma-separated list of tags',
    example: 'cycling,mountains,fitness',
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated list of user IDs to mention (must be valid MongoDB ObjectIds)',
    example: '691070947ac00a5c80de9495,690fdf18e5677cd4e2a25718',
  })
  @IsOptional()
  @IsString()
  mentions?: string;

  @ApiPropertyOptional({
    description: 'Location of the publication',
    example: 'Tunis, Tunisia',
  })
  @IsOptional()
  @IsString()
  location?: string;
}