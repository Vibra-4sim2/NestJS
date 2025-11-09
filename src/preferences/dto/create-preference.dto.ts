
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreatePreferencesDto {
  @IsOptional() @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const)
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @IsOptional() @IsInt() @Min(0) @Max(100)
  weeklyRideHours?: number;
}