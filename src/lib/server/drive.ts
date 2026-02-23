import 'server-only';

import crypto from 'node:crypto';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

interface AccessTokenResult {
  access_token?: string;
  error?: string;
  error_description?: string;
}

export interface DriveUploadResult {
  id: string;
  name: string;
  webViewLink?: string;
  webContentLink?: string;
  mimeType?: string;
  size?: string;
}

const getAccessToken = async (params: {
  oauthClientId: string;
  oauthClientSecret: string;
  oauthRefreshToken: string;
}): Promise<string> => {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: params.oauthClientId,
      client_secret: params.oauthClientSecret,
      refresh_token: params.oauthRefreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const payload = (await response.json()) as AccessTokenResult;
  if (!response.ok || !payload.access_token) {
    const reason = payload.error_description || payload.error || `${response.status} ${response.statusText}`;
    throw new Error(`Neuspješna Google OAuth autorizacija: ${reason}`);
  }

  return payload.access_token;
};

const escapeQueryLiteral = (value: string): string => value.replace(/'/g, "\\'");

export const ensureDriveFolder = async (params: {
  oauthClientId: string;
  oauthClientSecret: string;
  oauthRefreshToken: string;
  parentId: string;
  folderName: string;
}): Promise<string> => {
  const { oauthClientId, oauthClientSecret, oauthRefreshToken, parentId, folderName } = params;
  const accessToken = await getAccessToken({ oauthClientId, oauthClientSecret, oauthRefreshToken });
  const query = [
    `name = '${escapeQueryLiteral(folderName)}'`,
    `mimeType = '${FOLDER_MIME_TYPE}'`,
    `'${escapeQueryLiteral(parentId)}' in parents`,
    'trashed = false',
  ].join(' and ');

  const listUrl = `${GOOGLE_DRIVE_FILES_URL}?q=${encodeURIComponent(
    query
  )}&fields=files(id,name)&spaces=drive&pageSize=1`;

  const listResponse = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listResponse.ok) {
    throw new Error('Ne mogu dohvatiti Google Drive mapu.');
  }

  const listData = (await listResponse.json()) as { files?: Array<{ id: string }> };
  const existing = listData.files?.[0];
  if (existing?.id) return existing.id;

  const createResponse = await fetch(GOOGLE_DRIVE_FILES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: FOLDER_MIME_TYPE,
      parents: [parentId],
    }),
  });

  if (!createResponse.ok) {
    throw new Error('Ne mogu kreirati Google Drive mapu.');
  }

  const created = (await createResponse.json()) as { id?: string };
  if (!created.id) {
    throw new Error('Google Drive mapa nije kreirana.');
  }
  return created.id;
};

export const uploadFileToDrive = async (params: {
  oauthClientId: string;
  oauthClientSecret: string;
  oauthRefreshToken: string;
  parentId: string;
  fileName: string;
  fileBytes: Uint8Array;
  mimeType?: string;
}): Promise<DriveUploadResult> => {
  const {
    oauthClientId,
    oauthClientSecret,
    oauthRefreshToken,
    parentId,
    fileName,
    fileBytes,
    mimeType = 'application/pdf',
  } = params;
  const accessToken = await getAccessToken({ oauthClientId, oauthClientSecret, oauthRefreshToken });
  const boundary = `----codex-boundary-${crypto.randomUUID()}`;
  const metadata = {
    name: fileName,
    parents: [parentId],
  };

  const preamble = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    'utf8'
  );
  const closing = Buffer.from(`\r\n--${boundary}--`, 'utf8');
  const body = Buffer.concat([preamble, Buffer.from(fileBytes), closing]);

  const uploadUrl =
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,mimeType,size';
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Upload na Google Drive nije uspio: ${details}`);
  }

  return (await response.json()) as DriveUploadResult;
};

export const downloadDriveFile = async (params: {
  oauthClientId: string;
  oauthClientSecret: string;
  oauthRefreshToken: string;
  fileId: string;
}): Promise<Uint8Array> => {
  const { oauthClientId, oauthClientSecret, oauthRefreshToken, fileId } = params;
  const accessToken = await getAccessToken({ oauthClientId, oauthClientSecret, oauthRefreshToken });
  const response = await fetch(`${GOOGLE_DRIVE_FILES_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Ne mogu preuzeti datoteku s Google Drivea.');
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
};

export const deleteDriveFile = async (params: {
  oauthClientId: string;
  oauthClientSecret: string;
  oauthRefreshToken: string;
  fileId: string;
}): Promise<void> => {
  const { oauthClientId, oauthClientSecret, oauthRefreshToken, fileId } = params;
  const accessToken = await getAccessToken({ oauthClientId, oauthClientSecret, oauthRefreshToken });
  const response = await fetch(`${GOOGLE_DRIVE_FILES_URL}/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 404) {
    return;
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Brisanje datoteke na Google Driveu nije uspjelo: ${details || `${response.status} ${response.statusText}`}`
    );
  }
};

export const validateDriveAccess = async (params: {
  oauthClientId: string;
  oauthClientSecret: string;
  oauthRefreshToken: string;
  rootFolderId: string;
}): Promise<void> => {
  const { oauthClientId, oauthClientSecret, oauthRefreshToken, rootFolderId } = params;
  const accessToken = await getAccessToken({ oauthClientId, oauthClientSecret, oauthRefreshToken });
  const response = await fetch(`${GOOGLE_DRIVE_FILES_URL}/${rootFolderId}?fields=id,name,mimeType`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('OAuth korisnik nema pristup root folderu na Driveu.');
  }
};
