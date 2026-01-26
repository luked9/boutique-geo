import sodium from 'sodium-native';
import { config } from '../config';
import { logger } from '../lib/logger';

/**
 * Token encryption service using libsodium secretbox
 * Encryption key is derived from ENCRYPTION_KEY environment variable (32-byte hex)
 * Output format: nonce (24 bytes) + ciphertext, base64 encoded
 */

class TokenCryptoService {
  private readonly key: Buffer;
  private readonly NONCE_LENGTH = sodium.crypto_secretbox_NONCEBYTES; // 24 bytes
  private readonly KEY_LENGTH = sodium.crypto_secretbox_KEYBYTES; // 32 bytes

  constructor() {
    // Convert 64-character hex string to 32-byte buffer
    try {
      this.key = Buffer.from(config.ENCRYPTION_KEY, 'hex');

      if (this.key.length !== this.KEY_LENGTH) {
        throw new Error(
          `Invalid encryption key length: expected ${this.KEY_LENGTH} bytes, got ${this.key.length} bytes`
        );
      }

      logger.info('TokenCryptoService initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize TokenCryptoService');
      throw new Error('Failed to initialize encryption service');
    }
  }

  /**
   * Encrypts plaintext string using libsodium secretbox
   * @param plaintext - String to encrypt
   * @returns Base64-encoded string containing nonce + ciphertext
   */
  encrypt(plaintext: string): string {
    try {
      const plaintextBuffer = Buffer.from(plaintext, 'utf8');

      // Generate random nonce
      const nonce = Buffer.allocUnsafe(this.NONCE_LENGTH);
      sodium.randombytes_buf(nonce);

      // Allocate buffer for ciphertext (same length as plaintext + MAC)
      const ciphertext = Buffer.allocUnsafe(
        plaintextBuffer.length + sodium.crypto_secretbox_MACBYTES
      );

      // Encrypt
      sodium.crypto_secretbox_easy(ciphertext, plaintextBuffer, nonce, this.key);

      // Prepend nonce to ciphertext
      const combined = Buffer.concat([nonce, ciphertext]);

      // Return as base64
      return combined.toString('base64');
    } catch (error) {
      logger.error({ error }, 'Encryption failed');
      throw new Error('Failed to encrypt token');
    }
  }

  /**
   * Decrypts base64-encoded ciphertext using libsodium secretbox
   * @param ciphertext - Base64-encoded string containing nonce + ciphertext
   * @returns Decrypted plaintext string
   */
  decrypt(ciphertext: string): string {
    try {
      const combined = Buffer.from(ciphertext, 'base64');

      // Extract nonce from first 24 bytes
      const nonce = combined.subarray(0, this.NONCE_LENGTH);
      const encryptedData = combined.subarray(this.NONCE_LENGTH);

      // Allocate buffer for decrypted plaintext
      const plaintext = Buffer.allocUnsafe(
        encryptedData.length - sodium.crypto_secretbox_MACBYTES
      );

      // Decrypt
      const success = sodium.crypto_secretbox_open_easy(
        plaintext,
        encryptedData,
        nonce,
        this.key
      );

      if (!success) {
        throw new Error('Decryption failed: invalid ciphertext or key');
      }

      // Return as UTF-8 string
      return plaintext.toString('utf8');
    } catch (error) {
      logger.error({ error }, 'Decryption failed');
      throw new Error('Failed to decrypt token');
    }
  }
}

export const tokenCryptoService = new TokenCryptoService();
