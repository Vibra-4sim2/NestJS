/**
 * Fix Conversation Index Migration
 * 
 * This script removes the problematic unique_participants index from the conversations collection.
 * 
 * The unique_participants index was causing E11000 duplicate key errors because:
 * 1. MongoDB's unique index on arrays doesn't handle sorted arrays properly
 * 2. The application layer now handles uniqueness via sorted participant queries
 * 3. The schema has autoIndex: false to prevent auto-creation
 * 
 * Run this script once to clean up existing indexes:
 * npx ts-node src/scripts/fix-conversation-index.ts
 */

import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixConversationIndexes() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
    console.log('Connecting to MongoDB...');
    console.log('Using database from URI...');
    await connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    const conversationsCollection = db.collection('conversations');

    // Check if collection exists
    const collections = await db.listCollections({ name: 'conversations' }).toArray();
    
    if (collections.length === 0) {
      console.log('\n✅ Conversations collection does not exist yet - no indexes to remove');
      console.log('   The collection will be created when the first conversation is initiated');
      console.log('   Since autoIndex is disabled in the schema, no problematic index will be created');
      await connection.close();
      console.log('\n🔌 Disconnected from MongoDB');
      process.exit(0);
    }

    // List all indexes
    console.log('\n📋 Current indexes on conversations collection:');
    const indexes = await conversationsCollection.indexes();
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key));
      if (index.unique) {
        console.log('   ⚠️  UNIQUE index');
      }
    });

    // Check if problematic index exists
    const problematicIndex = indexes.find(idx => idx.name === 'unique_participants');
    
    if (problematicIndex) {
      console.log('\n⚠️  Found problematic unique_participants index');
      console.log('Dropping index: unique_participants');
      
      await conversationsCollection.dropIndex('unique_participants');
      console.log('✅ Successfully dropped unique_participants index');
    } else {
      console.log('\n✅ unique_participants index not found - no action needed');
    }

    // List indexes after cleanup
    console.log('\n📋 Indexes after cleanup:');
    const finalIndexes = await conversationsCollection.indexes();
    finalIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key));
    });

    console.log('\n✅ Migration complete!');
    console.log('\n💡 The application will now handle conversation uniqueness via:');
    console.log('   1. Sorting participant IDs before querying/creating');
    console.log('   2. Using $all and $size queries to find existing conversations');
    console.log('   3. Validation to prevent same-user conversations');

    await connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    await connection.close();
    process.exit(1);
  }
}

// Run the migration
fixConversationIndexes();
