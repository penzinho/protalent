#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const OAUTH_SCOPE = 'https://www.googleapis.com/auth/drive';
const REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost';

const envLocalPath = path.resolve(process.cwd(), '.env.local');

const readFromEnvLocal = (key) => {
  if (!fs.existsSync(envLocalPath)) return '';
  const content = fs.readFileSync(envLocalPath, 'utf8');
  const line = content
    .split('\n')
    .find((candidate) => candidate.trim().startsWith(`${key}=`));
  if (!line) return '';
  return line.slice(line.indexOf('=') + 1).trim();
};

const envValue = (key) => process.env[key] || readFromEnvLocal(key) || '';

const clientId = envValue('GOOGLE_OAUTH_CLIENT_ID');
const clientSecret = envValue('GOOGLE_OAUTH_CLIENT_SECRET');

if (!clientId || !clientSecret) {
  console.error(
    'Nedostaju GOOGLE_OAUTH_CLIENT_ID i/ili GOOGLE_OAUTH_CLIENT_SECRET u environmentu.'
  );
  process.exit(1);
}

const authUrl =
  `${GOOGLE_AUTH_URL}?` +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: OAUTH_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  }).toString();

console.log('\n1) Otvori ovaj URL u browseru i autoriziraj Google račun:\n');
console.log(`(Redirect URI mora biti dopušten u Google OAuth klijentu: ${REDIRECT_URI})\n`);
console.log(authUrl);
console.log(
  '\n2) Nakon autorizacije kopiraj vrijednost query parametra "code" iz URL-a i zalijepi je ovdje.\n'
);

const rl = readline.createInterface({ input, output });
const authCode = (await rl.question('Authorization code: ')).trim();
rl.close();

if (!authCode) {
  console.error('Authorization code nije unesen.');
  process.exit(1);
}

const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    code: authCode,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  }),
});

const tokenPayload = await tokenResponse.json();
if (!tokenResponse.ok) {
  console.error('\nGreška pri exchange-u code -> token:\n');
  console.error(JSON.stringify(tokenPayload, null, 2));
  process.exit(1);
}

if (!tokenPayload.refresh_token) {
  console.error(
    '\nRefresh token nije vraćen. Najčešće: consent nije bio prisiljen ili je token već izdan.\n'
  );
  console.error('Pokušaj ponovno (prompt=consent je već uključen u skriptu).');
  process.exit(1);
}

console.log('\nUspjeh. Dodaj ovo u .env.local:\n');
console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokenPayload.refresh_token}\n`);
