# Poll System - Testing & Deployment Checklist

## ✅ Pre-Deployment Verification

### Code Quality
- [x] TypeScript compilation passes (no errors in poll module)
- [x] All files created without errors
- [x] DTOs use class-validator decorators
- [x] Service methods have proper error handling
- [x] Unit tests created (21 test cases total)

### Module Structure
- [x] Poll schema defined with proper types
- [x] Indexes defined in schema
- [x] Module implements OnModuleInit
- [x] PollModule imported in AppModule
- [x] ChatModule dependency configured

### Documentation
- [x] Comprehensive documentation (POLL_SYSTEM_DOCUMENTATION.md)
- [x] Quick reference guide (POLL_QUICK_REFERENCE.md)
- [x] Implementation summary (POLL_IMPLEMENTATION_SUMMARY.md)
- [x] Swagger decorators on controller endpoints

## 🧪 Testing Steps

### 1. Server Startup
```bash
cd "/Users/mohamedmami/Desktop/main /NestJS"
npm run start:dev
```

**Expected output:**
```
✅ Poll indexes created successfully
```

### 2. Get JWT Token
First, authenticate to get a token:
```bash
# Login as a user
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

Save the `access_token` from response.

### 3. Get Chat ID
Find or create a chat for testing:
```bash
# List user's chats or create a sortie (which auto-creates a chat)
curl http://localhost:3000/sorties \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Test Poll Creation
```bash
export TOKEN="YOUR_JWT_TOKEN"
export CHAT_ID="YOUR_CHAT_ID"

curl -X POST http://localhost:3000/polls/$CHAT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Where should we meet?",
    "options": ["Cafe Downtown", "Park Central", "Library"],
    "allowMultiple": false,
    "closesAt": "2025-12-31T23:59:59.000Z"
  }'
```

**Expected:** 201 Created with poll object

### 5. Test Voting
```bash
export POLL_ID="POLL_ID_FROM_STEP_4"

curl -X POST http://localhost:3000/polls/$POLL_ID/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "optionIds": ["opt_xxx_0"]
  }'
```

**Expected:** 200 OK with updated poll (vote count increased)

### 6. Test Vote Change
```bash
# Vote again with different option
curl -X POST http://localhost:3000/polls/$POLL_ID/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "optionIds": ["opt_xxx_1"]
  }'
```

**Expected:** Previous vote removed, new vote counted

### 7. Test Multiple Votes
```bash
# Create poll with allowMultiple
curl -X POST http://localhost:3000/polls/$CHAT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What activities?",
    "options": ["Hiking", "Swimming", "Camping", "Fishing"],
    "allowMultiple": true
  }'

# Vote for multiple options
export POLL_ID2="NEW_POLL_ID"
curl -X POST http://localhost:3000/polls/$POLL_ID2/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "optionIds": ["opt_xxx_0", "opt_xxx_2"]
  }'
```

**Expected:** Both votes recorded

### 8. Test Poll Listing
```bash
curl "http://localhost:3000/polls/chat/$CHAT_ID?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Paginated list with polls

### 9. Test Get Single Poll
```bash
curl http://localhost:3000/polls/$POLL_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Full poll details with user's votes

### 10. Test Poll Closure
```bash
curl -X PATCH http://localhost:3000/polls/$POLL_ID/close \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** 200 OK with `closed: true`

### 11. Test Closed Poll Vote Rejection
```bash
curl -X POST http://localhost:3000/polls/$POLL_ID/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"optionIds": ["opt_xxx_0"]}'
```

**Expected:** 400 Bad Request "Poll is closed"

## 🔒 Security Tests

### 1. Test Without JWT
```bash
curl -X POST http://localhost:3000/polls/$CHAT_ID \
  -H "Content-Type: application/json" \
  -d '{"question": "Test", "options": ["A", "B"]}'
```

**Expected:** 401 Unauthorized

### 2. Test Non-Member Access
```bash
# Login as different user not in chat
export TOKEN2="OTHER_USER_JWT"

curl http://localhost:3000/polls/chat/$CHAT_ID \
  -H "Authorization: Bearer $TOKEN2"
```

**Expected:** 403 Forbidden

### 3. Test Non-Creator Close
```bash
# Different user tries to close poll
curl -X PATCH http://localhost:3000/polls/$POLL_ID/close \
  -H "Authorization: Bearer $TOKEN2"
```

**Expected:** 403 Forbidden

## 🌐 WebSocket Tests

### Using Socket.io Client
```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3000/chat', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  
  // Create poll
  socket.emit('poll.create', {
    chatId: 'YOUR_CHAT_ID',
    poll: {
      question: 'Real-time test?',
      options: ['Yes', 'No']
    }
  });
});

socket.on('poll.created', (data) => {
  console.log('Poll created:', data);
});

socket.on('poll.createSuccess', (data) => {
  console.log('Create confirmed:', data);
});

socket.on('poll.error', (error) => {
  console.error('Error:', error);
});
```

## 🗄️ Database Verification

### MongoDB Shell Queries
```javascript
// Connect to MongoDB
use your_database_name;

// Check indexes created
db.polls.getIndexes();
// Should show: chatId_1_createdAt_-1, chatId_1_votes.userId_1

// Count polls
db.polls.countDocuments();

// View sample poll
db.polls.findOne();

// Find open polls
db.polls.find({ closed: false });

// Find polls with votes
db.polls.find({ "votes.0": { $exists: true } });

// Aggregate vote statistics
db.polls.aggregate([
  { $unwind: "$options" },
  { $group: {
    _id: "$_id",
    question: { $first: "$question" },
    totalVotes: { $sum: "$options.votes" }
  }}
]);
```

## 📊 Performance Tests

### Load Testing (Optional)
```bash
# Install Apache Bench
brew install ab  # macOS

# Test poll creation endpoint
ab -n 100 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -p poll-data.json \
  http://localhost:3000/polls/$CHAT_ID
```

## 🐛 Common Issues & Solutions

### Issue: "Poll indexes not created"
**Solution:**
```javascript
// Manually create indexes in MongoDB
db.polls.createIndex({ chatId: 1, createdAt: -1 });
db.polls.createIndex({ chatId: 1, "votes.userId": 1 });
```

### Issue: "ChatService not found"
**Solution:** Ensure ChatModule is imported in PollModule

### Issue: WebSocket events not working
**Solution:** 
- Check room naming convention matches ChatGateway
- Verify clients joined room via `joinRoom` event
- Check JWT authentication in handshake

### Issue: "Invalid option IDs"
**Solution:** Use exact `optionId` from poll response, not array index

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] All tests pass
- [ ] Environment variables configured
- [ ] MongoDB connection string set
- [ ] JWT secret configured
- [ ] CORS settings appropriate for production

### Deployment
- [ ] Build production bundle: `npm run build`
- [ ] Run production server: `npm run start:prod`
- [ ] Verify indexes created in production DB
- [ ] Monitor logs for errors
- [ ] Test with production credentials

### Post-Deployment
- [ ] Verify all endpoints accessible
- [ ] Test WebSocket connection
- [ ] Check database indexes
- [ ] Monitor performance metrics
- [ ] Set up error tracking (e.g., Sentry)

## 📈 Monitoring

### Metrics to Track
- Poll creation rate
- Vote submission rate
- Average votes per poll
- Closed poll percentage
- WebSocket connection count
- API response times

### Log Patterns to Monitor
```
✅ Poll indexes created successfully
Poll created: <pollId> by user <userId>
User <userId> voted on poll <pollId>
Poll <pollId> closed by creator <userId>
```

## 🎯 Success Criteria

All tests should pass:
- ✅ Poll creation works
- ✅ Voting records and updates counts
- ✅ Vote changes replace previous votes
- ✅ Multiple votes work when allowed
- ✅ Single vote enforced when required
- ✅ Closed polls reject votes
- ✅ Only creators can close polls
- ✅ Only members can access polls
- ✅ Pagination works
- ✅ WebSocket events broadcast
- ✅ Indexes exist in database

## 📞 Support

If issues arise:
1. Check server logs for error messages
2. Verify JWT token is valid and not expired
3. Ensure user is a member of the chat
4. Check MongoDB connection and indexes
5. Verify room names match between gateways
6. Review POLL_SYSTEM_DOCUMENTATION.md

---

**Status**: Ready for testing and deployment
**Version**: 1.0.0
**Last Updated**: 2025-01-15
