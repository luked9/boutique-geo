import { nanoid } from 'nanoid';

export function generateStoreId(): string {
  return `store_${nanoid(12)}`;
}

export function generateSessionId(): string {
  return `sess_${nanoid(12)}`;
}
