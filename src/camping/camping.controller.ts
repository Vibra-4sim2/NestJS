import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CampingService } from './camping.service';
import { CreateCampingDto, UpdateCampingDto } from './camping.dto';

@ApiTags('Campings')
@Controller('campings')
export class CampingController {
  constructor(private readonly campingService: CampingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new camping' })
  @ApiBody({
    type: CreateCampingDto,
    examples: {
      example1: {
        summary: 'Mountain Camping',
        value: {
          nom: 'Camping Mont Blanc',
          description: 'Beautiful mountain camping site with stunning views',
          lieu: 'Chamonix, France',
          prix: 45.5,
          dateDebut: '2024-06-01T09:00:00Z',
          dateFin: '2024-06-30T17:00:00Z',
        },
      },
      example2: {
        summary: 'Lake Camping',
        value: {
          nom: 'Camping Lac Léman',
          description: 'Lakeside camping with water activities',
          lieu: 'Geneva, Switzerland',
          prix: 55,
          dateDebut: '2024-07-15T08:00:00Z',
          dateFin: '2024-07-25T18:00:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Camping created successfully',
    schema: {
      example: {
        _id: '6709d45e1c9f4c123456789a',
        nom: 'Camping Mont Blanc',
        description: 'Beautiful mountain camping site with stunning views',
        lieu: 'Chamonix, France',
        prix: 45.5,
        dateDebut: '2024-06-01T09:00:00Z',
        dateFin: '2024-06-30T17:00:00Z',
        sorties: [],
        createdAt: '2024-11-14T19:30:00Z',
        updatedAt: '2024-11-14T19:30:00Z',
      },
    },
  })
  async create(@Body() createCampingDto: CreateCampingDto) {
    return this.campingService.create(createCampingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all campings' })
  @ApiResponse({
    status: 200,
    description: 'List of all campings',
    schema: {
      example: [
        {
          _id: '6709d45e1c9f4c123456789a',
          nom: 'Camping Mont Blanc',
          description: 'Beautiful mountain camping site',
          lieu: 'Chamonix, France',
          prix: 45.5,
          dateDebut: '2024-06-01T09:00:00Z',
          dateFin: '2024-06-30T17:00:00Z',
          sorties: [],
        },
      ],
    },
  })
  async findAll() {
    return this.campingService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get camping by ID' })
  @ApiParam({ name: 'id', description: 'Camping ID' })
  @ApiResponse({
    status: 200,
    description: 'Camping details',
    schema: {
      example: {
        _id: '6709d45e1c9f4c123456789a',
        nom: 'Camping Mont Blanc',
        description: 'Beautiful mountain camping site',
        lieu: 'Chamonix, France',
        prix: 45.5,
        dateDebut: '2024-06-01T09:00:00Z',
        dateFin: '2024-06-30T17:00:00Z',
        sorties: [],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Camping not found' })
  async findOne(@Param('id') id: string) {
    return this.campingService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update camping' })
  @ApiParam({ name: 'id', description: 'Camping ID' })
  @ApiBody({
    type: UpdateCampingDto,
    examples: {
      example1: {
        summary: 'Update price',
        value: {
          prix: 50,
        },
      },
      example2: {
        summary: 'Update description',
        value: {
          description: 'Updated description with new amenities',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Camping updated successfully' })
  @ApiResponse({ status: 404, description: 'Camping not found' })
  async update(
    @Param('id') id: string,
    @Body() updateCampingDto: UpdateCampingDto,
  ) {
    return this.campingService.update(id, updateCampingDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete camping' })
  @ApiParam({ name: 'id', description: 'Camping ID' })
  @ApiResponse({ status: 200, description: 'Camping deleted successfully' })
  @ApiResponse({ status: 404, description: 'Camping not found' })
  async delete(@Param('id') id: string) {
    await this.campingService.delete(id);
    return { message: 'Camping deleted successfully' };
  }
}
