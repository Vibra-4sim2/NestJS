import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateCampingDto {
  @IsString()
  nom: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  lieu: string;

  @IsOptional()
  @IsNumber()
  prix?: number;



  @IsOptional()
  @IsNumber()
  participants?: number;

  @IsDateString()
  dateDebut: string;

  @IsDateString()
  dateFin: string;
}

export class UpdateCampingDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  lieu?: string;

  @IsOptional()
  @IsNumber()
  prix?: number;

  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @IsOptional()
  @IsDateString()
  dateFin?: string;
}
