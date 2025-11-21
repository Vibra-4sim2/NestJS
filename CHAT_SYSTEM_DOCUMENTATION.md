# Real-Time Group Chat System Documentation

## Overview

This document describes the complete real-time chat system integrated into your NestJS application. The system provides group chat functionality tied to Sorties (outdoor activities), with automatic member management, WebSocket support for real-time messaging, and REST APIs for chat history.

---

## Features

✅ **Automatic Chat Creation**: Every Sortie automatically gets a dedicated chat group  
✅ **1:1 Relationship**: Each chat is linked to exactly one Sortie  
✅ **Automatic Member Management**: Creator and accepted participants are automatically added  
✅ **Multi-Media Support**: Text, images, videos, audio recordings, files, and location sharing  
✅ **Real-Time Broadcasting**: WebSocket gateway broadcasts messages to all chat members  
✅ **REST API**: Full CRUD operations for messages and chat history  
✅ **JWT Authentication**: Secure WebSocket and REST API authentication  
✅ **Read Receipts**: Track which users have read messages  
✅ **Typing Indicators**: Show when users are typing  
✅ **Cloudinary Integration**: Media upload support for images, videos, and audio  

---

## Architecture

### Database Schema

#### Chat Collection
```typescript
{
  _id: ObjectId,
  sortieId: ObjectId (ref: Sortie) - unique index,
  members: [ObjectId] (ref: User),
  lastMessage: ObjectId (ref: Message),
  name: String (optional),
  avatar: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `sortieId: 1` (unique)
- `members: 1`
- `updatedAt: -1`

#### Message Collection
```typescript
{
  _id: ObjectId,
  chatId: ObjectId (ref: Chat),
  sortieId: ObjectId (ref: Sortie),
  senderId: ObjectId (ref: User) - null for system messages,
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'system',
  content: String (text or caption),
  mediaUrl: String (Cloudinary URL),
  thumbnailUrl: String,
  mediaDuration: Number (seconds),
  fileSize: Number (bytes),
  fileName: String,
  mimeType: String,
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    name: String
  },
  readBy: [ObjectId] (ref: User),
  isDeleted: Boolean,
  replyTo: ObjectId (ref: Message),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `chatId: 1, createdAt: -1` (compound)
- `sortieId: 1, createdAt: -1`
- `senderId: 1, createdAt: -1`

---

## Integration Points

### 1. Sortie Creation → Chat Creation

When a Sortie is created in `sortie.service.ts`:

```typescript
// After saving sortie
const savedSortie = await sortie.save();

// Automatically create chat
await this.chatService.createChatForSortie(
  savedSortie._id as Types.ObjectId,
  savedSortie.createurId,
  savedSortie.titre, // Chat name
);
```

**What happens:**
1. Chat document is created with `sortieId` and creator as first member
2. Welcome system message is added: "Chat créé automatiquement pour cette sortie. Bienvenue !"
3. `chat.lastMessage` is updated to point to the welcome message

### 2. Participation Accepted → User Added to Chat

When participation status changes to `ACCEPTEE` in `participation.service.ts`:

```typescript
// Update status endpoint: PATCH /participations/:id/status
async updateStatus(participationId, status, adminUserId) {
  // ... validation ...
  
  // If accepted, add to chat
  if (status === ParticipationStatus.ACCEPTEE) {
    await this.chatService.addUserToChat(
      participation.sortieId,
      participation.userId,
    );
  }
}
```

**What happens:**
1. User is added to `chat.members` array (duplicates prevented)
2. System message is created: "Un nouveau participant a rejoint la sortie"
3. User can now send/receive messages in the chat

### 3. Participation Rejected/Cancelled → User Removed from Chat

When participation status changes to `REFUSEE` or `ANNULEE`:

```typescript
if (status === ParticipationStatus.REFUSEE || status === ParticipationStatus.ANNULEE) {
  await this.chatService.removeUserFromChat(
    participation.sortieId,
    participation.userId,
  );
}
```

---

## REST API Endpoints

### Chat Endpoints

#### GET `/chats/sortie/:sortieId`
Get chat for a specific sortie.

**Response:**
```json
{
  "_id": "chat_id",
  "sortieId": "sortie_id",
  "members": [
    {
      "_id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "avatar": "https://..."
    }
  ],
  "lastMessage": {
    "_id": "message_id",
    "content": "Last message text",
    "type": "text",
    "senderId": "user_id",
    "createdAt": "2024-11-21T10:00:00Z"
  },
  "name": "Weekend Hiking Trip",
  "createdAt": "2024-11-20T10:00:00Z",
  "updatedAt": "2024-11-21T10:00:00Z"
}
```

#### GET `/chats`
Get all chats where the authenticated user is a member.

#### GET `/chats/:chatId`
Get chat by ID.

#### GET `/chats/sortie/:sortieId/members`
Get all members of a chat.

---

### Message Endpoints

#### GET `/messages/sortie/:sortieId?page=1&limit=50`
Get paginated messages for a sortie.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)
- `before` (optional): Message ID for cursor-based pagination

**Response:**
```json
{
  "messages": [
    {
      "_id": "message_id",
      "chatId": "chat_id",
      "sortieId": "sortie_id",
      "senderId": {
        "_id": "user_id",
        "firstName": "Jane",
        "lastName": "Smith",
        "avatar": "https://..."
      },
      "type": "text",
      "content": "Hello everyone!",
      "createdAt": "2024-11-21T10:00:00Z",
      "readBy": ["user_id_1", "user_id_2"]
    }
  ],
  "total": 120,
  "page": 1,
  "limit": 50,
  "hasMore": true
}
```

#### POST `/messages/sortie/:sortieId`
Send a message via REST API (alternative to WebSocket).

**Request Body:**
```json
{
  "type": "text",
  "content": "Hello from REST API!"
}
```

**For media messages:**
```json
{
  "type": "image",
  "content": "Check out this photo!",
  "mediaUrl": "https://res.cloudinary.com/...",
  "thumbnailUrl": "https://res.cloudinary.com/..."
}
```

**For location messages:**
```json
{
  "type": "location",
  "content": "Meeting point",
  "location": {
    "latitude": 48.8566,
    "longitude": 2.3522,
    "address": "Paris, France",
    "name": "Eiffel Tower"
  }
}
```

#### POST `/messages/upload`
Upload media file to Cloudinary.

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `file`

**Response:**
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/.../secure_url",
  "publicId": "chat-media/abc123",
  "duration": 30.5,
  "format": "mp4",
  "mimeType": "video/mp4",
  "size": 1048576,
  "originalName": "video.mp4"
}
```

**Usage Flow:**
1. Client uploads file to `/messages/upload`
2. Server uploads to Cloudinary and returns URL
3. Client sends message with `mediaUrl` set to the returned URL

#### DELETE `/messages/:messageId`
Soft delete a message (sender only).

#### POST `/messages/:messageId/read`
Mark a message as read.

---

## WebSocket API

### Connection

**Namespace:** `/chat`

**Authentication:**
Include JWT token in connection handshake:

```javascript
const socket = io('http://localhost:3000/chat', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

Or in headers:
```javascript
const socket = io('http://localhost:3000/chat', {
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token'
  }
});
```

### Events

#### Client → Server

##### `joinRoom`
Join a chat room for a specific sortie.

```javascript
socket.emit('joinRoom', {
  sortieId: 'sortie_id'
});
```

**Server Response:**
```javascript
socket.on('joinedRoom', (data) => {
  console.log(data);
  // {
  //   sortieId: 'sortie_id',
  //   room: 'sortie_sortie_id',
  //   messages: [...], // Recent 50 messages
  //   message: 'Successfully joined chat room'
  // }
});
```

##### `sendMessage`
Send a message to the chat.

```javascript
socket.emit('sendMessage', {
  sortieId: 'sortie_id',
  type: 'text',
  content: 'Hello everyone!'
});

// For media
socket.emit('sendMessage', {
  sortieId: 'sortie_id',
  type: 'audio',
  content: 'Voice message',
  mediaUrl: 'https://res.cloudinary.com/audio.mp3',
  mediaDuration: 15.5
});
```

##### `typing`
Indicate typing status.

```javascript
socket.emit('typing', {
  sortieId: 'sortie_id',
  isTyping: true
});
```

##### `markAsRead`
Mark a message as read.

```javascript
socket.emit('markAsRead', {
  messageId: 'message_id',
  sortieId: 'sortie_id'
});
```

##### `leaveRoom`
Leave a chat room.

```javascript
socket.emit('leaveRoom', {
  sortieId: 'sortie_id'
});
```

##### `getOnlineUsers`
Get list of online users in the chat.

```javascript
socket.emit('getOnlineUsers', {
  sortieId: 'sortie_id'
});

socket.on('onlineUsers', (data) => {
  console.log(data);
  // {
  //   sortieId: 'sortie_id',
  //   userIds: ['user_id_1', 'user_id_2'],
  //   count: 2
  // }
});
```

#### Server → Client

##### `connected`
Confirmation of successful connection.

```javascript
socket.on('connected', (data) => {
  console.log(data);
  // { message: 'Connected to chat server', userId: 'your_user_id' }
});
```

##### `receiveMessage`
New message broadcast to all room members.

```javascript
socket.on('receiveMessage', (data) => {
  console.log(data);
  // {
  //   message: { ... full message object ... },
  //   sortieId: 'sortie_id'
  // }
});
```

##### `userTyping`
User typing indicator.

```javascript
socket.on('userTyping', (data) => {
  console.log(data);
  // { userId: 'user_id', sortieId: 'sortie_id', isTyping: true }
});
```

##### `messageRead`
Message read notification.

```javascript
socket.on('messageRead', (data) => {
  console.log(data);
  // { messageId: 'message_id', userId: 'user_id', sortieId: 'sortie_id' }
});
```

##### `notification`
System notifications (user joined, etc.).

```javascript
socket.on('notification', (data) => {
  console.log(data);
  // {
  //   sortieId: 'sortie_id',
  //   message: 'Un nouveau participant a rejoint la sortie',
  //   data: { ... },
  //   timestamp: '2024-11-21T10:00:00Z'
  // }
});
```

##### `error`
Error messages.

```javascript
socket.on('error', (data) => {
  console.error(data);
  // { message: 'You are not a member of this chat' }
});
```

---

## Media Upload Guide

### Cloudinary Configuration

The system uses Cloudinary for media storage. Audio files use `resource_type: 'video'` as per Cloudinary's requirements.

### Upload Flow

#### Option 1: Client → Server → Cloudinary (Recommended for Mobile)

```javascript
// 1. Upload file using FormData
const formData = new FormData();
formData.append('file', audioBlob, 'recording.mp3');

const response = await fetch('/messages/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { url, duration } = await response.json();

// 2. Send message with media URL
socket.emit('sendMessage', {
  sortieId: 'sortie_id',
  type: 'audio',
  mediaUrl: url,
  mediaDuration: duration
});
```

#### Option 2: Client → Cloudinary Direct Upload (For Web)

```javascript
// 1. Get upload signature from your backend (optional)
// 2. Upload directly to Cloudinary
const formData = new FormData();
formData.append('file', file);
formData.append('upload_preset', 'your_preset'); // Configure in Cloudinary

const response = await fetch('https://api.cloudinary.com/v1_1/your_cloud_name/upload', {
  method: 'POST',
  body: formData
});

const { secure_url, duration } = await response.json();

// 3. Send message with Cloudinary URL
socket.emit('sendMessage', {
  sortieId: 'sortie_id',
  type: 'video',
  mediaUrl: secure_url,
  mediaDuration: duration
});
```

### Supported Media Types

| Type | MIME Types | Notes |
|------|------------|-------|
| **Image** | image/jpeg, image/png, image/gif, image/webp | Auto-generates thumbnails |
| **Video** | video/mp4, video/quicktime, video/webm | Include `mediaDuration` |
| **Audio** | audio/mpeg, audio/mp3, audio/wav, audio/ogg | Use `resource_type: 'video'` in Cloudinary |
| **File** | application/pdf, etc. | Include `fileName` and `fileSize` |

---

## Security & Permissions

### Authentication

All endpoints and WebSocket connections require JWT authentication:

**REST API:**
```
Authorization: Bearer <jwt_token>
```

**WebSocket:**
```javascript
socket.io('...', { auth: { token: '<jwt_token>' } })
```

### Permission Checks

1. **Send Message**: User must be a member of the chat (creator or accepted participant)
2. **Read Messages**: User must be a member of the chat
3. **Delete Message**: Only sender can delete their own messages
4. **Update Participation Status**: Only sortie creator can accept/reject participants

### Rate Limiting (Recommended)

Add rate limiting to prevent spam:

```typescript
// In chat.gateway.ts (example)
@UseGuards(ThrottlerGuard)
@SubscribeMessage('sendMessage')
async handleSendMessage(...) { ... }
```

---

## Production Considerations

### 1. Environment Variables

Add to `.env`:
```env
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=7d
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 2. CORS Configuration

Update WebSocket CORS for production:

```typescript
// chat.gateway.ts
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
    credentials: true,
  },
})
```

### 3. Message Moderation

Consider adding:
- Profanity filter
- Max message length validation
- Spam detection
- Admin delete/ban capabilities

### 4. Performance Optimization

- **Indexing**: Already implemented on chatId, sortieId, and createdAt
- **Pagination**: Cursor-based pagination available via `before` parameter
- **Caching**: Consider Redis for online users and recent messages
- **Message Limits**: Default 50 messages per page, configurable

### 5. Monitoring & Logging

- Track active connections
- Log message delivery failures
- Monitor Cloudinary upload success/failures
- Alert on high error rates

### 6. Backup & Data Retention

- Regular MongoDB backups
- Consider soft-delete policies for old messages
- Archive old chats when sortie is completed/deleted

---

## Testing

### Manual Testing Flow

1. **Create a Sortie** → Verify chat is auto-created
2. **Join Sortie** → Accept participation → Verify user added to chat
3. **WebSocket Connection** → Connect and join room
4. **Send Messages** → Text, media, location
5. **Read Receipts** → Mark messages as read
6. **Typing Indicators** → Test typing events
7. **Leave Room** → Disconnect and verify cleanup

### Example Test Scenarios

```typescript
// Unit test example
describe('ChatService', () => {
  it('should create chat when sortie is created', async () => {
    const sortie = await sortieService.create(...);
    const chat = await chatService.getChatBySortie(sortie._id);
    
    expect(chat).toBeDefined();
    expect(chat.members).toContain(sortie.createurId);
  });
  
  it('should add user to chat when participation accepted', async () => {
    // ... test implementation
  });
});
```

---

## Mobile Integration Guide

### React Native Example

```javascript
import io from 'socket.io-client';

// Connect
const socket = io('http://your-api.com/chat', {
  auth: { token: userToken }
});

// Join room
socket.emit('joinRoom', { sortieId });

// Listen for messages
socket.on('receiveMessage', (data) => {
  setMessages(prev => [...prev, data.message]);
});

// Send message
const sendMessage = (text) => {
  socket.emit('sendMessage', {
    sortieId,
    type: 'text',
    content: text
  });
};

// Upload audio
const uploadAudio = async (audioUri) => {
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: 'audio/mp3',
    name: 'audio.mp3'
  });
  
  const response = await fetch('/messages/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  
  const { url, duration } = await response.json();
  
  socket.emit('sendMessage', {
    sortieId,
    type: 'audio',
    mediaUrl: url,
    mediaDuration: duration
  });
};
```

---

## Troubleshooting

### WebSocket Connection Issues

**Problem:** Can't connect to WebSocket  
**Solution:** Check CORS configuration, verify JWT token is valid, ensure namespace is `/chat`

**Problem:** Messages not broadcasting  
**Solution:** Verify user joined the room with `joinRoom` event first

### Permission Errors

**Problem:** "You are not a member of this chat"  
**Solution:** Ensure participation status is `ACCEPTEE`, check chat members array

### Media Upload Failures

**Problem:** Cloudinary upload fails  
**Solution:** Verify Cloudinary credentials in `.env`, check file size limits, ensure correct `resource_type`

**Problem:** Audio uploads fail  
**Solution:** Use `resource_type: 'video'` for audio files (Cloudinary requirement)

---

## API Summary

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chats` | Get all user's chats |
| GET | `/chats/sortie/:sortieId` | Get chat by sortie |
| GET | `/chats/:chatId` | Get chat by ID |
| GET | `/chats/sortie/:sortieId/members` | Get chat members |
| GET | `/messages/sortie/:sortieId` | Get messages (paginated) |
| GET | `/messages/chat/:chatId` | Get messages by chat ID |
| POST | `/messages/sortie/:sortieId` | Send message (REST) |
| POST | `/messages/upload` | Upload media to Cloudinary |
| DELETE | `/messages/:messageId` | Delete message |
| POST | `/messages/:messageId/read` | Mark as read |
| PATCH | `/participations/:id/status` | Update participation status (triggers chat add/remove) |

### WebSocket Events

**Client → Server:**
- `joinRoom`
- `sendMessage`
- `typing`
- `markAsRead`
- `leaveRoom`
- `getOnlineUsers`

**Server → Client:**
- `connected`
- `receiveMessage`
- `userTyping`
- `messageRead`
- `notification`
- `error`

---

## Conclusion

You now have a complete, production-ready real-time chat system integrated with your NestJS application. The system automatically manages chat groups based on Sortie participation, supports multiple media types, and provides both REST and WebSocket APIs for maximum flexibility.

For questions or issues, refer to the code comments or create an issue in your repository.
