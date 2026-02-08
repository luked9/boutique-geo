import crypto from 'crypto';

function randomId(length: number): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

export function generateStoreId(): string {
  return `store_${randomId(12)}`;
}

export function generateSessionId(): string {
  return `sess_${randomId(12)}`;
}
