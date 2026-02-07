import * as admin from 'firebase-admin';
import { config } from '../config';
import { logger } from './logger';

let firebaseApp: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App | null {
  if (firebaseApp) return firebaseApp;

  if (!config.FIREBASE_PROJECT_ID || !config.FIREBASE_CLIENT_EMAIL || !config.FIREBASE_PRIVATE_KEY) {
    logger.warn('Firebase Admin not configured - auth will be unavailable');
    return null;
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.FIREBASE_PROJECT_ID,
      clientEmail: config.FIREBASE_CLIENT_EMAIL,
      privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });

  logger.info('Firebase Admin initialized');
  return firebaseApp;
}

export function getFirebaseAuth(): admin.auth.Auth | null {
  const app = getFirebaseAdmin();
  return app ? app.auth() : null;
}
