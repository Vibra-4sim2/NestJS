import { PartialType } from '@nestjs/swagger';
import { CreatePreferencesDto } from './create-preference.dto';

export class UpdatePreferencesDto extends PartialType(CreatePreferencesDto) {}
