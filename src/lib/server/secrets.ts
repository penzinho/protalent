import 'server-only';

import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

const getKey = (): Buffer => {
  const raw = process.env.APP_SECRETS_KEY;
  if (!raw) {
    throw new Error('APP_SECRETS_KEY nije postavljen.');
  }
  return crypto.createHash('sha256').update(raw).digest();
};

export const encryptSecret = (value: string): string => {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
};

export const decryptSecret = (value: string): string => {
  const key = getKey();
  const [ivBase64, authTagBase64, encryptedBase64] = value.split(':');
  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error('Neispravan format tajne vrijednosti.');
  }

  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const encrypted = Buffer.from(encryptedBase64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};
