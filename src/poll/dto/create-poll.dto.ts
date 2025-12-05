import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePollDto {
  @ApiProperty({
    description: 'Poll question',
    example: 'Where should we meet?',
  })
  @IsString()
  question: string;

  @ApiProperty({
    description: 'Poll options (at least 2)',
    example: ['Cafe A', 'Park B', 'Library C'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(2)
  options: string[];

  @ApiPropertyOptional({
    description: 'Allow voting for multiple options',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowMultiple?: boolean;

  @ApiPropertyOptional({
    description: 'Poll expiration date (ISO 8601)',
    example: '2025-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  closesAt?: string;
}
