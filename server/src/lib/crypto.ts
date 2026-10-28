// Encrypts and decrypts Application Passwords; the only file that touches the key.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // the IV size GCM is designed for
const TAG_BYTES = 16; // full-length tag; shorter tags are easier to forge

// Decoded once at startup. Never logged and never exported.
const key = Buffer.from(env.ENCRYPTION_KEY, 'base64');

export type Encrypted = { ciphertext: Buffer; iv: Buffer; tag: Buffer };

export function encrypt(plaintext: string): Encrypted {
  const iv = randomBytes(IV_BYTES); // new for every call, never reused
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { ciphertext, iv, tag: cipher.getAuthTag() };
}

// Throws if the key is wrong, or if the ciphertext, IV or tag were changed.
export function decrypt({ ciphertext, iv, tag }: Encrypted): string {
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
