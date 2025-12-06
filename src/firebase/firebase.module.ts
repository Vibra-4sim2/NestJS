import { Module, Global } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        const serviceAccountPath = path.join(
          process.cwd(),
          'firebase-admin-sdk.json',
        );

        // Check if file exists and has valid content
        if (!fs.existsSync(serviceAccountPath)) {
          console.warn('⚠️  Firebase Admin SDK credentials not found. Push notifications will be disabled.');
          return null;
        }

        try {
          const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          
          // Check if it's a valid service account
          if (!serviceAccount.private_key || serviceAccount.private_key.includes('YOUR_PRIVATE_KEY_HERE')) {
            console.warn('⚠️  Firebase Admin SDK credentials are invalid/placeholder. Push notifications will be disabled.');
            return null;
          }

          if (!admin.apps.length) {
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount),
            });
            console.log('✅ Firebase Admin SDK initialized successfully');
          }

          return admin;
        } catch (error) {
          console.warn('⚠️  Failed to initialize Firebase Admin SDK:', error.message);
          console.warn('Push notifications will be disabled.');
          return null;
        }
      },
    },
    FirebaseService,
  ],
  exports: [FirebaseService, 'FIREBASE_ADMIN'],
})
export class FirebaseModule {}
