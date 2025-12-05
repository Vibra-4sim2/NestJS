import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PollController } from './poll.controller';
import { PollService } from './poll.service';
import { PollGateway } from './poll.gateway';
import { Poll, PollSchema } from './entities/poll.schema';
import { ChatModule } from '../chat/chat.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Poll.name, schema: PollSchema }]),
    ChatModule, // Import ChatModule to access ChatService
  ],
  controllers: [PollController],
  providers: [PollService, PollGateway],
  exports: [PollService, PollGateway], // Export for use in other modules if needed
})
export class PollModule implements OnModuleInit {
  constructor(
    @InjectModel(Poll.name) private pollModel: Model<Poll>,
  ) {}

  async onModuleInit() {
    try {
      // Ensure indexes are created
      await this.pollModel.createIndexes();
      console.log('✅ Poll indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating poll indexes:', error.message);
    }
  }
}
