// AES-256 Encryption Service
// Section 5 of Master Prompt - MANDATORY SECURITY RULE

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const ENC_PREFIX = 'ENC:';

@Injectable()
export class CryptoService implements OnModuleInit {
  private encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    if (key.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters (256 bits)');
    }
    this.encryptionKey = Buffer.from(key.slice(0, 32), 'utf-8');
  }

  /**
   * Encrypts plaintext using AES-256-GCM
   * Returns: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext, base64 encoded
   */
  encrypt(plaintext: string): string {
    return CryptoService.encryptWithKey(plaintext, this.encryptionKey);
  }

  /**
   * Decrypts ciphertext encrypted with AES-256-GCM
   * Input: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext, base64 encoded
   */
  decrypt(encryptedData: string): string {
    return CryptoService.decryptWithKey(encryptedData, this.encryptionKey);
  }

  /**
   * Decrypts an env value if it has the ENC: prefix, otherwise returns as-is
   */
  decryptEnv(value: string | undefined): string {
    if (!value) return '';
    if (value.startsWith(ENC_PREFIX)) {
      return this.decrypt(value.slice(ENC_PREFIX.length));
    }
    return value;
  }

  /**
   * Hashes data using SHA-256
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // ── Static methods for standalone usage (outside NestJS DI) ──

  /**
   * Encrypts plaintext using a raw key buffer
   */
  static encryptWithKey(plaintext: string, keyBuffer: Buffer): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64');
  }

  /**
   * Decrypts ciphertext using a raw key buffer
   */
  static decryptWithKey(encryptedData: string, keyBuffer: Buffer): string {
    const combined = Buffer.from(encryptedData, 'base64');

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Builds a key buffer from a string (for standalone use)
   */
  static buildKey(keyString: string): Buffer {
    if (!keyString || keyString.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters');
    }
    return Buffer.from(keyString.slice(0, 32), 'utf-8');
  }

  /**
   * Static decrypt for env values with ENC: prefix (standalone, no DI needed)
   */
  static decryptEnvValue(value: string | undefined, encryptionKey: string): string {
    if (!value) return '';
    if (value.startsWith(ENC_PREFIX)) {
      const keyBuffer = CryptoService.buildKey(encryptionKey);
      return CryptoService.decryptWithKey(value.slice(ENC_PREFIX.length), keyBuffer);
    }
    return value;
  }

  static readonly ENC_PREFIX = ENC_PREFIX;
}
