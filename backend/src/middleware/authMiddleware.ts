import { Request, Response, NextFunction } from 'express';
import { getFirebaseAuth } from '../lib/firebase';
import { logger } from '../lib/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
  };
}

/**
 * Verifies Firebase ID token from Authorization: Bearer <token> header.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const auth = getFirebaseAuth();

  if (!auth) {
    res.status(503).json({ error: 'Authentication service not configured' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  auth.verifyIdToken(idToken)
    .then((decoded) => {
      req.user = {
        uid: decoded.uid,
        email: decoded.email || '',
      };
      next();
    })
    .catch((error) => {
      logger.warn({ error: error.message }, 'Firebase token verification failed');
      res.status(401).json({ error: 'Invalid or expired token' });
    });
}
