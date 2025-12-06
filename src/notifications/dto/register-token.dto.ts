import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class RegisterTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsEnum(['android', 'ios', 'web'])
  @IsOptional()
  platform?: 'android' | 'ios' | 'web';
}
