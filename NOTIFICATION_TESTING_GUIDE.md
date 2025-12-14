# 🧪 Testing Notifications in Swagger - Step by Step Guide

## Prerequisites
✅ Server is running on `http://localhost:10000`
✅ Swagger UI available at `http://localhost:10000/api`
✅ Firebase Admin SDK credentials configured in `.env`

---

## Step 1: Get a Test FCM Token

Since you don't have a mobile app yet, you can use a **dummy token for testing** or use Firebase Console to generate one.

### Option A: Use a Dummy Token (for backend testing only)
```
dummy-fcm-token-12345-test
```
*Note: This won't send real notifications, but tests the backend logic*

### Option B: Get Real Token from Firebase Console
1. Go to Firebase Console → Project Settings → Cloud Messaging
2. Use Firebase's test token generation or Firebase Admin SDK tester

---

## Step 2: Login to Get JWT Token

### 2.1 Open Swagger UI
```
http://localhost:10000/api
```

### 2.2 Find `/auth/login` Endpoint
- Expand the **auth** section
- Click on `POST /auth/login`

### 2.3 Try it Out
Click **"Try it out"** button

### 2.4 Enter Login Credentials
```json
{
  "email": "your-test-user@example.com",
  "password": "your-password"
}
```

### 2.5 Execute and Copy Token
- Click **"Execute"**
- Copy the `access_token` from the response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Step 3: Authorize in Swagger

### 3.1 Click the "Authorize" Button
- Look for the 🔒 **"Authorize"** button at the top right of Swagger UI
- Click it

### 3.2 Enter Bearer Token
In the popup:
```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*Important: Include the word "Bearer" followed by a space, then your token*

### 3.3 Click "Authorize"
- Click the **"Authorize"** button in the popup
- Click **"Close"**
- You should now see 🔓 (unlocked) icon

---

## Step 4: Register Your FCM Token

### 4.1 Find `/notifications/register` Endpoint
- Expand the **notifications** section
- Click on `POST /notifications/register`

### 4.2 Try it Out
Click **"Try it out"** button

### 4.3 Enter Token Data
```json
{
  "token": "dummy-fcm-token-12345-test",
  "platform": "ios",
  "deviceId": "test-device-001"
}
```

### 4.4 Execute
- Click **"Execute"**
- Should return **200 OK**:
```json
{
  "success": true,
  "message": "Token FCM enregistré avec succès",
  "data": {
    "tokenId": "...",
    "isActive": true
  }
}
```

---

## Step 5: Verify Token Registration

### 5.1 Find `/notifications/tokens` Endpoint
- Click on `GET /notifications/tokens`

### 5.2 Execute
- Click **"Try it out"**
- Click **"Execute"**
- Should return your registered token:
```json
{
  "success": true,
  "data": {
    "count": 1,
    "tokens": ["dummy-fcm-token-12345-test"]
  }
}
```

---

## Step 6: Send Test Notification to Yourself

### 6.1 Find `/notifications/test` Endpoint
- Click on `POST /notifications/test`

### 6.2 Try it Out
Click **"Try it out"** button

### 6.3 (Optional) Customize Message
```json
{
  "title": "My Test Title",
  "message": "This is my custom test message!"
}
```
*Or leave empty to use default test message*

### 6.4 Execute
- Click **"Execute"**
- Should return **200 OK**:
```json
{
  "success": true,
  "message": "Test notification sent successfully!",
  "data": {
    "successCount": 1,
    "failureCount": 0
  }
}
```

### 6.5 Check Server Logs
Look at your terminal for logs like:
```
🔍 Recherche de tokens pour les utilisateurs: ["6..."]
🎫 Tokens actifs trouvés: 1 token(s)
📤 Envoi de 1 notification(s)...
✅ Résultat: 1 succès, 0 échecs
```

---

## Step 7: Send Notification to Multiple Users

### 7.1 Find `/notifications/send` Endpoint
- Click on `POST /notifications/send`

### 7.2 Try it Out
Click **"Try it out"** button

### 7.3 Enter Notification Data
```json
{
  "userIds": ["USER_ID_1", "USER_ID_2"],
  "title": "Team Announcement",
  "message": "Meeting scheduled for tomorrow at 10 AM",
  "data": {
    "meetingId": "123",
    "type": "meeting"
  },
  "imageUrl": "https://example.com/image.jpg"
}
```
*Replace USER_ID_1, USER_ID_2 with actual user IDs from your database*

### 7.4 Execute
- Click **"Execute"**
- Check the success/failure counts

---

## 📊 Expected Results

### ✅ Success Indicators:
- All endpoints return **200 OK**
- Token registration shows `"isActive": true`
- Test notification shows `"successCount": 1`
- Server logs show notification sent successfully

### ❌ If You See Failures:

**401 Unauthorized**
- You forgot to authorize with JWT token
- Token expired (login again)
- Click "Authorize" button and enter `Bearer <token>`

**"No FCM tokens found"**
- Register token first using `/notifications/register`
- Check token is active using `/notifications/tokens`

**Firebase Error in Logs**
- Check `.env` has valid `FIREBASE_ADMIN_CREDENTIALS`
- Verify private_key has `\\n` (double backslash)
- Restart server after fixing credentials

**"successCount: 0, failureCount: 1"**
- Using dummy token (expected - won't send real notification)
- Invalid FCM token
- Firebase project credentials mismatch

---

## 🔍 Debugging Tips

### Check Server Logs
Your NestJS server logs will show:
```
🔍 Recherche de tokens pour les utilisateurs: [...]
🎫 Tokens actifs trouvés: X token(s)
📤 Envoi de X notification(s)...
✅ Résultat: X succès, Y échecs
```

### Check Database
```bash
# Connect to MongoDB and check tokens
mongosh "your-mongo-uri"
use your-database
db.fcmtokens.find({}).pretty()
```

### Test with Real Firebase Token
1. Create a simple web app with Firebase SDK
2. Get actual FCM token
3. Register it via Swagger
4. Test notification - should appear in browser

---

## 🎯 Next Steps After Swagger Testing

Once Swagger tests pass:

1. **iOS App Integration**:
   - Add Firebase SDK to iOS project
   - Implement token registration on app launch
   - Call `/notifications/register` with real FCM token
   - Test receiving notifications on device

2. **Android App Integration**:
   - Add Firebase SDK to Android project
   - Same registration flow
   - Test on Android device

3. **Production Checklist**:
   - [ ] Real FCM tokens tested
   - [ ] Notifications appear on devices
   - [ ] Multi-user notifications work
   - [ ] Publication notifications trigger correctly
   - [ ] Token cleanup job scheduled (optional)

---

## 📝 Quick Test Sequence

```
1. Login → Copy access_token
2. Authorize → Paste "Bearer <token>"
3. POST /notifications/register → Register FCM token
4. GET /notifications/tokens → Verify token saved
5. POST /notifications/test → Send test notification
6. Check logs → See success message
```

**Estimated time: 5 minutes**

---

## 🆘 Need Help?

If notifications aren't working:
1. Check Firebase credentials in `.env`
2. Restart server after credential changes
3. Verify JWT token is valid (not expired)
4. Check server logs for error details
5. Try with dummy token first to test backend flow

**Remember**: With dummy tokens, backend will succeed but no real notification is sent. For real testing, use actual FCM tokens from Firebase or a mobile app.
