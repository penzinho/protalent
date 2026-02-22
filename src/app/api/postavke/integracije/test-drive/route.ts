import { NextResponse } from 'next/server';

import { validateDriveAccess } from '@/lib/server/drive';
import { getDriveConfig } from '@/lib/server/integracije';

export async function POST() {
  try {
    const drive = await getDriveConfig();
    await validateDriveAccess({
      oauthClientId: drive.oauthClientId,
      oauthClientSecret: drive.oauthClientSecret,
      oauthRefreshToken: drive.oauthRefreshToken,
      rootFolderId: drive.rootFolderId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Greška pri Drive testu:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Drive test nije uspio.' },
      { status: 400 }
    );
  }
}
