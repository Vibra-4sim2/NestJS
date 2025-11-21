import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
} from '@nestjs/swagger';
import { SortieService } from './sortie.service';
import { CreateSortieDto, UpdateSortieDto } from './dto/sortie.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
@ApiTags('Sorties')
@Controller('sorties')
export class SortieController {
  constructor(private readonly sortieService: SortieService) {}

 @Post()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
@UseInterceptors(FileInterceptor('photo'))
@ApiConsumes('multipart/form-data')
@ApiOperation({ summary: 'Create a new sortie (with optional photo upload)' })
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      photo: { type: 'string', format: 'binary', description: 'Image file (optional)' },
      // simple fields
      titre: { type: 'string', example: 'Randonnée au Mont Blanc' },
      description: { type: 'string', example: 'Belle randonnée' },
      date: { type: 'string', format: 'date-time', example: '2024-06-15T09:00:00Z' },
      type: { type: 'string', enum: ['RANDONNEE', 'VELO', 'CAMPING'] },
      option_camping: { type: 'boolean', example: false },
      lieu: { type: 'string', example: 'Chamonix, France' },
      difficulte: { type: 'string', example: 'MOYEN' },
      niveau: { type: 'string', example: 'INTERMEDIAIRE' },
      capacite: { type: 'number', example: 15 },
      prix: { type: 'number', example: 50 },
      campingId: { type: 'string', example: '673636b4c8e7890123456789' },
      // nested objects as JSON strings (so you don't have to flatten)
      itineraire: {
        type: 'string',
        description: 'JSON for itineraire',
        example: JSON.stringify({
          pointDepart: { latitude: 45.8326, longitude: 6.8652 },
          pointArrivee: { latitude: 45.9237, longitude: 6.8694 },
          distance: 12500,
          duree_estimee: 18000
        })
      },
      camping: {
        type: 'string',
        description: 'JSON for camping (optional)',
        example: JSON.stringify({
          nom: 'Camping Les Aiguilles',
          lieu: 'Argentière, France',
          prix: 55.5,
          dateDebut: '2024-07-15T14:00:00Z',
          dateFin: '2024-07-17T11:00:00Z'
        })
      }
    }
  }
})
async create(
  @Body() body: any,
  @Request() req,
  @UploadedFile() file?: Express.Multer.File,
) {
  const userId = req.user.sub;

  // Parse JSON strings into objects before validation/service
  if (typeof body.itineraire === 'string') {
    try { body.itineraire = JSON.parse(body.itineraire); } catch {}
  }
  if (typeof body.camping === 'string') {
    try { body.camping = JSON.parse(body.camping); } catch {}
  }

  const createSortieDto: CreateSortieDto = body;
  return this.sortieService.create(createSortieDto, userId, file);
}

  @Get()
  @ApiOperation({ 
    summary: 'Get all sorties with populated data (Public)',
    description: 'Retrieve all sorties with creator, camping, and participants information populated'
  })
  @ApiResponse({
    status: 200,
    description: 'List of all sorties',
    schema: {
      example: [
        {
          _id: '673636b4c8e7890123456788',
          titre: 'Weekend Camping Adventure en Montagne',
          description: 'Epic mountain camping trip',
          date: '2024-07-15T08:00:00Z',
          type: 'CAMPING',
          option_camping: false,
          lieu: 'Chamonix, Haute-Savoie, France',
          difficulte: 'MOYEN',
          createurId: {
            _id: '6915f73054c7d88a631ed7df',
            name: 'Mohamed Amine Mami',
            email: 'mohamedamine.mami@esprit.tn',
          },
          camping: {
            _id: '673636b4c8e7890123456789',
            nom: 'Camping Les Aiguilles d\'Argentière',
            lieu: 'Argentière, France',
            prix: 55.50
          },
          capacite: 25,
          prix: 120.00,
          participants: [],
        },
        {
          _id: '673636b4c8e7890123456791',
          titre: 'Balade Vélo en Ville',
          description: 'Circuit vélo urbain',
          date: '2024-09-05T09:00:00Z',
          type: 'VELO',
          option_camping: false,
          lieu: 'Lyon, France',
          difficulte: 'FACILE',
          createurId: {
            _id: '6915f73054c7d88a631ed7df',
            name: 'Mohamed Amine Mami',
            email: 'mohamedamine.mami@esprit.tn',
          },
          camping: null,
          capacite: 40,
          prix: 15.00,
          participants: [],
        }
      ],
    },
  })
  async findAll() {
    return this.sortieService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une sortie par ID' })
  @ApiParam({
    name: 'id',
    description: 'ID de la sortie',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Sortie trouvée',
    schema: {
      example: {
        _id: '6709d45e1c9f4c123456789b',
        titre: 'Weekend Camping Adventure',
        description: 'Epic mountain camping trip',
        date: '2024-07-15T08:00:00Z',
        type: 'CAMPING',
        option_camping: false,
        createurId: {
          _id: '6709d45e1c9f4c123456789c',
          name: 'John Doe',
          email: 'john@example.com',
        },
        camping: {
          _id: '6709d45e1c9f4c123456789d',
          nom: 'Camping Alpes',
          lieu: 'Annecy, France',
          prix: 50,
        },
        capacite: 20,
        participants: ['6709d45e1c9f4c123456789e'],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Sortie non trouvée' })
  async findOne(@Param('id') id: string) {
    return this.sortieService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Mettre à jour une sortie' })
  @ApiParam({ name: 'id', description: 'ID de la sortie' })
  @ApiBody({
    type: UpdateSortieDto,
    examples: {
      updateTitle: {
        summary: 'Update sortie title',
        value: {
          titre: 'Updated Camping Adventure',
        },
      },
      updateCapacity: {
        summary: 'Update capacity',
        value: {
          capacite: 25,
        },
      },
      updateComplete: {
        summary: 'Mise à jour complète',
        value: {
          titre: 'Randonnée au Mont Blanc - Modifiée',
          description: 'Description mise à jour avec nouvelles informations',
          date: '2024-06-25T09:00:00Z',
          type: 'RANDONNEE',
          option_camping: true,
          capacite: 20,
          itineraire: {
            pointDepart: {
              latitude: 45.8326,
              longitude: 6.8652,
            },
            pointArrivee: {
              latitude: 45.9237,
              longitude: 6.8694,
            },
            distance: 13000,
            duree_estimee: 19000,
          },
        },
      },
      updatePartial: {
        summary: 'Mise à jour partielle (titre et capacité)',
        value: {
          titre: 'Nouveau titre',
          capacite: 25,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Sortie mise à jour' })
  @ApiResponse({ status: 401, description: 'Unauthorized - valid JWT token required' })
  @ApiResponse({ status: 403, description: 'Only creator can update' })
  @ApiResponse({ status: 404, description: 'Sortie non trouvée' })
  async update(
    @Param('id') id: string,
    @Body() updateSortieDto: UpdateSortieDto,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.sortieService.update(id, updateSortieDto, userId);
  }

  // ✅ ADD THIS ENDPOINT (separate photo upload)
  @Put(':id/photo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('photo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Mettre à jour la photo d\'une sortie' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: { type: 'string', format: 'binary' },
      },
    },
  })
  async updatePhoto(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
  @Request() req,
) {
  return this.sortieService.setPhoto(id, file, req.user.sub);  // ✅ Change userId to sub
}



  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Supprimer une sortie' })
  @ApiParam({ name: 'id', description: 'ID de la sortie' })
  @ApiResponse({ status: 200, description: 'Sortie supprimée' })
  @ApiResponse({ status: 401, description: 'Unauthorized - valid JWT token required' })
  @ApiResponse({ status: 403, description: 'Only creator can delete' })
  @ApiResponse({ status: 404, description: 'Sortie non trouvée' })
  async delete(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    await this.sortieService.delete(id, userId);
    return { message: 'Sortie supprimée avec succès' };
  }
}




