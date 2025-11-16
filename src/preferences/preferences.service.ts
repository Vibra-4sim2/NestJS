import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

  // New: create preferences for a user only if they don't already have one.
  // Uses a mongoose session/transaction to reduce race conditions that could lead to duplicates.
  async createForUser(userId: string | Types.ObjectId, dto: CreatePreferencesDto) {
    const session = await this.prefModel.db.startSession();
    session.startTransaction();
    try {
      const existing = await this.prefModel.findOne({ user: userId }).session(session).lean();
      if (existing) {
        await session.abortTransaction();
        session.endSession();
        throw new ConflictException('Preferences already exist for this user');
      }

      const createdDocs = await this.prefModel.create([ { user: userId, ...dto } ], { session });
      await session.commitTransaction();
      session.endSession();
      // createdDocs is an array since we used create with an array
      const created = typeof createdDocs[0].toObject === 'function' ? createdDocs[0].toObject() : createdDocs[0];
      return created;
    } catch (err) {
      try { await session.abortTransaction(); } catch (_) {}
      session.endSession();
      throw err;
    }
  }
}