# Private Messaging System - Android Implementation Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Backend Architecture](#backend-architecture)
3. [WebSocket Events Reference](#websocket-events-reference)
4. [Android Implementation with Kotlin](#android-implementation-with-kotlin)
5. [Testing Guide](#testing-guide)
6. [Troubleshooting](#troubleshooting)

---

## System Overview

### What is the Private Messaging System?

The private messaging system is a **real-time, one-on-one chat feature** completely separate from the existing group chat (sortie-based) system. It allows users to:

- ✅ Send direct messages to any user
- ✅ Create private conversations with exactly 2 participants
- ✅ Receive real-time message notifications
- ✅ Track read/unread status
- ✅ Send text, images, videos, audio, files, and location
- ✅ View conversation history with pagination

### Key Differences from Group Chat

| Feature | Group Chat (Sorties) | Private Messaging |
|---------|---------------------|-------------------|
| **Namespace** | `/chat` | `/conversations` |
| **Participants** | Multiple (group) | Exactly 2 users |
| **Tied to** | Sortie events | Direct user-to-user |
| **Use Case** | Event coordination | Private communication |

---

## Backend Architecture

### Base URL
```
WebSocket: ws://YOUR_SERVER_IP:10000
HTTP: http://YOUR_SERVER_IP:10000
```

### Authentication
All connections require **JWT token** authentication passed via Socket.IO connection parameters.

### Database Schema

#### Conversation Document
```typescript
{
  _id: ObjectId,
  participants: [ObjectId, ObjectId],  // Exactly 2 users
  lastMessage: ObjectId,               // Reference to last message
  unreadCount: {
    "userId1": number,
    "userId2": number
  },
  mutedBy: {
    "userId": boolean
  },
  deletedBy: {
    "userId": boolean
  },
  lastReadAt: {
    "userId": Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### DirectMessage Document
```typescript
{
  _id: ObjectId,
  conversationId: ObjectId,
  senderId: ObjectId,
  recipientId: ObjectId,
  type: "text" | "image" | "video" | "audio" | "file" | "location",
  content: string,              // Text content or caption
  mediaUrl: string,             // For media messages
  thumbnailUrl: string,         // For videos
  mediaDuration: number,        // For audio/video (seconds)
  fileSize: number,             // File size in bytes
  fileName: string,             // Original filename
  mimeType: string,             // MIME type
  location: {
    latitude: number,
    longitude: number,
    address: string
  },
  replyTo: ObjectId,            // Reference to replied message
  tempId: string,               // Client-side temporary ID
  isRead: boolean,
  readAt: Date,
  status: "sent" | "delivered" | "read" | "failed",
  isDeleted: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## WebSocket Events Reference

### Namespace: `/conversations`

### Client → Server Events

#### 1. `getMyConversations`
**Description:** Retrieve all conversations for the authenticated user

**Payload:** None (uses authenticated user ID)

**Response Event:** `conversations`

**Example:**
```kotlin
socket.emit("getMyConversations")
```

---

#### 2. `initiateConversation`
**Description:** Create or retrieve a conversation with another user

**Payload:**
```json
{
  "recipientId": "string"  // MongoDB ObjectId of the other user
}
```

**Response Event:** `conversationCreated`

**Example:**
```kotlin
val payload = JSONObject().apply {
    put("recipientId", "69188c3dec31e5e23c3671ac")
}
socket.emit("initiateConversation", payload)
```

---

#### 3. `joinConversation`
**Description:** Join a conversation room to receive real-time messages

**Payload:**
```json
{
  "conversationId": "string"  // MongoDB ObjectId
}
```

**Response:** Joins the Socket.IO room, no explicit response

**Example:**
```kotlin
val payload = JSONObject().apply {
    put("conversationId", conversationId)
}
socket.emit("joinConversation", payload)
```

---

#### 4. `sendDirectMessage`
**Description:** Send a message in a conversation

**Payload:**
```json
{
  "conversationId": "string",
  "type": "text" | "image" | "video" | "audio" | "file" | "location",
  "content": "string",           // Required for text, optional for media
  "mediaUrl": "string",          // Required for media types
  "thumbnailUrl": "string",      // Optional, for videos
  "mediaDuration": number,       // Optional, for audio/video
  "fileSize": number,            // Optional
  "fileName": "string",          // Optional
  "mimeType": "string",          // Optional
  "location": {                  // Required for location type
    "latitude": number,
    "longitude": number,
    "address": "string"
  },
  "replyTo": "string",          // Optional, message ID
  "tempId": "string"            // Optional, client-side ID
}
```

**Response Event:** `receiveDirectMessage` (broadcast to conversation participants)

**Example:**
```kotlin
val payload = JSONObject().apply {
    put("conversationId", conversationId)
    put("type", "text")
    put("content", "Hello!")
}
socket.emit("sendDirectMessage", payload)
```

---

#### 5. `getMessages`
**Description:** Retrieve message history with pagination

**Payload:**
```json
{
  "conversationId": "string",
  "limit": number,              // Optional, default: 50
  "before": "string"            // Optional, message ID for cursor pagination
}
```

**Response Event:** `messageHistory`

**Example:**
```kotlin
val payload = JSONObject().apply {
    put("conversationId", conversationId)
    put("limit", 30)
}
socket.emit("getMessages", payload)
```

---

#### 6. `markAsRead`
**Description:** Mark all messages in a conversation as read

**Payload:**
```json
{
  "conversationId": "string"
}
```

**Response Event:** `messageRead` (broadcast to other participant)

**Example:**
```kotlin
val payload = JSONObject().apply {
    put("conversationId", conversationId)
}
socket.emit("markAsRead", payload)
```

---

#### 7. `typing`
**Description:** Send typing indicator

**Payload:**
```json
{
  "conversationId": "string",
  "isTyping": boolean
}
```

**Response Event:** `userTyping` (sent to other participant)

**Example:**
```kotlin
val payload = JSONObject().apply {
    put("conversationId", conversationId)
    put("isTyping", true)
}
socket.emit("typing", payload)
```

---

#### 8. `deleteConversation`
**Description:** Soft delete conversation (archive for current user)

**Payload:**
```json
{
  "conversationId": "string"
}
```

**Response:** Conversation removed from user's list

**Example:**
```kotlin
val payload = JSONObject().apply {
    put("conversationId", conversationId)
}
socket.emit("deleteConversation", payload)
```

---

#### 9. `muteConversation`
**Description:** Mute/unmute conversation notifications

**Payload:**
```json
{
  "conversationId": "string",
  "muted": boolean
}
```

**Response:** Conversation mute status updated

**Example:**
```kotlin
val payload = JSONObject().apply {
    put("conversationId", conversationId)
    put("muted", true)
}
socket.emit("muteConversation", payload)
```

---

### Server → Client Events

#### 1. `conversations`
**Description:** List of user's conversations

**Payload:**
```json
[
  {
    "_id": "string",
    "participants": [
      {
        "_id": "string",
        "name": "string",
        "email": "string",
        "avatar": "string"
      }
    ],
    "lastMessage": {
      "_id": "string",
      "content": "string",
      "type": "string",
      "createdAt": "ISO8601",
      "senderId": {
        "_id": "string",
        "name": "string",
        "avatar": "string"
      }
    },
    "unreadCount": {
      "userId": number
    },
    "updatedAt": "ISO8601"
  }
]
```

---

#### 2. `conversationCreated`
**Description:** Conversation created or retrieved

**Payload:**
```json
{
  "_id": "string",
  "participants": [...],
  "unreadCount": {},
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

---

#### 3. `receiveDirectMessage`
**Description:** New message received in a conversation

**Payload:**
```json
{
  "_id": "string",
  "conversationId": "string",
  "senderId": {
    "_id": "string",
    "name": "string",
    "avatar": "string"
  },
  "recipientId": "string",
  "type": "text",
  "content": "string",
  "status": "sent",
  "isRead": false,
  "createdAt": "ISO8601"
}
```

---

#### 4. `messageHistory`
**Description:** Paginated message history

**Payload:**
```json
[
  {
    "_id": "string",
    "conversationId": "string",
    "senderId": {...},
    "recipientId": {...},
    "type": "text",
    "content": "string",
    "isRead": boolean,
    "createdAt": "ISO8601"
  }
]
```

---

#### 5. `messageRead`
**Description:** Messages marked as read

**Payload:**
```json
{
  "conversationId": "string",
  "userId": "string"
}
```

---

#### 6. `userTyping`
**Description:** Other user typing status

**Payload:**
```json
{
  "conversationId": "string",
  "userId": "string",
  "isTyping": boolean
}
```

---

#### 7. `error`
**Description:** Error occurred

**Payload:**
```json
{
  "message": "string"
}
```

---

## Android Implementation with Kotlin

### Step 1: Add Dependencies

Add to `build.gradle.kts` (Module level):

```kotlin
dependencies {
    // Socket.IO Client
    implementation("io.socket:socket.io-client:2.1.0")
    
    // JSON parsing
    implementation("org.json:json:20230227")
    
    // Coroutines for async operations
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // ViewModel and LiveData
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.2")
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:2.6.2")
}
```

---

### Step 2: Create Data Models

Create `models/ConversationModels.kt`:

```kotlin
package com.yourapp.models

import org.json.JSONObject
import java.util.Date

// User model
data class User(
    val id: String,
    val name: String,
    val email: String?,
    val avatar: String?
)

// Message types enum
enum class MessageType {
    TEXT, IMAGE, VIDEO, AUDIO, FILE, LOCATION;
    
    override fun toString(): String = name.lowercase()
}

// Message status enum
enum class MessageStatus {
    SENT, DELIVERED, READ, FAILED;
    
    override fun toString(): String = name.lowercase()
}

// Location data
data class MessageLocation(
    val latitude: Double,
    val longitude: Double,
    val address: String?
)

// Direct message
data class DirectMessage(
    val id: String,
    val conversationId: String,
    val senderId: String,
    val recipientId: String,
    val type: MessageType,
    val content: String?,
    val mediaUrl: String? = null,
    val thumbnailUrl: String? = null,
    val mediaDuration: Int? = null,
    val fileSize: Long? = null,
    val fileName: String? = null,
    val mimeType: String? = null,
    val location: MessageLocation? = null,
    val replyTo: String? = null,
    val tempId: String? = null,
    val isRead: Boolean,
    val readAt: Date? = null,
    val status: MessageStatus,
    val createdAt: Date,
    val updatedAt: Date
) {
    companion object {
        fun fromJson(json: JSONObject): DirectMessage {
            val senderJson = json.optJSONObject("senderId")
            val type = MessageType.valueOf(json.getString("type").uppercase())
            
            return DirectMessage(
                id = json.getString("_id"),
                conversationId = json.getString("conversationId"),
                senderId = senderJson?.getString("_id") ?: json.getString("senderId"),
                recipientId = json.getString("recipientId"),
                type = type,
                content = json.optString("content"),
                mediaUrl = json.optString("mediaUrl", null),
                thumbnailUrl = json.optString("thumbnailUrl", null),
                mediaDuration = json.optInt("mediaDuration", -1).takeIf { it > 0 },
                fileSize = json.optLong("fileSize", -1).takeIf { it > 0 },
                fileName = json.optString("fileName", null),
                mimeType = json.optString("mimeType", null),
                location = json.optJSONObject("location")?.let {
                    MessageLocation(
                        latitude = it.getDouble("latitude"),
                        longitude = it.getDouble("longitude"),
                        address = it.optString("address", null)
                    )
                },
                replyTo = json.optString("replyTo", null),
                tempId = json.optString("tempId", null),
                isRead = json.getBoolean("isRead"),
                readAt = null, // Parse ISO8601 if needed
                status = MessageStatus.valueOf(json.getString("status").uppercase()),
                createdAt = Date(), // Parse ISO8601
                updatedAt = Date()  // Parse ISO8601
            )
        }
    }
}

// Conversation
data class Conversation(
    val id: String,
    val participants: List<User>,
    val lastMessage: DirectMessage?,
    val unreadCount: Int,
    val isMuted: Boolean,
    val updatedAt: Date
) {
    // Get the other participant (not current user)
    fun getOtherParticipant(currentUserId: String): User? {
        return participants.firstOrNull { it.id != currentUserId }
    }
    
    companion object {
        fun fromJson(json: JSONObject, currentUserId: String): Conversation {
            val participantsArray = json.getJSONArray("participants")
            val participants = (0 until participantsArray.length()).map { i ->
                val p = participantsArray.getJSONObject(i)
                User(
                    id = p.getString("_id"),
                    name = p.getString("name"),
                    email = p.optString("email", null),
                    avatar = p.optString("avatar", null)
                )
            }
            
            val unreadCountJson = json.optJSONObject("unreadCount")
            val unreadCount = unreadCountJson?.optInt(currentUserId, 0) ?: 0
            
            val lastMessageJson = json.optJSONObject("lastMessage")
            val lastMessage = lastMessageJson?.let { DirectMessage.fromJson(it) }
            
            return Conversation(
                id = json.getString("_id"),
                participants = participants,
                lastMessage = lastMessage,
                unreadCount = unreadCount,
                isMuted = false,
                updatedAt = Date() // Parse ISO8601
            )
        }
    }
}
```

---

### Step 3: Create Socket Manager

Create `network/ConversationSocketManager.kt`:

```kotlin
package com.yourapp.network

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONArray
import org.json.JSONObject
import java.net.URISyntaxException

class ConversationSocketManager(
    private val serverUrl: String,
    private val jwtToken: String,
    private val currentUserId: String
) {
    companion object {
        private const val TAG = "ConversationSocket"
        private const val NAMESPACE = "/conversations"
    }

    private var socket: Socket? = null
    
    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected
    
    private val _conversations = MutableStateFlow<List<Conversation>>(emptyList())
    val conversations: StateFlow<List<Conversation>> = _conversations
    
    private val _currentConversation = MutableStateFlow<Conversation?>(null)
    val currentConversation: StateFlow<Conversation?> = _currentConversation
    
    private val _messages = MutableStateFlow<List<DirectMessage>>(emptyList())
    val messages: StateFlow<List<DirectMessage>> = _messages
    
    private val _typingUsers = MutableStateFlow<Set<String>>(emptySet())
    val typingUsers: StateFlow<Set<String>> = _typingUsers
    
    init {
        setupSocket()
    }

    private fun setupSocket() {
        try {
            val options = IO.Options().apply {
                // CRITICAL: Pass JWT token for authentication
                query = "token=$jwtToken"
                reconnection = true
                reconnectionAttempts = Int.MAX_VALUE
                reconnectionDelay = 2000
                transports = arrayOf("websocket")
            }

            // CRITICAL: Connect to /conversations namespace
            socket = IO.socket("$serverUrl$NAMESPACE", options)
            
            setupEventListeners()
            
        } catch (e: URISyntaxException) {
            Log.e(TAG, "Socket initialization error", e)
        }
    }

    private fun setupEventListeners() {
        socket?.apply {
            // Connection lifecycle
            on(Socket.EVENT_CONNECT, onConnect)
            on(Socket.EVENT_DISCONNECT, onDisconnect)
            on(Socket.EVENT_CONNECT_ERROR, onConnectError)
            on(Socket.EVENT_RECONNECT, onReconnect)
            
            // Business events
            on("conversations", onConversations)
            on("conversationCreated", onConversationCreated)
            on("receiveDirectMessage", onReceiveMessage)
            on("messageHistory", onMessageHistory)
            on("messageRead", onMessageRead)
            on("userTyping", onUserTyping)
            on("error", onError)
        }
    }

    // ==================== Lifecycle Listeners ====================
    
    private val onConnect = Emitter.Listener {
        Log.d(TAG, "✅ Connected to $NAMESPACE namespace")
        _isConnected.value = true
        getMyConversations()
    }

    private val onDisconnect = Emitter.Listener {
        Log.d(TAG, "⚠️ Disconnected from $NAMESPACE")
        _isConnected.value = false
    }

    private val onConnectError = Emitter.Listener { args ->
        Log.e(TAG, "❌ Connection error: ${args.contentToString()}")
        _isConnected.value = false
    }

    private val onReconnect = Emitter.Listener {
        Log.d(TAG, "🔄 Reconnected to $NAMESPACE")
        _isConnected.value = true
    }

    // ==================== Business Event Listeners ====================
    
    private val onConversations = Emitter.Listener { args ->
        try {
            val conversationsArray = args[0] as JSONArray
            val conversationList = (0 until conversationsArray.length()).map { i ->
                Conversation.fromJson(
                    conversationsArray.getJSONObject(i),
                    currentUserId
                )
            }
            _conversations.value = conversationList
            Log.d(TAG, "📥 Received ${conversationList.size} conversations")
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing conversations", e)
        }
    }

    private val onConversationCreated = Emitter.Listener { args ->
        try {
            val conversationJson = args[0] as JSONObject
            val conversation = Conversation.fromJson(conversationJson, currentUserId)
            _currentConversation.value = conversation
            Log.d(TAG, "✅ Conversation created: ${conversation.id}")
            
            // Also update conversations list
            getMyConversations()
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing created conversation", e)
        }
    }

    private val onReceiveMessage = Emitter.Listener { args ->
        try {
            val messageJson = args[0] as JSONObject
            val message = DirectMessage.fromJson(messageJson)
            
            // Add to messages list
            _messages.value = _messages.value + message
            
            Log.d(TAG, "📨 New message received: ${message.content}")
            
            // Update conversations list
            getMyConversations()
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing received message", e)
        }
    }

    private val onMessageHistory = Emitter.Listener { args ->
        try {
            val messagesArray = args[0] as JSONArray
            val messageList = (0 until messagesArray.length()).map { i ->
                DirectMessage.fromJson(messagesArray.getJSONObject(i))
            }
            _messages.value = messageList
            Log.d(TAG, "📜 Loaded ${messageList.size} messages")
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing message history", e)
        }
    }

    private val onMessageRead = Emitter.Listener { args ->
        try {
            val data = args[0] as JSONObject
            val conversationId = data.getString("conversationId")
            Log.d(TAG, "✓ Messages marked as read in conversation $conversationId")
            
            // Update local messages
            _messages.value = _messages.value.map { message ->
                if (message.conversationId == conversationId && 
                    message.senderId == currentUserId) {
                    message.copy(isRead = true, status = MessageStatus.READ)
                } else {
                    message
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing message read", e)
        }
    }

    private val onUserTyping = Emitter.Listener { args ->
        try {
            val data = args[0] as JSONObject
            val userId = data.getString("userId")
            val isTyping = data.getBoolean("isTyping")
            
            _typingUsers.value = if (isTyping) {
                _typingUsers.value + userId
            } else {
                _typingUsers.value - userId
            }
            
            Log.d(TAG, "✍️ User $userId typing: $isTyping")
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing typing event", e)
        }
    }

    private val onError = Emitter.Listener { args ->
        try {
            val error = args[0] as JSONObject
            val message = error.getString("message")
            Log.e(TAG, "⚠️ Server error: $message")
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing error event", e)
        }
    }

    // ==================== Public Methods ====================

    fun connect() {
        socket?.connect()
    }

    fun disconnect() {
        socket?.disconnect()
    }

    fun getMyConversations() {
        if (!_isConnected.value) {
            Log.w(TAG, "⚠️ Not connected - cannot get conversations")
            return
        }
        socket?.emit("getMyConversations")
    }

    fun initiateConversation(recipientId: String) {
        if (!_isConnected.value) {
            Log.w(TAG, "⚠️ Not connected - cannot initiate conversation")
            return
        }
        
        val payload = JSONObject().apply {
            put("recipientId", recipientId)
        }
        socket?.emit("initiateConversation", payload)
        Log.d(TAG, "📤 Initiating conversation with $recipientId")
    }

    fun joinConversation(conversationId: String) {
        if (!_isConnected.value) return
        
        val payload = JSONObject().apply {
            put("conversationId", conversationId)
        }
        socket?.emit("joinConversation", payload)
        Log.d(TAG, "🚪 Joined conversation $conversationId")
    }

    fun leaveConversation(conversationId: String) {
        if (!_isConnected.value) return
        
        val payload = JSONObject().apply {
            put("conversationId", conversationId)
        }
        socket?.emit("leaveConversation", payload)
        Log.d(TAG, "🚪 Left conversation $conversationId")
    }

    fun sendTextMessage(conversationId: String, content: String) {
        sendMessage(conversationId, MessageType.TEXT, content = content)
    }

    fun sendMessage(
        conversationId: String,
        type: MessageType,
        content: String? = null,
        mediaUrl: String? = null,
        thumbnailUrl: String? = null,
        mediaDuration: Int? = null,
        fileSize: Long? = null,
        fileName: String? = null,
        mimeType: String? = null,
        location: MessageLocation? = null,
        replyTo: String? = null,
        tempId: String? = null
    ) {
        if (!_isConnected.value) {
            Log.w(TAG, "⚠️ Not connected - cannot send message")
            return
        }
        
        val payload = JSONObject().apply {
            put("conversationId", conversationId)
            put("type", type.toString())
            content?.let { put("content", it) }
            mediaUrl?.let { put("mediaUrl", it) }
            thumbnailUrl?.let { put("thumbnailUrl", it) }
            mediaDuration?.let { put("mediaDuration", it) }
            fileSize?.let { put("fileSize", it) }
            fileName?.let { put("fileName", it) }
            mimeType?.let { put("mimeType", it) }
            location?.let {
                put("location", JSONObject().apply {
                    put("latitude", it.latitude)
                    put("longitude", it.longitude)
                    it.address?.let { addr -> put("address", addr) }
                })
            }
            replyTo?.let { put("replyTo", it) }
            tempId?.let { put("tempId", it) }
        }
        
        socket?.emit("sendDirectMessage", payload)
        Log.d(TAG, "📤 Sent message in conversation $conversationId")
    }

    fun getMessages(conversationId: String, limit: Int = 50, before: String? = null) {
        if (!_isConnected.value) return
        
        val payload = JSONObject().apply {
            put("conversationId", conversationId)
            put("limit", limit)
            before?.let { put("before", it) }
        }
        socket?.emit("getMessages", payload)
    }

    fun markAsRead(conversationId: String) {
        if (!_isConnected.value) return
        
        val payload = JSONObject().apply {
            put("conversationId", conversationId)
        }
        socket?.emit("markAsRead", payload)
    }

    fun sendTyping(conversationId: String, isTyping: Boolean) {
        if (!_isConnected.value) return
        
        val payload = JSONObject().apply {
            put("conversationId", conversationId)
            put("isTyping", isTyping)
        }
        socket?.emit("typing", payload)
    }

    fun deleteConversation(conversationId: String) {
        if (!_isConnected.value) return
        
        val payload = JSONObject().apply {
            put("conversationId", conversationId)
        }
        socket?.emit("deleteConversation", payload)
    }

    fun muteConversation(conversationId: String, muted: Boolean) {
        if (!_isConnected.value) return
        
        val payload = JSONObject().apply {
            put("conversationId", conversationId)
            put("muted", muted)
        }
        socket?.emit("muteConversation", payload)
    }

    fun cleanup() {
        socket?.off()
        socket?.disconnect()
        socket = null
    }
}
```

---

### Step 4: Create ViewModel

Create `viewmodels/ConversationsViewModel.kt`:

```kotlin
package com.yourapp.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourapp.network.ConversationSocketManager
import kotlinx.coroutines.launch

class ConversationsViewModel(
    private val serverUrl: String,
    private val jwtToken: String,
    private val currentUserId: String
) : ViewModel() {

    private val socketManager = ConversationSocketManager(
        serverUrl = serverUrl,
        jwtToken = jwtToken,
        currentUserId = currentUserId
    )

    val isConnected = socketManager.isConnected
    val conversations = socketManager.conversations
    val currentConversation = socketManager.currentConversation
    val messages = socketManager.messages
    val typingUsers = socketManager.typingUsers

    init {
        connect()
    }

    fun connect() {
        socketManager.connect()
    }

    fun disconnect() {
        socketManager.disconnect()
    }

    fun getConversations() {
        socketManager.getMyConversations()
    }

    fun startConversation(recipientId: String) {
        socketManager.initiateConversation(recipientId)
    }

    fun openConversation(conversationId: String) {
        socketManager.joinConversation(conversationId)
        socketManager.getMessages(conversationId)
    }

    fun closeConversation(conversationId: String) {
        socketManager.leaveConversation(conversationId)
    }

    fun sendMessage(conversationId: String, content: String) {
        socketManager.sendTextMessage(conversationId, content)
    }

    fun markAsRead(conversationId: String) {
        socketManager.markAsRead(conversationId)
    }

    fun setTyping(conversationId: String, isTyping: Boolean) {
        socketManager.sendTyping(conversationId, isTyping)
    }

    override fun onCleared() {
        super.onCleared()
        socketManager.cleanup()
    }
}
```

---

### Step 5: Create UI (Jetpack Compose)

Create `ui/ConversationsScreen.kt`:

```kotlin
package com.yourapp.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.yourapp.viewmodels.ConversationsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConversationsScreen(
    viewModel: ConversationsViewModel,
    onConversationClick: (String) -> Unit
) {
    val conversations by viewModel.conversations.collectAsState()
    val isConnected by viewModel.isConnected.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Messages") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Connection status
            if (!isConnected) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                Text(
                    text = "Connecting...",
                    modifier = Modifier.padding(8.dp),
                    style = MaterialTheme.typography.bodySmall
                )
            }

            // Conversations list
            if (conversations.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No conversations yet")
                }
            } else {
                LazyColumn {
                    items(conversations) { conversation ->
                        ConversationItem(
                            conversation = conversation,
                            currentUserId = viewModel.currentUserId,
                            onClick = { onConversationClick(conversation.id) }
                        )
                        Divider()
                    }
                }
            }
        }
    }
}

@Composable
fun ConversationItem(
    conversation: Conversation,
    currentUserId: String,
    onClick: () -> Unit
) {
    val otherUser = conversation.getOtherParticipant(currentUserId)
    
    Card(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .padding(8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = otherUser?.name ?: "Unknown",
                    style = MaterialTheme.typography.titleMedium
                )
                conversation.lastMessage?.let { lastMsg ->
                    Text(
                        text = lastMsg.content ?: "[Media]",
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 1
                    )
                }
            }
            
            if (conversation.unreadCount > 0) {
                Badge {
                    Text(conversation.unreadCount.toString())
                }
            }
        }
    }
}
```

Create `ui/ChatScreen.kt`:

```kotlin
package com.yourapp.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.yourapp.viewmodels.ConversationsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    conversationId: String,
    viewModel: ConversationsViewModel,
    onBack: () -> Unit
) {
    val messages by viewModel.messages.collectAsState()
    val typingUsers by viewModel.typingUsers.collectAsState()
    var messageText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    LaunchedEffect(conversationId) {
        viewModel.openConversation(conversationId)
        viewModel.markAsRead(conversationId)
    }

    DisposableEffect(Unit) {
        onDispose {
            viewModel.closeConversation(conversationId)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Chat") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Messages
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                reverseLayout = true
            ) {
                items(messages.reversed()) { message ->
                    MessageBubble(
                        message = message,
                        isOwnMessage = message.senderId == viewModel.currentUserId
                    )
                }
            }

            // Typing indicator
            if (typingUsers.isNotEmpty()) {
                Text(
                    text = "Typing...",
                    modifier = Modifier.padding(8.dp),
                    style = MaterialTheme.typography.bodySmall
                )
            }

            // Input field
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = messageText,
                    onValueChange = {
                        messageText = it
                        viewModel.setTyping(conversationId, it.isNotEmpty())
                    },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Type a message...") }
                )
                
                IconButton(
                    onClick = {
                        if (messageText.isNotBlank()) {
                            viewModel.sendMessage(conversationId, messageText)
                            messageText = ""
                            viewModel.setTyping(conversationId, false)
                        }
                    }
                ) {
                    Icon(Icons.Default.Send, "Send")
                }
            }
        }
    }
}

@Composable
fun MessageBubble(message: DirectMessage, isOwnMessage: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(8.dp),
        horizontalArrangement = if (isOwnMessage) Arrangement.End else Arrangement.Start
    ) {
        Card(
            colors = CardDefaults.cardColors(
                containerColor = if (isOwnMessage)
                    MaterialTheme.colorScheme.primaryContainer
                else
                    MaterialTheme.colorScheme.secondaryContainer
            )
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text(text = message.content ?: "[Media]")
                Text(
                    text = message.createdAt.toString(),
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}
```

---

### Step 6: Usage in Activity/Fragment

```kotlin
class MainActivity : ComponentActivity() {
    private lateinit var viewModel: ConversationsViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Get JWT token from SharedPreferences or login response
        val sharedPrefs = getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
        val jwtToken = sharedPrefs.getString("jwt_token", "") ?: ""
        val currentUserId = sharedPrefs.getString("user_id", "") ?: ""
        
        viewModel = ConversationsViewModel(
            serverUrl = "http://10.0.2.2:10000",  // For emulator
            jwtToken = jwtToken,
            currentUserId = currentUserId
        )
        
        setContent {
            MaterialTheme {
                ConversationsScreen(
                    viewModel = viewModel,
                    onConversationClick = { conversationId ->
                        // Navigate to chat screen
                    }
                )
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        viewModel.disconnect()
    }
}
```

---

## Testing Guide

### 1. Test Socket Connection

```kotlin
// In your activity
lifecycleScope.launch {
    viewModel.isConnected.collect { connected ->
        Log.d("MainActivity", "Socket connected: $connected")
        if (connected) {
            // Connection successful
            Toast.makeText(this@MainActivity, "Connected!", Toast.LENGTH_SHORT).show()
        }
    }
}
```

### 2. Test Getting Conversations

```kotlin
viewModel.getConversations()

lifecycleScope.launch {
    viewModel.conversations.collect { conversations ->
        Log.d("MainActivity", "Received ${conversations.size} conversations")
        conversations.forEach {
            Log.d("MainActivity", "Conversation: ${it.id}")
        }
    }
}
```

### 3. Test Initiating Conversation

```kotlin
// From user profile screen
val recipientUserId = "69188c3dec31e5e23c3671ac"
viewModel.startConversation(recipientUserId)

// Listen for created conversation
lifecycleScope.launch {
    viewModel.currentConversation.collect { conversation ->
        conversation?.let {
            Log.d("MainActivity", "Conversation created: ${it.id}")
            // Navigate to chat screen
        }
    }
}
```

### 4. Test Sending Messages

```kotlin
val conversationId = "677abc123def456789012345"
viewModel.sendMessage(conversationId, "Hello from Android!")

// Listen for new messages
lifecycleScope.launch {
    viewModel.messages.collect { messages ->
        Log.d("MainActivity", "Total messages: ${messages.size}")
    }
}
```

---

## Troubleshooting

### Issue: Socket Not Connecting

**Symptoms:** `isConnected` stays `false`, no logs showing connection

**Solutions:**
1. Check server URL is correct (use `10.0.2.2` for Android emulator instead of `localhost`)
2. Verify JWT token is valid and not expired
3. Check network permissions in `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
```
4. If using HTTPS/WSS, ensure SSL certificate is valid
5. Check backend logs to see if connection attempt reaches server

---

### Issue: Authentication Failed

**Symptoms:** Connection drops immediately, error event with "Unauthorized"

**Solutions:**
1. Ensure JWT token is passed in query params correctly
2. Verify token is not expired (check exp claim)
3. Check token format: should be raw token without "Bearer " prefix
4. Verify backend JWT secret matches the one used to generate token

---

### Issue: Events Not Received

**Symptoms:** Can connect but events like `conversations` or `receiveDirectMessage` don't fire

**Solutions:**
1. Verify you're listening on the correct namespace (`/conversations`)
2. Check event names match exactly (case-sensitive)
3. Ensure you're in the conversation room (call `joinConversation` first)
4. Check backend logs to see if events are being emitted
5. Add logging to all event listeners to debug

---

### Issue: Messages Not Showing

**Symptoms:** Can send messages but they don't appear in UI

**Solutions:**
1. Verify `receiveDirectMessage` listener is working
2. Check StateFlow/LiveData is being collected in UI
3. Ensure messages are being added to the list correctly
4. Check if messages are filtered out (e.g., deleted messages)
5. Verify conversation ID matches when joining/sending

---

### Issue: Typing Indicator Not Working

**Symptoms:** Typing events sent but other user doesn't see indicator

**Solutions:**
1. Ensure both users are in the same conversation room
2. Check `userTyping` event listener is registered
3. Verify typing state is being updated in StateFlow
4. Check backend is broadcasting typing events to other participant
5. Implement debouncing to avoid sending too many typing events

---

### Common Errors and Fixes

| Error Message | Cause | Fix |
|--------------|-------|-----|
| "User not authenticated" | JWT token missing/invalid | Pass valid token in query params |
| "Conversation not found" | Invalid conversation ID | Use ID from `conversationCreated` event |
| "Cannot create conversation with yourself" | recipientId equals current user | Ensure recipientId is different user |
| "Socket not connected" | Trying to emit before connection | Wait for `isConnected` to be true |
| "Invalid message type" | Wrong type string | Use MessageType enum values |

---

## Performance Tips

1. **Pagination:** Always load messages with pagination to avoid loading thousands of messages:
```kotlin
viewModel.getMessages(conversationId, limit = 30, before = oldestMessageId)
```

2. **Lazy Loading:** Implement infinite scroll to load older messages:
```kotlin
LaunchedEffect(listState.firstVisibleItemIndex) {
    if (listState.firstVisibleItemIndex >= messages.size - 5) {
        // Load more messages
        viewModel.loadMoreMessages()
    }
}
```

3. **Message Caching:** Cache messages locally using Room database to show instantly on app restart

4. **Image Optimization:** Compress images before uploading, use thumbnails for videos

5. **Reconnection Handling:** Socket.IO handles reconnection automatically, but save unsent messages locally and retry when reconnected

---

## Security Best Practices

1. **Token Storage:** Store JWT token securely using EncryptedSharedPreferences
2. **HTTPS/WSS:** Always use secure connections in production
3. **Token Refresh:** Implement token refresh mechanism before expiration
4. **Validate Input:** Sanitize user input before sending messages
5. **File Upload:** Validate file types and sizes on both client and server

---

## Next Steps

1. ✅ Implement media message support (images, videos, files)
2. ✅ Add push notifications for new messages when app is in background
3. ✅ Implement message search functionality
4. ✅ Add message reactions/emoji
5. ✅ Implement message deletion
6. ✅ Add voice message recording
7. ✅ Implement read receipts
8. ✅ Add message forwarding

---

## Support

For issues or questions:
- Backend logs: Check NestJS server console
- Android logs: Use `adb logcat | grep ConversationSocket`
- Network traffic: Use Charles Proxy or Wireshark to inspect WebSocket frames

---

**Document Version:** 1.0  
**Last Updated:** January 5, 2026  
**Compatible with:** NestJS Backend v1.0, Socket.IO 2.1.0+
