import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsDateString,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SortieType } from '../../enums/sortie-type.enum';
import { CreateCampingDto } from '../../camping/camping.dto';
import { ItineraireDto } from './itineraire.dto';

export class CreateSortieDto {
  @ApiProperty({ example: 'Randonnée au Mont Blanc', description: 'Titre de la sortie' })
  @IsString()
  titre: string;

  @ApiPropertyOptional({ example: 'Belle randonnée en montagne avec vue panoramique', description: 'Description détaillée' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2024-06-15T09:00:00Z', description: 'Date et heure de la sortie' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: SortieType, example: SortieType.RANDONNEE, description: 'Type de sortie' })
  @IsEnum(SortieType)
  type: SortieType;

  @ApiProperty({ example: false, description: 'Option camping activée ou non' })
  @IsBoolean()
  option_camping: boolean;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011', description: 'ID du camping existant' })
  @IsOptional()
  @IsString()
  campingId?: string;

  @ApiPropertyOptional({ description: 'Nouveau camping à créer' })
  @IsOptional()
  @Type(() => CreateCampingDto)
  camping?: CreateCampingDto;

  @ApiPropertyOptional({
    description: 'Itinéraire complet avec points de départ et arrivée',
    example: {
      pointDepart: {
        latitude: 45.8326,
        longitude: 6.8652,
        display_name: 'Chamonix-Mont-Blanc, Haute-Savoie, France',
        address: 'Chamonix, 74400, France'
      },
      pointArrivee: {
        latitude: 45.9237,
        longitude: 6.8694,
        display_name: 'Aiguille du Midi, Chamonix, France',
        address: 'Aiguille du Midi, 74400, France'
      },
      description: 'Itinéraire via le refuge du Plan de l\'Aiguille',
      distance: 12500,
      duree_estimee: 18000,
      geometry: [[6.8652, 45.8326], [6.8694, 45.9237]],
      instructions: ['Départ de Chamonix', 'Suivre le sentier GR5', 'Arrivée à l\'Aiguille du Midi']
    }
  })
@IsOptional()  // ✅ Add this line
@ValidateNested()
@Type(() => ItineraireDto)
itineraire?: ItineraireDto;  

  @ApiPropertyOptional({ example: 15, description: 'Capacité maximale de participants' })
  @IsOptional()
  @IsNumber()
  capacite?: number;

  @ApiProperty({ example: 'MOYEN', description: 'Difficulté de la sortie' })
  @IsNotEmpty()
  @IsString()
  difficulte: string;

  @ApiProperty({ example: 'INTERMEDIAIRE', description: 'Niveau requis pour la sortie' })
  @IsNotEmpty()
  @IsString()
  niveau: string;
 // ✅ ADD THIS (optional because file is uploaded separately)
  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...', description: 'URL de la photo de la sortie' })
  @IsOptional()
  @IsString()
  photo?: string;

}

export class UpdateSortieDto {
  @ApiPropertyOptional({ example: 'Randonnée au Mont Blanc - Modifiée' })
  @IsOptional()
  @IsString()
  titre?: string;

  @ApiPropertyOptional({ example: 'Description mise à jour' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2024-06-20T09:00:00Z' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: SortieType, example: SortieType.RANDONNEE })
  @IsOptional()
  @IsEnum(SortieType)
  type?: SortieType;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  option_camping?: boolean;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  campingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => CreateCampingDto)
  camping?: CreateCampingDto;

  @ApiPropertyOptional({
    description: 'Nouvel itinéraire',
    example: {
      pointDepart: {
        latitude: 45.8326,
        longitude: 6.8652
      },
      pointArrivee: {
        latitude: 45.9237,
        longitude: 6.8694
      },
      distance: 13000,
      duree_estimee: 19000
    }
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ItineraireDto)
  itineraire?: ItineraireDto;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  capacite?: number;

  @ApiProperty({ example: 'MOYEN', required: false })
  @IsOptional()
  @IsString()
  difficulte?: string;

  @ApiProperty({ example: 'INTERMEDIAIRE', required: false })
  @IsOptional()
  @IsString()
  niveau?: string;


    // ✅ ADD THIS
  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
  @IsOptional()
  @IsString()
  photo?: string;


}
