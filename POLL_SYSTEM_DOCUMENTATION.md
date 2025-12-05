# Poll/Survey System Documentation

## Overview

The Poll (Sondage) system enables chat members to create, vote on, and manage polls within group chats. Each poll supports single or multiple-choice voting, optional expiration dates, and real-time updates via WebSocket.

## Architecture

### Core Components

1. **PollSchema** (`poll.schema.ts`): MongoDB schema with embedded options and votes
2. **PollService** (`poll.service.ts`): Business logic with chat membership validation
3. **PollController** (`poll.controller.ts`): RESTful API endpoints (JWT-protected)
4. **PollGateway** (`poll.gateway.ts`): WebSocket events for real-time updates
5. **DTOs**: Input validation and response formatting

### Data Model

```typescript
Poll {
  _id: ObjectId
  chatId: ObjectId (ref: Chat)
  creatorId: ObjectId (ref: User)
  question: string
  options: [
    {
      optionId: string (unique identifier)
      text: string
      votes: number (counter)
    }
  ]
  votes: [
    {
      userId: ObjectId
      optionId: string
      votedAt: Date
    }
  ]
  allowMultiple: boolean (default: false)
  closesAt: Date | null
  closed: boolean (default: false)
  createdAt: Date
  updatedAt: Date
}
```

### Indexes

- `chatId` + `createdAt` (DESC): List polls by chat
- `chatId` + `votes.userId`: Check user votes efficiently

## API Endpoints

### 1. Create Poll

**Endpoint:** `POST /polls/:chatId`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "question": "Where should we meet?",
  "options": ["Cafe A", "Park B", "Library C"],
  "allowMultiple": false,
  "closesAt": "2025-12-31T23:59:59.000Z"
}
```

**Response:** `201 Created`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "chatId": "507f1f77bcf86cd799439012",
  "creatorId": "507f1f77bcf86cd799439013",
  "question": "Where should we meet?",
  "options": [
    {
      "optionId": "opt_1234567890_0",
      "text": "Cafe A",
      "votes": 0
    },
    {
      "optionId": "opt_1234567890_1",
      "text": "Park B",
      "votes": 0
    },
    {
      "optionId": "opt_1234567890_2",
      "text": "Library C",
      "votes": 0
    }
  ],
  "allowMultiple": false,
  "closesAt": "2025-12-31T23:59:59.000Z",
  "closed": false,
  "userVotedOptionIds": [],
  "totalVotes": 0,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

**Validation Rules:**
- User must be a chat member
- At least 2 options required
- Question is required

### 2. Vote on Poll

**Endpoint:** `POST /polls/:pollId/vote`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "optionIds": ["opt_1234567890_0"]
}
```

**Response:** `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "chatId": "507f1f77bcf86cd799439012",
  "creatorId": "507f1f77bcf86cd799439013",
  "question": "Where should we meet?",
  "options": [
    {
      "optionId": "opt_1234567890_0",
      "text": "Cafe A",
      "votes": 1
    },
    // ... other options
  ],
  "allowMultiple": false,
  "closesAt": "2025-12-31T23:59:59.000Z",
  "closed": false,
  "userVotedOptionIds": ["opt_1234567890_0"],
  "totalVotes": 1,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:05:00.000Z"
}
```

**Business Rules:**
- Previous votes by the same user are replaced
- Poll must not be closed or expired
- For `allowMultiple: false`, only 1 option allowed
- For `allowMultiple: true`, multiple options allowed
- Vote counts updated atomically

**Error Codes:**
- `400`: Poll closed/expired, invalid options, multiple votes not allowed
- `403`: User not a chat member
- `404`: Poll not found

### 3. Close Poll

**Endpoint:** `PATCH /polls/:pollId/close`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:** `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  // ... poll details
  "closed": true
}
```

**Authorization:**
- Only the poll creator can close it

**Error Codes:**
- `403`: User is not the creator
- `400`: Poll already closed
- `404`: Poll not found

### 4. Get Chat Polls

**Endpoint:** `GET /polls/chat/:chatId?page=1&limit=10`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:** `200 OK`
```json
{
  "polls": [
    {
      "_id": "507f1f77bcf86cd799439011",
      // ... poll details
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

**Query Parameters:**
- `page` (optional): Page number, default 1
- `limit` (optional): Items per page, default 10

**Features:**
- Polls sorted by creation date (newest first)
- Includes user's vote status in each poll
- Only accessible to chat members

### 5. Get Single Poll

**Endpoint:** `GET /polls/:pollId`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:** `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  // ... complete poll details
}
```

**Features:**
- Includes current user's votes
- Real-time vote counts
- Only accessible to chat members

## WebSocket Events

### Client → Server

#### 1. Create Poll via WebSocket

**Event:** `poll.create`

**Payload:**
```json
{
  "chatId": "507f1f77bcf86cd799439012",
  "poll": {
    "question": "Where should we meet?",
    "options": ["Cafe A", "Park B", "Library C"],
    "allowMultiple": false,
    "closesAt": "2025-12-31T23:59:59.000Z"
  }
}
```

**Server Response (to creator):** `poll.createSuccess`
```json
{
  "poll": { /* ... poll object ... */ },
  "message": "Poll created successfully"
}
```

**Broadcast (to all room members):** `poll.created`
```json
{
  "poll": { /* ... poll object ... */ },
  "message": "New poll created"
}
```

#### 2. Vote via WebSocket

**Event:** `poll.vote`

**Payload:**
```json
{
  "pollId": "507f1f77bcf86cd799439011",
  "vote": {
    "optionIds": ["opt_1234567890_0"]
  }
}
```

**Server Response (to voter):** `poll.voteSuccess`
```json
{
  "poll": { /* ... updated poll ... */ },
  "message": "Vote recorded successfully"
}
```

**Broadcast (to all room members):** `poll.voted`
```json
{
  "poll": { /* ... updated poll ... */ },
  "userId": "507f1f77bcf86cd799439013",
  "optionIds": ["opt_1234567890_0"],
  "message": "Poll updated with new vote"
}
```

#### 3. Close Poll via WebSocket

**Event:** `poll.close`

**Payload:**
```json
{
  "pollId": "507f1f77bcf86cd799439011"
}
```

**Server Response (to closer):** `poll.closeSuccess`
```json
{
  "poll": { /* ... closed poll ... */ },
  "message": "Poll closed successfully"
}
```

**Broadcast (to all room members):** `poll.closed`
```json
{
  "poll": { /* ... closed poll ... */ },
  "message": "Poll has been closed"
}
```

### Server → Client

#### Error Event

**Event:** `poll.error`

**Payload:**
```json
{
  "action": "vote",
  "message": "Poll has expired"
}
```

## Security & Validation

### Authentication
- All endpoints require JWT authentication via `JwtAuthGuard`
- WebSocket requires JWT token in handshake

### Authorization
- **Create Poll**: Must be a chat member
- **Vote**: Must be a chat member
- **Close**: Must be the poll creator
- **View**: Must be a chat member

### Membership Validation
- Uses `ChatService.getChatById()` to verify membership
- Checks if `userId` exists in `chat.members` array

### Input Validation
- **CreatePollDto**: 
  - `question`: Required string
  - `options`: Array with min 2 items
  - `allowMultiple`: Optional boolean
  - `closesAt`: Optional ISO 8601 date
- **VoteDto**:
  - `optionIds`: Array with min 1 item, each a string

## Room Naming Convention

**Important:** The `PollGateway` uses room name format `chat_<chatId>`.

If your `ChatGateway` uses a different format (e.g., `sortie_<sortieId>`), you'll need to adjust:

```typescript
// Current format in PollGateway
const roomName = `chat_${chatId}`;

// If ChatGateway uses sortie rooms, you need sortieId from chat
const chat = await this.chatService.getChatById(chatId);
const roomName = `sortie_${chat.sortieId}`;
```

## Integration with REST Controller

For REST API operations (via `PollController`), you can optionally broadcast events using the gateway's helper methods:

```typescript
// In PollController or PollService
constructor(
  private readonly pollService: PollService,
  private readonly pollGateway: PollGateway,
) {}

async createPoll(...) {
  const poll = await this.pollService.createPoll(...);
  
  // Broadcast to WebSocket clients
  this.pollGateway.broadcastPollCreated(poll.chatId, poll);
  
  return poll;
}
```

## Usage Examples

### Frontend Integration (Example)

#### REST API (HTTP)

```typescript
// Create poll
const response = await fetch(`/polls/${chatId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    question: "Where should we meet?",
    options: ["Cafe A", "Park B"],
    allowMultiple: false,
    closesAt: "2025-12-31T23:59:59.000Z"
  })
});
const poll = await response.json();

// Vote
await fetch(`/polls/${pollId}/vote`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    optionIds: ["opt_1234567890_0"]
  })
});

// Close poll
await fetch(`/polls/${pollId}/close`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get polls
const response = await fetch(`/polls/chat/${chatId}?page=1&limit=10`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { polls, total, page, limit, totalPages } = await response.json();
```

#### WebSocket (Socket.io)

```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/chat', {
  auth: {
    token: jwtToken
  }
});

// Listen for poll events
socket.on('poll.created', (data) => {
  console.log('New poll:', data.poll);
  // Update UI with new poll
});

socket.on('poll.voted', (data) => {
  console.log('Poll voted:', data.poll);
  // Update vote counts in UI
});

socket.on('poll.closed', (data) => {
  console.log('Poll closed:', data.poll);
  // Disable voting UI
});

socket.on('poll.error', (data) => {
  console.error('Poll error:', data.message);
});

// Create poll via WebSocket
socket.emit('poll.create', {
  chatId: '507f1f77bcf86cd799439012',
  poll: {
    question: "Where should we meet?",
    options: ["Cafe A", "Park B"],
    allowMultiple: false
  }
});

// Vote via WebSocket
socket.emit('poll.vote', {
  pollId: '507f1f77bcf86cd799439011',
  vote: {
    optionIds: ["opt_1234567890_0"]
  }
});

// Close poll via WebSocket
socket.emit('poll.close', {
  pollId: '507f1f77bcf86cd799439011'
});
```

## Testing

### Manual Testing with REST API

```bash
# 1. Create a poll
curl -X POST http://localhost:3000/polls/YOUR_CHAT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Favorite food?",
    "options": ["Pizza", "Burger", "Salad"],
    "allowMultiple": true
  }'

# 2. Vote on poll
curl -X POST http://localhost:3000/polls/YOUR_POLL_ID/vote \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "optionIds": ["opt_1234567890_0", "opt_1234567890_1"]
  }'

# 3. Get chat polls
curl http://localhost:3000/polls/chat/YOUR_CHAT_ID?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 4. Close poll
curl -X PATCH http://localhost:3000/polls/YOUR_POLL_ID/close \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 5. Get single poll
curl http://localhost:3000/polls/YOUR_POLL_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Common Issues

1. **"You must be a chat member" error**
   - Verify user is in `chat.members` array
   - Check JWT token contains correct `userId`

2. **"Poll has expired" error**
   - Check if current time > `poll.closesAt`
   - Poll automatically closes when expired

3. **WebSocket events not broadcasting**
   - Verify room naming matches between `ChatGateway` and `PollGateway`
   - Check if clients have joined the room via `joinRoom` event

4. **Indexes not created**
   - Check server logs for "✅ Poll indexes created successfully"
   - Manually trigger: `db.polls.createIndexes()`

### Database Queries

```javascript
// Find all polls for a chat
db.polls.find({ chatId: ObjectId("...") }).sort({ createdAt: -1 });

// Find user's votes across all polls
db.polls.find({ "votes.userId": ObjectId("...") });

// Count votes per option
db.polls.aggregate([
  { $match: { _id: ObjectId("...") } },
  { $unwind: "$options" },
  { $project: { optionId: "$options.optionId", text: "$options.text", votes: "$options.votes" } }
]);

// Find expired but not closed polls
db.polls.find({ 
  closesAt: { $lt: new Date() }, 
  closed: false 
});
```

## Future Enhancements

1. **Anonymous Voting**: Hide voter identities
2. **Timed Auto-close**: Background job to close expired polls
3. **Poll Templates**: Predefined poll types
4. **Vote History**: Track vote changes over time
5. **Results Export**: Download poll results as CSV
6. **Notifications**: Alert users when polls are created/closed
7. **Poll Reminders**: Notify users who haven't voted

## Related Modules

- **ChatModule**: Provides chat membership validation via `ChatService`
- **AuthModule**: JWT authentication and guards
- **UserModule**: User profile data for vote attribution

## API Summary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/polls/:chatId` | Create poll | JWT |
| POST | `/polls/:pollId/vote` | Vote on poll | JWT |
| PATCH | `/polls/:pollId/close` | Close poll | JWT (creator) |
| GET | `/polls/chat/:chatId` | List chat polls | JWT |
| GET | `/polls/:pollId` | Get single poll | JWT |

## WebSocket Events Summary

| Event | Direction | Description |
|-------|-----------|-------------|
| `poll.create` | Client → Server | Create poll |
| `poll.vote` | Client → Server | Submit vote |
| `poll.close` | Client → Server | Close poll |
| `poll.created` | Server → Room | New poll notification |
| `poll.voted` | Server → Room | Vote update |
| `poll.closed` | Server → Room | Poll closed notification |
| `poll.createSuccess` | Server → Client | Confirm creation |
| `poll.voteSuccess` | Server → Client | Confirm vote |
| `poll.closeSuccess` | Server → Client | Confirm close |
| `poll.error` | Server → Client | Error notification |
