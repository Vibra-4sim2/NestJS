import { IsNumber, Min, Max, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CoordonneesDto {
  @ApiProperty({ example: 45.8326, description: 'Latitude (entre -90 et 90)', minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 6.8652, description: 'Longitude (entre -180 et 180)', minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: 'Chamonix-Mont-Blanc, Haute-Savoie, Auvergne-Rhône-Alpes, France', description: 'Nom complet du lieu (fourni par OSM)' })
  @IsOptional()
  @IsString()
  display_name?: string;

  @ApiPropertyOptional({ example: 'Chamonix, 74400, France', description: 'Adresse simplifiée' })
  @IsOptional()
  @IsString()
  address?: string;
}
