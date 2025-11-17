import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({ description: 'ID token received from Google after client login' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}