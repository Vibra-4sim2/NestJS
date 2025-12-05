# Rating System - Quick Reference

## Quick Start

### Rate a Sortie
```bash
POST /ratings/sortie/:sortieId
{
  "stars": 4,
  "comment": "Optional comment"
}
```

### Get Your Rating
```bash
GET /ratings/sortie/:sortieId/me
```

### Delete Rating
```bash
DELETE /ratings/sortie/:sortieId
```

## Key Rules

✅ **Can Rate If:**
- You are an accepted participant
- You are not the creator
- Stars are between 1-5

❌ **Cannot Rate If:**
- You created the sortie
- You're not a participant
- Your participation is pending/refused

## Data Structure

### Rating
```typescript
{
  userId: ObjectId,
  sortieId: ObjectId,
  stars: 1-5,
  comment?: string
}
```

### Sortie Summary
```typescript
{
  ratingSummary: {
    average: number,  // 0-5, rounded to 1 decimal
    count: number     // total ratings
  }
}
```

### Creator Summary
```typescript
{
  creatorRatingSummary: {
    average: number,  // across all creator's sorties
    count: number     // total ratings received
  }
}
```

## All Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ratings/sortie/:sortieId` | Create/update rating |
| DELETE | `/ratings/sortie/:sortieId` | Delete your rating |
| GET | `/ratings/sortie/:sortieId?page=&limit=` | List ratings (paginated) |
| GET | `/ratings/sortie/:sortieId/me` | Get your rating |
| GET | `/ratings/creator/:userId` | Get creator summary |

## Common Errors

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Invalid input | Check sortieId format, stars (1-5) |
| 403 | Self-rating | Creators can't rate own sorties |
| 403 | Not participant | Join and get accepted first |
| 404 | Not found | Check if sortie/user exists |

## Testing Checklist

- [ ] Create rating as accepted participant
- [ ] Update existing rating (upsert)
- [ ] Try rating own sortie (should fail)
- [ ] Try rating without participation (should fail)
- [ ] View sortie ratings with pagination
- [ ] Check sortie rating summary
- [ ] Check creator rating summary
- [ ] Delete rating
- [ ] Verify summaries updated

## Module Files

```
src/rating/
├── entities/
│   └── rating.schema.ts          # Mongoose schema
├── dto/
│   ├── create-rating.dto.ts      # Input validation
│   └── rating-response.dto.ts    # Response types
├── rating.service.ts             # Business logic
├── rating.controller.ts          # API endpoints
├── rating.module.ts              # Module definition
├── rating.service.spec.ts        # Service tests
└── rating.controller.spec.ts     # Controller tests
```

## Quick Implementation Notes

**Automatic Updates:**
- Rating summaries update automatically on create/update/delete
- Uses MongoDB aggregation for efficiency
- Denormalized for read performance

**Validation:**
- JWT authentication on all endpoints
- Participation status checked via database
- ObjectId validation for all IDs
- Stars range validated (1-5)

**Performance:**
- Compound unique index on (userId, sortieId)
- Separate indexes on userId and sortieId
- Aggregation pipeline for summaries
- Cached summaries on Sortie and User documents
