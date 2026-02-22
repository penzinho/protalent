import { NextResponse } from 'next/server';

import { getSmtpConfig } from '@/lib/server/integracije';
import { verifySmtpConfig } from '@/lib/server/mail';

export async function POST() {
  try {
    const smtp = await getSmtpConfig();
    await verifySmtpConfig(smtp);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Greška pri SMTP testu:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'SMTP test nije uspio.' },
      { status: 400 }
    );
  }
}
