# Poll System Quick Reference

## Core Endpoints

### Create Poll
```bash
POST /polls/:chatId
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "question": "Where to meet?",
  "options": ["Cafe A", "Park B"],
  "allowMultiple": false,
  "closesAt": "2025-12-31T23:59:59Z"
}
```

### Vote
```bash
POST /polls/:pollId/vote
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "optionIds": ["opt_xxx_0"]
}
```

### Close Poll
```bash
PATCH /polls/:pollId/close
Authorization: Bearer <JWT>
```

### Get Chat Polls
```bash
GET /polls/chat/:chatId?page=1&limit=10
Authorization: Bearer <JWT>
```

### Get Single Poll
```bash
GET /polls/:pollId
Authorization: Bearer <JWT>
```

## WebSocket Events

### Client → Server
```javascript
// Create poll
socket.emit('poll.create', {
  chatId: '...',
  poll: { question: '...', options: [...] }
});

// Vote
socket.emit('poll.vote', {
  pollId: '...',
  vote: { optionIds: [...] }
});

// Close
socket.emit('poll.close', {
  pollId: '...'
});
```

### Server → Client
```javascript
// Listen for events
socket.on('poll.created', (data) => { /* New poll */ });
socket.on('poll.voted', (data) => { /* Vote update */ });
socket.on('poll.closed', (data) => { /* Poll closed */ });
socket.on('poll.error', (data) => { /* Error */ });
```

## Business Rules

- ✅ Only chat members can create, vote, view polls
- ✅ Only creator can close poll
- ✅ Previous votes replaced when user votes again
- ✅ Expired polls auto-close on vote attempt
- ✅ Closed polls reject votes
- ✅ Single-choice (`allowMultiple: false`) allows 1 option
- ✅ Multiple-choice (`allowMultiple: true`) allows many options

## Response Format

```json
{
  "_id": "...",
  "chatId": "...",
  "creatorId": "...",
  "question": "...",
  "options": [
    { "optionId": "...", "text": "...", "votes": 5 }
  ],
  "allowMultiple": false,
  "closesAt": "...",
  "closed": false,
  "userVotedOptionIds": ["opt_xxx_0"],
  "totalVotes": 7,
  "createdAt": "...",
  "updatedAt": "..."
}
```

## Error Codes

- `400`: Poll closed/expired, invalid options, multiple votes not allowed
- `403`: Not a chat member, not creator (for close)
- `404`: Poll/chat not found

## Module Files

```
src/poll/
├── entities/
│   └── poll.schema.ts         # MongoDB schema
├── dto/
│   ├── create-poll.dto.ts     # Input validation
│   ├── vote.dto.ts            # Vote input
│   └── poll-response.dto.ts   # Response types
├── poll.service.ts            # Business logic
├── poll.controller.ts         # REST endpoints
├── poll.gateway.ts            # WebSocket events
└── poll.module.ts             # Module wiring
```

## Testing Commands

```bash
# Get JWT token first
TOKEN="your_jwt_token"
CHAT_ID="your_chat_id"

# Create poll
curl -X POST http://localhost:3000/polls/$CHAT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"Favorite?","options":["A","B","C"]}'

# Vote (replace POLL_ID)
curl -X POST http://localhost:3000/polls/POLL_ID/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"optionIds":["opt_xxx_0"]}'

# Get polls
curl http://localhost:3000/polls/chat/$CHAT_ID \
  -H "Authorization: Bearer $TOKEN"

# Close poll
curl -X PATCH http://localhost:3000/polls/POLL_ID/close \
  -H "Authorization: Bearer $TOKEN"
```

## Common Queries

```javascript
// Find all open polls
db.polls.find({ closed: false });

// Find user's votes
db.polls.find({ "votes.userId": ObjectId("...") });

// Find expired polls
db.polls.find({ 
  closesAt: { $lt: new Date() }, 
  closed: false 
});

// Count total votes in poll
db.polls.aggregate([
  { $match: { _id: ObjectId("...") } },
  { $project: { totalVotes: { $size: "$votes" } } }
]);
```

## Integration Checklist

- [ ] PollModule imported in AppModule
- [ ] JWT authentication configured
- [ ] ChatModule available for membership checks
- [ ] MongoDB connection active
- [ ] WebSocket namespace `/chat` configured
- [ ] Room naming convention matches ChatGateway
- [ ] Indexes created on startup

## Key Features

✨ **Single/Multiple Choice**: Toggle with `allowMultiple`  
⏰ **Expiration**: Optional `closesAt` timestamp  
🔒 **Privacy**: User votes tracked, but can be made anonymous  
📊 **Real-time**: WebSocket broadcasts for instant updates  
🔐 **Security**: JWT + membership validation on all operations  
♻️ **Vote Changes**: Previous votes replaced, not accumulated

## Swagger Documentation

Access at: `http://localhost:3000/api` (if Swagger enabled)

Filter by tag: **Polls**
