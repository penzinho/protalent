import { NextResponse } from 'next/server';

import {
  getIntegracijePublicConfig,
  updateIntegracijeConfig,
  type IntegracijeUpdateInput,
} from '@/lib/server/integracije';

export async function GET() {
  try {
    const config = await getIntegracijePublicConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Greška pri dohvaćanju integracija:', error);
    return NextResponse.json(
      { error: 'Ne mogu dohvatiti postavke integracija.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const rawBody = (await request.json()) as Record<string, unknown>;
    if ('drive' in rawBody) {
      return NextResponse.json(
        { error: 'Drive konfiguracija se ne uređuje kroz Postavke; koristi .env.local.' },
        { status: 400 }
      );
    }

    const body = rawBody as IntegracijeUpdateInput;
    const updated = await updateIntegracijeConfig(body);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Greška pri spremanju integracija:', error);
    return NextResponse.json(
      { error: 'Ne mogu spremiti postavke integracija.' },
      { status: 500 }
    );
  }
}
