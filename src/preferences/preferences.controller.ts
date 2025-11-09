import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiBody
} from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';
import { CreatePreferencesDto } from './dto/create-preference.dto';

@ApiTags('preferences')
@ApiBearerAuth()
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly service: PreferencesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my preferences (404 if not created yet)' })
  @ApiOkResponse({
    description: 'Preferences found',
    schema: {
      example: {
        _id: '672abc1234567890fedcba02',
        user: '672abc1234567890fedcba01',
        level: 'BEGINNER',
        weeklyRideHours: 4,
        onboardingComplete: true,
        createdAt: '2025-11-09T10:00:00.000Z',
        updatedAt: '2025-11-09T10:00:00.000Z',
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Preferences not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async me(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    return this.service.getForUser(userId);
  }

  @Post('onboarding')
  @ApiOperation({ summary: 'Submit onboarding answers (create or update preferences)' })
  @ApiCreatedResponse({
    description: 'Preferences created or updated and onboardingComplete=true',
    schema: {
      example: {
        _id: '672abc1234567890fedcba02',
        user: '672abc1234567890fedcba01',
        level: 'BEGINNER',
        weeklyRideHours: 4,
        onboardingComplete: true,
        createdAt: '2025-11-09T10:00:00.000Z',
        updatedAt: '2025-11-09T10:00:00.000Z',
      }
    }
  })
  @ApiBody({
    description: 'Onboarding answers (all optional)',
    type: CreatePreferencesDto,
    examples: {
      sample: {
        summary: 'Beginner example',
        value: {
          level: 'BEGINNER',
          weeklyRideHours: 3
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async onboarding(@Req() req: any, @Body() dto: CreatePreferencesDto) {
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    return this.service.setOnboardingAnswers(userId, dto);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update my existing preferences' })
  @ApiOkResponse({
    description: 'Preferences updated',
    schema: {
      example: {
        _id: '672abc1234567890fedcba02',
        user: '672abc1234567890fedcba01',
        level: 'INTERMEDIATE',
        weeklyRideHours: 6,
        onboardingComplete: true,
        createdAt: '2025-11-09T10:00:00.000Z',
        updatedAt: '2025-11-09T11:20:00.000Z',
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Preferences not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBody({
    description: 'Fields to update (partial)',
    schema: {
      example: {
        level: 'INTERMEDIATE',
        weeklyRideHours: 6
      }
    }
  })
  async update(@Req() req: any, @Body() dto: Partial<CreatePreferencesDto>) {
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    return this.service.updateForUser(userId, dto);
  }
}