
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PreferencesDocument = HydratedDocument<Preferences>;

@Schema({ timestamps: true })
export class Preferences {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], required: false })
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  
  // ---- VÉLO ----
  @Prop({ type: String, enum: ['VTT', 'ROUTE', 'GRAVEL', 'URBAIN', 'ELECTRIQUE'], required: false })
  cyclingType?: 'VTT' | 'ROUTE' | 'GRAVEL' | 'URBAIN' | 'ELECTRIQUE';

  @Prop({ type: String, enum: ['QUOTIDIEN', 'HEBDO', 'WEEKEND', 'RARE'], required: false })
  cyclingFrequency?: 'QUOTIDIEN' | 'HEBDO' | 'WEEKEND' | 'RARE';

  @Prop({ type: String, enum: ['<10', '10-30', '30-60', '>60'], required: false })
  cyclingDistance?: '<10' | '10-30' | '30-60' | '>60';

  @Prop({ type: Boolean, default: false })
  cyclingGroupInterest?: boolean;

  // ---- RANDONNÉE ----
  @Prop({ type: String, enum: ['COURTE', 'MONTAGNE', 'LONGUE', 'TREKKING'], required: false })
  hikeType?: 'COURTE' | 'MONTAGNE' | 'LONGUE' | 'TREKKING';

  @Prop({ type: String, enum: ['<2H', '2-4H', '4-8H', '>8H'], required: false })
  hikeDuration?: '<2H' | '2-4H' | '4-8H' | '>8H';

  @Prop({ type: String, enum: ['GROUPE', 'SEUL'], required: false })
  hikePreference?: 'GROUPE' | 'SEUL';

  // ---- CAMPING ----
  @Prop({ type: Boolean, default: false })
  campingPractice?: boolean;

  @Prop({ type: String, enum: ['TENTE', 'VAN', 'CAMPING-CAR', 'REFUGE', 'BIVOUAC'], required: false })
  campingType?: 'TENTE' | 'VAN' | 'CAMPING-CAR' | 'REFUGE' | 'BIVOUAC';

  @Prop({ type: String, enum: ['1NUIT', 'WEEKEND', '3-5J', '>1SEMAINE'], required: false })
  campingDuration?: '1NUIT' | 'WEEKEND' | '3-5J' | '>1SEMAINE';



  @Prop({
  type: {
    latitude: Number,
    longitude: Number,
  },
  required: false
})
location: {
  latitude: number;
  longitude: number;
};
@Prop({ type: [String], required: false })
availableDays?: string[]; // ['SATURDAY', 'SUNDAY']

@Prop({
  type: {
    start: String,
    end: String
  },
  required: false,
})
availableTime?: {
  start: string; // "08:00"
  end: string;   // "12:00"
};
@Prop({ type: Number, required: false })
averageSpeed?: number; // km/h




  @Prop({ type: Boolean, default: false })
  onboardingComplete: boolean;
}

export const PreferencesSchema = SchemaFactory.createForClass(Preferences);
PreferencesSchema.index({ user: 1 }, { unique: true });