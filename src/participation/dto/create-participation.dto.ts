import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ParticipationStatus } from '../../enums/participation-status.enum';

export class CreateParticipationDto {
  @IsString()
  sortieId: string;

  @IsOptional()
  @IsEnum(ParticipationStatus)
  status?: ParticipationStatus;
}
