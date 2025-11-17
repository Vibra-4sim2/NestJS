import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Camping, CampingDocument } from './camping.schema';
import { CreateCampingDto, UpdateCampingDto } from './camping.dto';

@Injectable()
export class CampingService {
  constructor(
    @InjectModel(Camping.name) private campingModel: Model<CampingDocument>,
  ) {}

  private validateDates(dateDebut: Date, dateFin: Date): void {
    if (dateDebut >= dateFin) {
      throw new BadRequestException(
        'dateDebut must be before dateFin',
      );
    }
  }

  async create(createCampingDto: CreateCampingDto): Promise<CampingDocument> {
    const { dateDebut, dateFin } = createCampingDto;
    const startDate = new Date(dateDebut);
    const endDate = new Date(dateFin);

    this.validateDates(startDate, endDate);

    const camping = new this.campingModel({
      ...createCampingDto,
      dateDebut: startDate,
      dateFin: endDate,
    });

    return camping.save();
  }

  async findAll(): Promise<CampingDocument[]> {
    return this.campingModel.find().exec();
  }

  async findOne(id: string): Promise<CampingDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid camping ID');
    }

    const camping = await this.campingModel.findById(id).exec();
    if (!camping) {
      throw new NotFoundException('Camping not found');
    }

    return camping;
  }

  async update(
    id: string,
    updateCampingDto: UpdateCampingDto,
  ): Promise<CampingDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid camping ID');
    }

    if (updateCampingDto.dateDebut && updateCampingDto.dateFin) {
      const startDate = new Date(updateCampingDto.dateDebut);
      const endDate = new Date(updateCampingDto.dateFin);
      this.validateDates(startDate, endDate);
      updateCampingDto.dateDebut = startDate.toISOString();
      updateCampingDto.dateFin = endDate.toISOString();
    }

    const camping = await this.campingModel
      .findByIdAndUpdate(id, updateCampingDto, { new: true })
      .exec();

    if (!camping) {
      throw new NotFoundException('Camping not found');
    }

    return camping;
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid camping ID');
    }

    const result = await this.campingModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('Camping not found');
    }
  }
}
