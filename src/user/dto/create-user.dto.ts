import { Type } from 'class-transformer';
import { IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  firstName: string;

@IsString()
  lastName: string;
  @IsString()
  Gender: string;

  @IsEmail()
  email: string;


@IsDateString()
birthday?: string;
  
 
  @IsOptional()
  @IsString()
  avatar?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(['ADMIN', 'USER'] as any)
  role?: 'ADMIN' | 'USER';
}
