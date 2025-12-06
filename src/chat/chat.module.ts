import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Chat, ChatSchema } from './entities/chat.schema';
import { Message, MessageSchema } from './entities/message.schema';
import { ChatService } from './chat.service';
import { MessageService } from './message.service';
import { ChatController } from './chat.controller';
import { MessageController } from './message.controller';
import { ChatGateway } from './chat.gateway';
import { NotificationsModule } from '../notifications/notifications.module';
import { Sortie, SortieSchema } from '../sortie/entities/sortie.schema';

/**
 * ChatModule
 * Encapsulates all chat-related functionality including WebSocket and REST API
 */
@Module({
  imports: [
    // Register MongoDB schemas
    MongooseModule.forFeature([
      { name: Chat.name, schema: ChatSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Sortie.name, schema: SortieSchema },
    ]),
    NotificationsModule,

    // JWT module for WebSocket authentication
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          expiresIn: '7d', // Keep as string literal for compatibility
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ChatController, MessageController],
  providers: [ChatService, MessageService, ChatGateway],
  exports: [ChatService, MessageService, ChatGateway], // Export for use in other modules
})
export class ChatModule {}
