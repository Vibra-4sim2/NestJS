import { Body, Controller, Get, Patch, Post, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBody
} from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';
import { CreatePreferencesDto } from './dto/create-preference.dto';

@ApiTags('preferences')
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Get preferences for a user' })
  @ApiOkResponse({ description: 'Preferences found' })
  @ApiNotFoundResponse({ description: 'Preferences not found' })
  async getByUserId(@Param('userId') userId: string) {
    return this.preferencesService.getForUser(userId);
  }

  @Post(':userId/onboarding')
  @ApiOperation({ summary: 'Submit onboarding answers (create or update preferences)' })
  @ApiCreatedResponse({
    description: 'Preferences created or updated and onboardingComplete=true',
  })
  @ApiBody({
    description: 'Onboarding answers (all optional)',
    type: CreatePreferencesDto,
  })
  async onboarding(@Param('userId') userId: string, @Body() dto: CreatePreferencesDto) {
    return this.preferencesService.setOnboardingAnswers(userId, dto);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update preferences for a user' })
  @ApiOkResponse({ description: 'Preferences updated' })
  @ApiNotFoundResponse({ description: 'Preferences not found' })
  async update(@Param('userId') userId: string, @Body() dto: Partial<CreatePreferencesDto>) {
    return this.preferencesService.updateForUser(userId, dto);
  }

  @Post(':userId')
  async createPreferences(@Param('userId') userId: string, @Body() dto: CreatePreferencesDto) {
    return this.preferencesService.createForUser(userId, dto);
  }
}
