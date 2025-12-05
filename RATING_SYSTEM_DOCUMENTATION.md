# Rating System Documentation

## Overview

The Rating System allows users to rate sorties (outdoor activities) they have participated in. The system tracks both individual sortie ratings and aggregated creator ratings, providing valuable feedback for both participants and activity organizers.

## Features

- **Sortie Ratings**: Users can rate sorties on a scale of 1-5 stars with optional comments
- **Creator Ratings**: Aggregated rating summaries for all sorties created by a user
- **Membership Validation**: Only accepted participants can rate sorties
- **Self-Rating Prevention**: Creators cannot rate their own sorties
- **Real-time Aggregation**: Ratings are automatically aggregated and cached for performance
- **Pagination Support**: Efficiently browse through ratings with pagination
- **JWT Authentication**: All endpoints are protected with JWT authentication

## Data Model

### Rating Schema

```typescript
{
  userId: ObjectId,          // Reference to User who rated
  sortieId: ObjectId,        // Reference to Sortie being rated
  stars: Number,             // Rating value (1-5)
  comment?: String,          // Optional comment
  createdAt: Date,          // Auto-generated timestamp
  updatedAt: Date           // Auto-generated timestamp
}
```

**Indexes:**
- Unique compound index on `(userId, sortieId)` - ensures one rating per user per sortie
- Index on `sortieId` - efficient queries by sortie
- Index on `userId` - efficient queries by user

### Extended Schemas

**Sortie Schema:**
```typescript
{
  ...existing fields,
  ratingSummary: {
    average: Number,        // Average rating (0-5, rounded to 1 decimal)
    count: Number          // Total number of ratings
  }
}
```

**User Schema:**
```typescript
{
  ...existing fields,
  creatorRatingSummary: {
    average: Number,        // Average rating across all creator's sorties
    count: Number          // Total number of ratings received
  }
}
```

## API Endpoints

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### 1. Rate a Sortie

**POST** `/ratings/sortie/:sortieId`

Create or update a rating for a sortie.

**Path Parameters:**
- `sortieId` (string) - ID of the sortie to rate

**Request Body:**
```json
{
  "stars": 4,
  "comment": "Great experience! Very well organized."
}
```

**Response:** `201 Created`
```json
{
  "id": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "sortieId": "507f1f77bcf86cd799439013",
  "stars": 4,
  "comment": "Great experience! Very well organized.",
  "createdAt": "2025-12-05T10:30:00.000Z",
  "updatedAt": "2025-12-05T10:30:00.000Z"
}
```

**Business Rules:**
- User must be an accepted participant of the sortie
- Creator cannot rate their own sortie
- Stars must be between 1 and 5
- Updates existing rating if one exists (upsert)

**Error Responses:**
- `400` - Invalid sortie ID or stars out of range
- `403` - Self-rating attempt, not a participant, or participation not accepted
- `404` - Sortie not found

---

### 2. Delete Your Rating

**DELETE** `/ratings/sortie/:sortieId`

Delete the authenticated user's rating for a sortie.

**Path Parameters:**
- `sortieId` (string) - ID of the sortie

**Response:** `204 No Content`

**Business Rules:**
- User must be an accepted participant
- Only deletes the authenticated user's own rating

**Error Responses:**
- `400` - Invalid sortie ID
- `403` - Not a participant or participation not accepted
- `404` - Rating or sortie not found

---

### 3. Get Ratings for a Sortie

**GET** `/ratings/sortie/:sortieId?page=1&limit=10`

Retrieve paginated ratings for a specific sortie.

**Path Parameters:**
- `sortieId` (string) - ID of the sortie

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 10)

**Response:** `200 OK`
```json
{
  "ratings": [
    {
      "id": "507f1f77bcf86cd799439011",
      "userId": "507f1f77bcf86cd799439012",
      "sortieId": "507f1f77bcf86cd799439013",
      "stars": 5,
      "comment": "Excellent experience!",
      "createdAt": "2025-12-05T10:30:00.000Z",
      "updatedAt": "2025-12-05T10:30:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

**Error Responses:**
- `400` - Invalid sortie ID

---

### 4. Get Your Rating for a Sortie

**GET** `/ratings/sortie/:sortieId/me`

Retrieve the authenticated user's rating for a specific sortie.

**Path Parameters:**
- `sortieId` (string) - ID of the sortie

**Response:** `200 OK`
```json
{
  "id": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "sortieId": "507f1f77bcf86cd799439013",
  "stars": 4,
  "comment": "Great experience!",
  "createdAt": "2025-12-05T10:30:00.000Z",
  "updatedAt": "2025-12-05T10:30:00.000Z"
}
```

Returns `null` if the user hasn't rated the sortie.

**Error Responses:**
- `400` - Invalid sortie ID

---

### 5. Get Creator Rating Summary

**GET** `/ratings/creator/:userId`

Retrieve aggregated rating summary for all sorties created by a specific user.

**Path Parameters:**
- `userId` (string) - ID of the creator/user

**Response:** `200 OK`
```json
{
  "average": 4.2,
  "count": 15
}
```

**Error Responses:**
- `400` - Invalid user ID
- `404` - User not found

---

## Business Logic

### Rating Aggregation

When a rating is created, updated, or deleted:

1. **Sortie Rating Summary** is recomputed:
   - Aggregates all ratings for the sortie
   - Calculates average (rounded to 1 decimal place)
   - Counts total ratings
   - Updates `Sortie.ratingSummary`

2. **Creator Rating Summary** is recomputed:
   - Finds all sorties created by the user
   - Aggregates all ratings across these sorties
   - Calculates overall average
   - Updates `User.creatorRatingSummary`

### Performance Optimizations

- **Denormalized Summaries**: Pre-computed averages stored on Sortie and User documents for fast reads
- **Normalized Ratings**: Individual ratings stored separately for flexibility and data integrity
- **Database Indexes**: Optimized for common query patterns
- **Aggregation Pipeline**: Efficient MongoDB aggregation for summary calculations

### Validation Rules

| Rule | Enforcement | Error |
|------|-------------|-------|
| Stars range (1-5) | Service layer | `400 BadRequest` |
| Unique rating per user per sortie | Database index | Automatic upsert |
| Accepted participation required | Service layer | `403 Forbidden` |
| No self-rating | Service layer | `403 Forbidden` |
| Valid ObjectIds | Service layer | `400 BadRequest` |

## Usage Examples

### TypeScript/JavaScript Client

```typescript
// Rate a sortie
const rating = await fetch('/ratings/sortie/507f1f77bcf86cd799439013', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    stars: 5,
    comment: 'Amazing adventure!'
  })
});

// Get your rating
const myRating = await fetch('/ratings/sortie/507f1f77bcf86cd799439013/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Delete rating
await fetch('/ratings/sortie/507f1f77bcf86cd799439013', {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});

// Get creator rating summary
const creatorStats = await fetch('/ratings/creator/507f1f77bcf86cd799439012', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### cURL Examples

```bash
# Rate a sortie
curl -X POST http://localhost:3000/ratings/sortie/507f1f77bcf86cd799439013 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stars": 4, "comment": "Great experience!"}'

# Get ratings for a sortie
curl -X GET "http://localhost:3000/ratings/sortie/507f1f77bcf86cd799439013?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get creator rating summary
curl -X GET http://localhost:3000/ratings/creator/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Testing

### Unit Tests

Run the comprehensive unit tests:

```bash
npm test rating.service.spec.ts
npm test rating.controller.spec.ts
```

Test coverage includes:
- ✅ Successful rating creation/update
- ✅ Self-rating prevention
- ✅ Membership validation
- ✅ Stars range validation
- ✅ Rating deletion
- ✅ Pagination
- ✅ Summary computation
- ✅ Error handling

### Manual Testing Workflow

1. **Setup**: Create a sortie with user A, have user B join and get accepted
2. **Rate**: User B rates the sortie (should succeed)
3. **Self-rate**: User A tries to rate their own sortie (should fail with 403)
4. **Non-participant**: User C tries to rate (should fail with 403)
5. **Update**: User B updates their rating (should upsert)
6. **View**: Get sortie ratings and verify summary
7. **Creator**: Check user A's creator rating summary
8. **Delete**: User B deletes their rating
9. **Verify**: Confirm summaries updated correctly

## Integration Points

### With Sortie Module
- Reads sortie data for validation
- Updates `ratingSummary` on sorties
- Adds `findByCreator` helper method

### With User Module
- Reads user data for validation
- Updates `creatorRatingSummary` on users
- Adds `updateCreatorRatingSummary` helper method

### With Participation Module
- Validates user membership in sortie
- Enforces acceptance status requirement

### Future Enhancements (Optional)

- **Notifications**: Notify creator when they receive a new rating
- **Rating Trends**: Track rating changes over time
- **Moderation**: Flag inappropriate comments
- **Media**: Allow photo uploads with ratings
- **Replies**: Let creators respond to ratings
- **Sorting**: Sort ratings by helpful, recent, stars, etc.
- **Filtering**: Filter ratings by star count
- **Analytics**: Dashboard with rating insights

## Database Migrations

No explicit migration required. The new fields have default values:
- `Sortie.ratingSummary` defaults to `{ average: 0, count: 0 }`
- `User.creatorRatingSummary` defaults to `{ average: 0, count: 0 }`

Existing documents will automatically receive these defaults on first read.

## Monitoring and Maintenance

### Key Metrics to Monitor
- Average rating response time
- Rating creation/deletion rate
- Summary computation performance
- Failed validation attempts (indicates user confusion or bugs)

### Periodic Maintenance
- Optionally run a batch job to recompute all summaries for data integrity
- Monitor for orphaned ratings (ratings for deleted sorties)
- Archive old ratings if needed

## Support

For issues or questions about the rating system:
1. Check this documentation
2. Review the unit tests for examples
3. Check the Swagger API documentation at `/api`
4. Consult the inline code comments in the service layer
