import crypto, { CipherGCM, DecipherGCM } from 'crypto';
import { config } from '../config';
import { logger } from '../lib/logger';

export class EncryptionService {
  private key: Buffer;
  private algorithm = 'aes-256-gcm' as const;

  constructor() {
    // Convert hex string to buffer
    this.key = Buffer.from(config.ENCRYPTION_KEY, 'hex');
  }

  /**
   * Encrypt a string value
   */
  encrypt(plaintext: string): string {
    try {
      // Generate a random IV for each encryption
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv) as CipherGCM;

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Combine IV + authTag + encrypted data
      const result = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')]);

      return result.toString('base64');
    } catch (error) {
      logger.error({ error }, 'Encryption failed');
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt an encrypted string
   */
  decrypt(ciphertext: string): string {
    try {
      const data = Buffer.from(ciphertext, 'base64');

      // Extract IV (12 bytes), authTag (16 bytes), and encrypted data
      const iv = data.subarray(0, 12);
      const authTag = data.subarray(12, 28);
      const encrypted = data.subarray(28);

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv) as DecipherGCM;
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error({ error }, 'Decryption failed');
      throw new Error('Decryption failed');
    }
  }
}

export const encryptionService = new EncryptionService();
