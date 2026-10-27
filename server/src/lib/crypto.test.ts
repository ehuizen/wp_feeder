import { describe, expect, it } from 'vitest';
import { decrypt, encrypt, type Encrypted } from './crypto.js';

// WordPress Application Passwords look like this: groups of four, with spaces.
const appPassword = 'abcd EFGH 1234 ijkl MNOP 5678';

// Returns a copy of the buffer with its first bit flipped: the smallest possible tamper.
function flipFirstBit(buf: Buffer): Buffer {
  const copy = Buffer.from(buf);
  copy[0]! ^= 1;
  return copy;
}

describe('crypto', () => {
  it.each([
    ['with spaces', 'abcd EFGH 1234 ijkl MNOP 5678'],
    ['without spaces', 'abcdEFGH1234ijklMNOP5678'],
  ])('decrypts back to the original password (%s)', (_label, password) => {
    expect(decrypt(encrypt(password))).toBe(password);
  });

  it('decrypts an empty password back to an empty string', () => {
    const encrypted = encrypt('');
    expect(decrypt(encrypted)).toBe('');
  });

  it('uses a 12-byte IV and a 16-byte tag', () => {
    const { iv, tag } = encrypt(appPassword);
    expect(iv).toHaveLength(12);
    expect(tag).toHaveLength(16);
  });

  it('encrypts the same password differently every time', () => {
    const a = encrypt(appPassword);
    const b = encrypt(appPassword);
    expect(a.iv.equals(b.iv)).toBe(false);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
  });

  describe('tamper detection', () => {
    const tampered: [string, (e: Encrypted) => Encrypted][] = [
      ['ciphertext', (e) => ({ ...e, ciphertext: flipFirstBit(e.ciphertext) })],
      ['IV', (e) => ({ ...e, iv: flipFirstBit(e.iv) })],
      ['tag', (e) => ({ ...e, tag: flipFirstBit(e.tag) })],
    ];

    it.each(tampered)('throws when the %s was changed', (_part, tamper) => {
      expect(() => decrypt(tamper(encrypt(appPassword)))).toThrow();
    });

    it('never puts the password in the error message', () => {
      const e = encrypt(appPassword);
      expect(() => decrypt({ ...e, tag: flipFirstBit(e.tag) })).not.toThrow(appPassword);
    });
  });
});
