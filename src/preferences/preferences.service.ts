import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Preferences, PreferencesDocument } from './entities/preference.entity';
import { CreatePreferencesDto } from './dto/create-preference.dto';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectModel(Preferences.name) private readonly prefModel: Model<PreferencesDocument>,
  ) {}

  async getForUser(userId: string | Types.ObjectId) {
    const prefs = await this.prefModel.findOne({ user: userId }).lean();
    if (!prefs) throw new NotFoundException('Preferences not found');
    return prefs;
  }

  // Upsert = create if not exists, otherwise update; mark onboardingComplete
  async setOnboardingAnswers(userId: string | Types.ObjectId, dto: CreatePreferencesDto) {
    const prefs = await this.prefModel.findOneAndUpdate(
      { user: userId },
      { $set: { ...dto, onboardingComplete: true }, $setOnInsert: { user: userId } },
      { new: true, upsert: true }
    ).lean();
    return prefs;
  }

  async updateForUser(userId: string | Types.ObjectId, dto: Partial<CreatePreferencesDto>) {
    const updated = await this.prefModel.findOneAndUpdate(
      { user: userId }, { $set: dto }, { new: true }
    ).lean();
    if (!updated) throw new NotFoundException('Preferences not found');
    return updated;
  }
}