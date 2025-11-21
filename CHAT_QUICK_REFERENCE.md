# Chat System - Quick Reference Card

## 🚀 Quick Start

```bash
# Start server
npm run start:dev

# WebSocket connects to: ws://localhost:3000/chat
# REST API base: http://localhost:3000
```

## 🔑 Authentication

All requests require JWT token:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 📡 REST API Cheat Sheet

```bash
# Get chat for sortie
GET /chats/sortie/:sortieId

# Get messages (paginated)
GET /messages/sortie/:sortieId?page=1&limit=50

# Send message
POST /messages/sortie/:sortieId
Body: { "type": "text", "content": "Hello!" }

# Upload media
POST /messages/upload
FormData: { file: <binary> }

# Accept participation (creator only) → adds to chat
PATCH /participations/:id/status
Body: { "status": "ACCEPTEE" }
```

## 🔌 WebSocket Quick Guide

### Connect
```javascript
const socket = io('http://localhost:3000/chat', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});
```

### Essential Events
```javascript
// Join room (required first)
socket.emit('joinRoom', { sortieId: '...' });

// Send message
socket.emit('sendMessage', {
  sortieId: '...',
  type: 'text',
  content: 'Hello!'
});

// Receive messages
socket.on('receiveMessage', (data) => {
  console.log(data.message);
});

// Typing indicator
socket.emit('typing', {
  sortieId: '...',
  isTyping: true
});
```

## 📦 Message Types

| Type | Required Fields | Example |
|------|----------------|---------|
| `text` | `content` | `{ type: 'text', content: 'Hi!' }` |
| `image` | `mediaUrl` | `{ type: 'image', mediaUrl: 'https://...' }` |
| `video` | `mediaUrl`, `mediaDuration` | `{ type: 'video', mediaUrl: '...', mediaDuration: 30 }` |
| `audio` | `mediaUrl`, `mediaDuration` | `{ type: 'audio', mediaUrl: '...', mediaDuration: 15 }` |
| `location` | `location` | `{ type: 'location', location: { latitude: 48.8, longitude: 2.3 } }` |

## 🎯 Common Workflows

### Create Sortie → Chat Auto-Created
```
POST /sorties → Chat created automatically
Creator becomes first member
Welcome message added
```

### Add User to Chat
```
1. User: POST /participations → Status: EN_ATTENTE
2. Creator: PATCH /participations/:id/status → Status: ACCEPTEE
3. System: User auto-added to chat
4. System: Broadcast notification
```

### Real-Time Chat
```
1. Connect WebSocket
2. emit('joinRoom', { sortieId })
3. on('joinedRoom') → Receive recent messages
4. emit('sendMessage') → Broadcast to all
5. on('receiveMessage') → Display new messages
```

### Media Upload
```
1. POST /messages/upload (file) → Returns URL
2. emit('sendMessage', { type: 'image', mediaUrl: url })
3. Message broadcast with media
```

## 🔐 Permission Matrix

| Action | Who Can Do It |
|--------|---------------|
| Create chat | System (auto on sortie creation) |
| Send message | Chat members (creator + accepted participants) |
| Read messages | Chat members only |
| Delete message | Message sender only |
| Accept/reject participation | Sortie creator only |
| Upload media | Authenticated users |

## 🛠 Debugging

```bash
# Check if WebSocket is running
curl http://localhost:3000/socket.io/

# Test REST endpoint
curl http://localhost:3000/chats \
  -H "Authorization: Bearer TOKEN"

# View MongoDB chats
db.chats.find().pretty()

# View messages
db.messages.find().sort({ createdAt: -1 }).limit(10)
```

## 📋 Environment Variables

```env
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d
MONGO_URI=mongodb://localhost:27017/database
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## ⚠️ Common Errors

| Error | Solution |
|-------|----------|
| "You are not a member of this chat" | Ensure participation is ACCEPTEE |
| "Authentication required" | Include JWT token in auth |
| "Invalid token" | Check token expiration and secret |
| "Chat not found" | Verify sortie exists and chat was created |
| WebSocket won't connect | Check CORS settings in chat.gateway.ts |

## 📊 Database Collections

```javascript
// Chat
{
  sortieId: ObjectId (unique),
  members: [ObjectId],
  lastMessage: ObjectId,
  createdAt, updatedAt
}

// Message
{
  chatId: ObjectId,
  sortieId: ObjectId,
  senderId: ObjectId,
  type: 'text'|'image'|'video'|'audio'|...,
  content: String,
  mediaUrl: String,
  createdAt, updatedAt
}
```

## 🎨 Frontend Integration

### React/Next.js
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/chat', {
  auth: { token: localStorage.getItem('token') }
});

socket.emit('joinRoom', { sortieId });
socket.on('receiveMessage', addMessageToState);
```

### React Native
```javascript
import io from 'socket.io-client';

const socket = io('http://your-api.com/chat', {
  auth: { token: await AsyncStorage.getItem('token') }
});
```

## 📞 Quick Links

- **Full Docs:** `CHAT_SYSTEM_DOCUMENTATION.md`
- **Setup Guide:** `CHAT_SETUP_GUIDE.md`
- **Summary:** `CHAT_IMPLEMENTATION_SUMMARY.md`

---

**Keep this card handy for quick reference during development!**
