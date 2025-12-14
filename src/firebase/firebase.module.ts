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
        // Try env-based credentials first (preferred for Render)
        const rawEnvJson =
          process.env.FIREBASE_ADMIN_CREDENTIALS ||
          (process.env.FIREBASE_ADMIN_CREDENTIALS_B64
            ? Buffer.from(process.env.FIREBASE_ADMIN_CREDENTIALS_B64, 'base64').toString('utf8')
            : null);

        let serviceAccount: Record<string, any> | null = null;

        if (rawEnvJson) {
          try {
            serviceAccount = JSON.parse(rawEnvJson);
            // Important: convert escaped newlines to real newlines in private_key
            if (serviceAccount && typeof serviceAccount.private_key === 'string') {
              serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
          } catch {
            console.warn('⚠️  FIREBASE_ADMIN_CREDENTIALS JSON is invalid.');
            serviceAccount = null;
          }
        }

        // Fallback to local file (for local dev)
        if (!serviceAccount) {
          const serviceAccountPath = path.join(process.cwd(), 'firebase-admin-sdk.json');
          if (fs.existsSync(serviceAccountPath)) {
            try {
              serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            } catch {
              console.warn('⚠️  Failed to read firebase-admin-sdk.json.');
            }
          }
        }

        // Validate credentials before initializing
        if (!serviceAccount || !serviceAccount.private_key || !serviceAccount.client_email) {
          console.warn('⚠️  Firebase Admin SDK credentials not found or invalid. Push notifications will be disabled.');
          return null;
        }
        if (String(serviceAccount.private_key).includes('YOUR_PRIVATE_KEY_HERE')) {
          console.warn('⚠️  Firebase Admin SDK credentials contain placeholder values. Push notifications will be disabled.');
          return null;
        }

        // Initialize once
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
          });
          console.log('✅ Firebase Admin SDK initialized successfully');
        }

        return admin;
      },
    },
    FirebaseService,
  ],
  exports: [FirebaseService, 'FIREBASE_ADMIN'],
})
export class FirebaseModule {}
