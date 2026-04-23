/**
 * CLI script to encrypt sensitive .env values using CryptoService
 *
 * Usage:
 *   npx ts-node scripts/encrypt-env.ts                    # Encrypt all sensitive values in .env
 *   npx ts-node scripts/encrypt-env.ts --value "myvalue"  # Encrypt a single value
 *   npx ts-node scripts/encrypt-env.ts --decrypt "ENC:..."# Decrypt a single value
 */

import * as fs from 'fs';
import * as path from 'path';
import { CryptoService } from '../src/infrastructure/crypto/crypto.service';

// Support --env-path to target a different .env file (e.g., root .env)
const envPathIdx = process.argv.indexOf('--env-path');
const ENV_PATH = envPathIdx !== -1
  ? path.resolve(process.argv[envPathIdx + 1])
  : path.resolve(__dirname, '../.env');

const DEFAULT_SENSITIVE_KEYS = ['DATABASE_URL', 'JWT_SECRET'];
const ROOT_SENSITIVE_KEYS = ['DB_PASSWORD', 'DATABASE_URL', 'JWT_SECRET', 'SERVICE_USERNAME', 'SERVICE_PASSWORD'];

// Auto-detect: if targeting root .env, use extended key list
const SENSITIVE_KEYS = envPathIdx !== -1 ? ROOT_SENSITIVE_KEYS : DEFAULT_SENSITIVE_KEYS;

function loadEnv(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) {
    console.error('.env file not found at:', ENV_PATH);
    process.exit(1);
  }

  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  const env: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex);
    let value = trimmed.slice(eqIndex + 1);
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

function encryptSingleValue(value: string, encryptionKey: string): void {
  const keyBuffer = CryptoService.buildKey(encryptionKey);
  const encrypted = CryptoService.encryptWithKey(value, keyBuffer);
  console.log(`\nPlaintext:  ${value}`);
  console.log(`Encrypted:  ENC:${encrypted}`);

  // Verify by decrypting
  const decrypted = CryptoService.decryptWithKey(encrypted, keyBuffer);
  console.log(`Verified:   ${decrypted === value ? 'OK' : 'FAILED'}`);
}

function decryptSingleValue(encValue: string, encryptionKey: string): void {
  const decrypted = CryptoService.decryptEnvValue(encValue, encryptionKey);
  console.log(`\nEncrypted:  ${encValue}`);
  console.log(`Decrypted:  ${decrypted}`);
}

function encryptEnvFile(): void {
  const env = loadEnv();
  const encryptionKey = env['ENCRYPTION_KEY'];

  if (!encryptionKey || encryptionKey.length < 32) {
    console.error('ENCRYPTION_KEY must be at least 32 characters in .env');
    process.exit(1);
  }

  const keyBuffer = CryptoService.buildKey(encryptionKey);

  console.log('Encrypting sensitive .env values...\n');
  console.log('ENCRYPTION_KEY:', encryptionKey, '(kept as plaintext - master key)\n');

  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  let updatedContent = content;

  for (const key of SENSITIVE_KEYS) {
    const value = env[key];
    if (!value) {
      console.log(`  ${key}: not found, skipping`);
      continue;
    }

    if (value.startsWith('ENC:')) {
      console.log(`  ${key}: already encrypted, skipping`);
      continue;
    }

    const encrypted = CryptoService.encryptWithKey(value, keyBuffer);
    const encValue = `ENC:${encrypted}`;

    // Verify
    const decrypted = CryptoService.decryptWithKey(encrypted, keyBuffer);
    if (decrypted !== value) {
      console.error(`  ${key}: encryption verification FAILED!`);
      process.exit(1);
    }

    // Replace in file content (handle both quoted and unquoted)
    const patterns = [
      `${key}="${value}"`,
      `${key}='${value}'`,
      `${key}=${value}`,
    ];

    let replaced = false;
    for (const pattern of patterns) {
      if (updatedContent.includes(pattern)) {
        updatedContent = updatedContent.replace(pattern, `${key}="${encValue}"`);
        replaced = true;
        break;
      }
    }

    if (replaced) {
      console.log(`  ${key}: encrypted successfully`);
      console.log(`    Original:  ${value.slice(0, 30)}...`);
      console.log(`    Encrypted: ${encValue.slice(0, 40)}...`);
    } else {
      console.log(`  ${key}: could not find in .env file for replacement`);
    }
  }

  fs.writeFileSync(ENV_PATH, updatedContent, 'utf-8');
  console.log('\n.env file updated with encrypted values.');
}

// CLI argument handling
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage:
  npx ts-node scripts/encrypt-env.ts                              Encrypt DATABASE_URL and JWT_SECRET in backend/.env
  npx ts-node scripts/encrypt-env.ts --env-path ../. env          Encrypt sensitive values in root .env
  npx ts-node scripts/encrypt-env.ts --value "plaintext"          Encrypt a single value
  npx ts-node scripts/encrypt-env.ts --decrypt "ENC:..."          Decrypt a single value
  npx ts-node scripts/encrypt-env.ts --key "custom-key"           Use a custom encryption key

Options:
  --env-path  Target a different .env file (auto-detects sensitive keys for root .env)
  --value     Encrypt a single plaintext value
  --decrypt   Decrypt a single ENC: value
  --key       Override ENCRYPTION_KEY (otherwise reads from .env)
  `);
  process.exit(0);
}

const env = loadEnv();
const customKeyIdx = args.indexOf('--key');
const encryptionKey = customKeyIdx !== -1 ? args[customKeyIdx + 1] : env['ENCRYPTION_KEY'];

if (!encryptionKey || encryptionKey.length < 32) {
  console.error('ENCRYPTION_KEY must be at least 32 characters');
  process.exit(1);
}

const valueIdx = args.indexOf('--value');
const decryptIdx = args.indexOf('--decrypt');

if (valueIdx !== -1) {
  encryptSingleValue(args[valueIdx + 1], encryptionKey);
} else if (decryptIdx !== -1) {
  decryptSingleValue(args[decryptIdx + 1], encryptionKey);
} else {
  encryptEnvFile();
}
