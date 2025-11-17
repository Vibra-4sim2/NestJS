import { IsString, IsOptional, ValidateNested, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CoordonneesDto } from './coordonnees.dto';

export class ItineraireDto {
  @ApiProperty({ 
    description: 'Point de départ',
    type: CoordonneesDto,
    example: {
      latitude: 45.8326,
      longitude: 6.8652,
      display_name: 'Chamonix-Mont-Blanc, France',
      address: 'Chamonix, 74400, France'
    }
  })
  @ValidateNested()
  @Type(() => CoordonneesDto)
  pointDepart: CoordonneesDto;

  @ApiProperty({ 
    description: 'Point d\'arrivée',
    type: CoordonneesDto,
    example: {
      latitude: 45.9237,
      longitude: 6.8694,
      display_name: 'Aiguille du Midi, France',
      address: 'Aiguille du Midi, 74400, France'
    }
  })
  @ValidateNested()
  @Type(() => CoordonneesDto)
  pointArrivee: CoordonneesDto;

  @ApiPropertyOptional({ example: 'Itinéraire via le refuge du Plan de l\'Aiguille', description: 'Description de l\'itinéraire' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 12500, description: 'Distance totale en mètres' })
  @IsOptional()
  @IsNumber()
  distance?: number;

  @ApiPropertyOptional({ example: 18000, description: 'Durée estimée en secondes (5 heures = 18000 secondes)' })
  @IsOptional()
  @IsNumber()
  duree_estimee?: number;

  @ApiPropertyOptional({ 
    example: [[6.8652, 45.8326], [6.8700, 45.8400], [6.8694, 45.9237]], 
    description: 'Tracé complet de l\'itinéraire (array de [longitude, latitude])',
    isArray: true
  })
  @IsOptional()
  @IsArray()
  geometry?: number[][];

  @ApiPropertyOptional({ 
    example: [
      'Départ de Chamonix centre-ville',
      'Prendre le téléphérique du Plan de l\'Aiguille',
      'Suivre le sentier GR5 direction nord',
      'Traverser le glacier',
      'Arrivée à l\'Aiguille du Midi'
    ],
    description: 'Instructions étape par étape',
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instructions?: string[];
}
