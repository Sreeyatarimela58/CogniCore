import crypto from 'crypto';
import { env } from '../../config/env.js';

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a plaintext password using AES-256-GCM.
 * @param {string} plaintext - The password to encrypt.
 * @returns {string} The ciphertext in format: "iv:authTag:encryptedText"
 */
export function encryptPassword(plaintext) {
  if (!plaintext) return null;
  
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(env.CREDENTIAL_ENCRYPTION_KEY, 'utf8'), iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a ciphertext password using AES-256-GCM.
 * @param {string} ciphertext - The ciphertext in format: "iv:authTag:encryptedText"
 * @returns {string} The decrypted plaintext password.
 */
export function decryptPassword(ciphertext) {
  if (!ciphertext) return null;
  
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted password format');
  }
  
  const [ivHex, authTagHex, encryptedHex] = parts;
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(env.CREDENTIAL_ENCRYPTION_KEY, 'utf8'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
