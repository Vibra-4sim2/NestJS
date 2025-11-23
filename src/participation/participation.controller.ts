import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ParticipationService } from './participation.service';
import { CreateParticipationDto } from './participation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParticipationStatus } from '../enums/participation-status.enum';
import { JWT } from 'google-auth-library/build/src/auth/jwtclient';

@ApiTags('Participations')
@Controller('participations')
export class ParticipationController {
  constructor(private readonly participationService: ParticipationService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create participation for a sortie' })
  @ApiBody({
    type: CreateParticipationDto,
    examples: {
      example1: {
        summary: 'Participate in camping sortie',
        value: {
          sortieId: '6709d45e1c9f4c123456789b',
        },
      },
      example2: {
        summary: 'Participate in bike ride',
        value: {
          sortieId: '6709d45e1c9f4c1234567890',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Participation created successfully',
    schema: {
      example: {
        _id: '6709d45e1c9f4c1234567891',
        userId: '6709d45e1c9f4c1234567892',
        sortieId: '6709d45e1c9f4c123456789b',
        status: 'EN_ATTENTE',
        createdAt: '2024-11-14T19:50:00Z',
        updatedAt: '2024-11-14T19:50:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Sortie at full capacity or invalid sortie ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT token required',
  })
  @ApiResponse({
    status: 409,
    description: 'User already participates in this sortie',
  })
  async create(
    @Body() createParticipationDto: CreateParticipationDto,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.participationService.create(createParticipationDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get participations for a sortie (Public)' })
  @ApiQuery({
    name: 'sortieId',
    description: 'Sortie ID to filter participations',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'List of participations for the sortie',
    schema: {
      example: [
        {
          _id: '6709d45e1c9f4c1234567891',
          userId: {
            _id: '6709d45e1c9f4c1234567892',
            name: 'John Doe',
            email: 'john@example.com',
          },
          sortieId: '6709d45e1c9f4c123456789b',
          status: 'EN_ATTENTE',
          createdAt: '2024-11-14T19:50:00Z',
          updatedAt: '2024-11-14T19:50:00Z',
        },
        {
          _id: '6709d45e1c9f4c1234567893',
          userId: {
            _id: '6709d45e1c9f4c1234567894',
            name: 'Jane Smith',
            email: 'jane@example.com',
          },
          sortieId: '6709d45e1c9f4c123456789b',
          status: 'ACCEPTEE',
          createdAt: '2024-11-14T19:52:00Z',
          updatedAt: '2024-11-14T19:55:00Z',
        },
      ],
    },
  })
  async findBySortie(@Query('sortieId') sortieId: string) {
    if (!sortieId) {
      throw new Error('sortieId query parameter is required');
    }
    return this.participationService.findBySortie(sortieId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get participation by ID (Public)' })
  @ApiParam({ name: 'id', description: 'Participation ID' })
  @ApiResponse({
    status: 200,
    description: 'Participation details',
    schema: {
      example: {
        _id: '6709d45e1c9f4c1234567891',
        userId: {
          _id: '6709d45e1c9f4c1234567892',
          name: 'John Doe',
          email: 'john@example.com',
        },
        sortieId: {
          _id: '6709d45e1c9f4c123456789b',
          titre: 'Weekend Camping Adventure',
          type: 'CAMPING',
        },
        status: 'EN_ATTENTE',
        createdAt: '2024-11-14T19:50:00Z',
        updatedAt: '2024-11-14T19:50:00Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Participation not found' })
  async findOne(@Param('id') id: string) {
    return this.participationService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Cancel participation (participant only)' })
  @ApiParam({ name: 'id', description: 'Participation ID' })
  @ApiResponse({ status: 200, description: 'Participation cancelled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - valid JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Only the participant can cancel their participation',
  })
  @ApiResponse({ status: 404, description: 'Participation not found' })
  async cancelParticipation(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    await this.participationService.cancelParticipation(id, userId);
    return { message: 'Participation cancelled successfully' };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update participation status (sortie creator only)' })
  @ApiParam({ name: 'id', description: 'Participation ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['EN_ATTENTE', 'ACCEPTEE', 'REFUSEE'],
          description: 'New participation status',
        },
      },
      required: ['status'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Participation status updated successfully. User automatically added/removed from chat.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - valid JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Only the sortie creator can update participation status',
  })
  @ApiResponse({ status: 404, description: 'Participation not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: ParticipationStatus,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.participationService.updateStatus(id, status, userId);
  }

  @Get('user/:userId')
@ApiOperation({ summary: 'Get participations for a user (Public)' })
@ApiParam({ name: 'userId', description: 'User ID' })
@ApiResponse({
  status: 200,
  description: 'List of participations for the user',
  schema: {
    example: [
      {
        _id: '6709d45e1c9f4c1234567891',
        userId: '6709d45e1c9f4c1234567892',
        sortieId: {
          _id: '6709d45e1c9f4c123456789b',
          titre: 'Weekend Camping Adventure',
          type: 'CAMPING',
        },
        status: 'ACCEPTEE',
        createdAt: '2024-11-14T19:50:00Z',
        updatedAt: '2024-11-14T19:55:00Z',
      },
    ],
  },
})
async findByUser(@Param('userId') userId: string) {
  return this.participationService.findByUser(userId);
}
}