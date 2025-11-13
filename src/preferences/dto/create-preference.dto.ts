
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreatePreferencesDto {
  @IsOptional() @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const)
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

 
   // ---- VÉLO ----
  @IsOptional()
  @IsEnum(['VTT', 'ROUTE', 'GRAVEL', 'URBAIN', 'ELECTRIQUE'] as const)
  cyclingType?: 'VTT' | 'ROUTE' | 'GRAVEL' | 'URBAIN' | 'ELECTRIQUE';

  @IsOptional()
  @IsEnum(['QUOTIDIEN', 'HEBDO', 'WEEKEND', 'RARE'] as const)
  cyclingFrequency?: 'QUOTIDIEN' | 'HEBDO' | 'WEEKEND' | 'RARE';

  @IsOptional()
  @IsEnum(['<10', '10-30', '30-60', '>60'] as const)
  cyclingDistance?: '<10' | '10-30' | '30-60' | '>60';

  @IsOptional()
  @IsBoolean()
  cyclingGroupInterest?: boolean;

  // ---- RANDONNÉE ----
  @IsOptional()
  @IsEnum(['COURTE', 'MONTAGNE', 'LONGUE', 'TREKKING'] as const)
  hikeType?: 'COURTE' | 'MONTAGNE' | 'LONGUE' | 'TREKKING';

  @IsOptional()
  @IsEnum(['<2H', '2-4H', '4-8H', '>8H'] as const)
  hikeDuration?: '<2H' | '2-4H' | '4-8H' | '>8H';

  @IsOptional()
  @IsEnum(['GROUPE', 'SEUL'] as const)
  hikePreference?: 'GROUPE' | 'SEUL';

  // ---- CAMPING ----
  @IsOptional()
  @IsBoolean()
  campingPractice?: boolean;

  @IsOptional()
  @IsEnum(['TENTE', 'VAN', 'CAMPING-CAR', 'REFUGE', 'BIVOUAC'] as const)
  campingType?: 'TENTE' | 'VAN' | 'CAMPING-CAR' | 'REFUGE' | 'BIVOUAC';

  @IsOptional()
  @IsEnum(['1NUIT', 'WEEKEND', '3-5J', '>1SEMAINE'] as const)
  campingDuration?: '1NUIT' | 'WEEKEND' | '3-5J' | '>1SEMAINE';
}