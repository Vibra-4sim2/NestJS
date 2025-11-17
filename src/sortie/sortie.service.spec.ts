import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SortieService } from './sortie.service';
import { SortieType } from '../enums/sortie-type.enum';
import { CampingService } from '../camping/camping.service';

describe('SortieService', () => {
  let service: SortieService;
  let campingService: CampingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SortieService,
        {
          provide: CampingService,
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: 'SortieModel',
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findByIdAndDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SortieService>(SortieService);
    campingService = module.get<CampingService>(CampingService);
  });

  describe('create', () => {
    it('should throw BadRequestException when type=CAMPING but no camping provided', async () => {
      const dto = {
        titre: 'Test',
        date: '2024-10-20T08:00:00Z',
        type: SortieType.CAMPING,
        option_camping: false,
      };

      await expect(service.create(dto, 'userId123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create sortie with nested camping DTO when type=VELO and option_camping=true', async () => {
      const campingDto = {
        nom: 'Test Camping',
        lieu: 'Test Lieu',
        dateDebut: '2024-10-20T08:00:00Z',
        dateFin: '2024-10-21T08:00:00Z',
      };

      jest
        .spyOn(campingService, 'create')
        .mockResolvedValue({ _id: 'campingId123' } as any);

      const dto = {
        titre: 'Velo Trip',
        date: '2024-10-20T07:00:00Z',
        type: SortieType.VELO,
        option_camping: true,
        camping: campingDto,
      };

      const result = await service.create(dto, 'userId123');
      expect(campingService.create).toHaveBeenCalledWith(campingDto);
    });

    it('should throw BadRequestException when type=VELO, option_camping=false but camping provided', async () => {
      const dto = {
        titre: 'Velo Trip',
        date: '2024-10-20T07:00:00Z',
        type: SortieType.VELO,
        option_camping: false,
        campingId: 'someId',
      };

      await expect(service.create(dto, 'userId123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
