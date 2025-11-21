# Chat System - Quick Setup Guide

## Installation Complete ✅

The real-time chat system has been successfully installed and integrated into your NestJS application!

## What Was Installed

### Dependencies
- `@nestjs/websockets` - WebSocket support
- `@nestjs/platform-socket.io` - Socket.IO platform adapter
- `socket.io` - Real-time bidirectional communication

### New Files Created

```
src/chat/
├── entities/
│   ├── chat.schema.ts          # Chat model
│   └── message.schema.ts       # Message model
├── dto/
│   ├── message.dto.ts          # Message DTOs
│   └── query.dto.ts            # Query/pagination DTOs
├── chat.service.ts             # Chat business logic
├── message.service.ts          # Message business logic
├── chat.gateway.ts             # WebSocket gateway
├── chat.controller.ts          # Chat REST endpoints
├── message.controller.ts       # Message REST endpoints
└── chat.module.ts              # Chat module definition
```

### Modified Files

1. **src/app.module.ts** - Added ChatModule import
2. **src/sortie/sortie.module.ts** - Added ChatModule import with forwardRef
3. **src/sortie/sortie.service.ts** - Integrated automatic chat creation
4. **src/participation/participation.module.ts** - Added ChatModule import
5. **src/participation/participation.service.ts** - Integrated chat member management
6. **src/participation/participation.controller.ts** - Added status update endpoint

## Next Steps

### 1. Verify Installation

Check that dependencies were installed:
```bash
npm list @nestjs/websockets socket.io
```

### 2. Start the Server

```bash
npm run start:dev
```

The server will start on port 3000 with:
- REST API: `http://localhost:3000`
- WebSocket: `ws://localhost:3000/chat`

### 3. Test the Chat System

#### Test via REST API

**Create a Sortie (chat auto-created):**
```bash
curl -X POST http://localhost:3000/sorties \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "titre": "Test Hiking Trip",
    "description": "Weekend adventure",
    "date": "2024-12-01T10:00:00Z",
    "type": "RANDONNEE",
    "option_camping": false
  }'
```

**Get Chat for Sortie:**
```bash
curl http://localhost:3000/chats/sortie/SORTIE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Send a Message:**
```bash
curl -X POST http://localhost:3000/messages/sortie/SORTIE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "content": "Hello everyone!"
  }'
```

**Get Messages:**
```bash
curl http://localhost:3000/messages/sortie/SORTIE_ID?page=1&limit=50 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Test WebSocket Connection (Node.js)

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3000/chat', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

socket.on('connected', (data) => {
  console.log('Connected:', data);
  
  // Join a room
  socket.emit('joinRoom', {
    sortieId: 'SORTIE_ID'
  });
});

socket.on('joinedRoom', (data) => {
  console.log('Joined room:', data);
  
  // Send a message
  socket.emit('sendMessage', {
    sortieId: 'SORTIE_ID',
    type: 'text',
    content: 'Hello from WebSocket!'
  });
});

socket.on('receiveMessage', (data) => {
  console.log('New message:', data);
});

socket.on('error', (error) => {
  console.error('Error:', error);
});
```

### 4. Environment Variables

Ensure your `.env` file has:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=7d

# MongoDB
MONGO_URI=mongodb://localhost:27017/your-database

# Cloudinary (for media uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 5. Test Complete Flow

1. **Create a Sortie** → Chat is automatically created
   ```
   POST /sorties
   ```

2. **Another user requests participation**
   ```
   POST /participations
   Body: { "sortieId": "..." }
   ```

3. **Creator accepts participation** → User automatically added to chat
   ```
   PATCH /participations/:id/status
   Body: { "status": "ACCEPTEE" }
   ```

4. **Users connect via WebSocket and chat**
   ```javascript
   socket.emit('joinRoom', { sortieId: '...' });
   socket.emit('sendMessage', { sortieId: '...', type: 'text', content: 'Hi!' });
   ```

## Available Endpoints

### Chat Endpoints
- `GET /chats` - Get all user's chats
- `GET /chats/sortie/:sortieId` - Get chat by sortie
- `GET /chats/:chatId` - Get chat by ID
- `GET /chats/sortie/:sortieId/members` - Get chat members

### Message Endpoints
- `GET /messages/sortie/:sortieId` - Get messages (paginated)
- `POST /messages/sortie/:sortieId` - Send message
- `POST /messages/upload` - Upload media file
- `DELETE /messages/:messageId` - Delete message
- `POST /messages/:messageId/read` - Mark as read

### Participation Endpoint (New)
- `PATCH /participations/:id/status` - Accept/reject participation (triggers chat membership)

### WebSocket Events
- **Client → Server:** `joinRoom`, `sendMessage`, `typing`, `markAsRead`, `leaveRoom`
- **Server → Client:** `connected`, `receiveMessage`, `userTyping`, `messageRead`, `notification`, `error`

## Common Issues & Solutions

### Issue: WebSocket connection fails
**Solution:** Check that the server is running and CORS is configured correctly in `chat.gateway.ts`

### Issue: "You are not a member of this chat"
**Solution:** Ensure participation status is `ACCEPTEE`. Only the creator and accepted participants can access the chat.

### Issue: Messages not showing up
**Solution:** Make sure you've joined the room first with `joinRoom` event before sending messages.

### Issue: Media upload fails
**Solution:** Verify Cloudinary credentials are set in `.env` file.

## Security Notes

⚠️ **Important Security Considerations:**

1. **JWT Secret**: Change `JWT_SECRET` in production to a strong random value
2. **CORS**: Update CORS settings in `chat.gateway.ts` to match your frontend domain
3. **Rate Limiting**: Consider adding rate limiting to prevent spam
4. **File Upload Limits**: Configure max file sizes for media uploads
5. **Message Validation**: Add content moderation if needed

## Next Development Steps

1. **Add Rate Limiting** - Prevent message spam
2. **Message Search** - Add full-text search on messages
3. **File Size Limits** - Enforce upload size restrictions
4. **Push Notifications** - Integrate with Firebase/OneSignal for mobile notifications
5. **Message Reactions** - Add emoji reactions to messages
6. **Voice/Video Calls** - Integrate WebRTC for calls
7. **Message Editing** - Allow users to edit sent messages
8. **Admin Features** - Message moderation, user banning

## Documentation

For complete documentation, see:
- **CHAT_SYSTEM_DOCUMENTATION.md** - Full system documentation
- **Code Comments** - All files are heavily commented

## Support

If you encounter any issues:
1. Check the logs in your terminal
2. Verify all environment variables are set
3. Ensure MongoDB is running
4. Check that JWT tokens are valid
5. Review the documentation files

## Testing Tools

**Recommended tools for testing:**
- **Postman** - REST API testing
- **Socket.IO Client** - WebSocket testing (https://socket.io/docs/v4/client-api/)
- **MongoDB Compass** - Database inspection

---

**Congratulations! Your real-time chat system is ready to use! 🎉**
