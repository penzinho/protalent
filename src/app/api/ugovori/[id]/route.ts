import { NextResponse } from 'next/server';

import { deleteDriveFile } from '@/lib/server/drive';
import { getDriveConfig } from '@/lib/server/integracije';
import { createSupabaseServerClient } from '@/lib/server/supabase';

interface UgovorDokumentRow {
  id: string;
  klijent_id: string;
  drive_file_id: string;
}

interface UgovorLokacijaRow {
  drive_file_id: string;
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const ugovorId = params.id;

    if (!ugovorId) {
      return NextResponse.json({ error: 'id ugovora je obavezan.' }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const { data: ugovorData, error: ugovorError } = await supabase
      .from('ugovori_dokumenti')
      .select('id, klijent_id, drive_file_id')
      .eq('id', ugovorId)
      .single();

    if (ugovorError || !ugovorData) {
      return NextResponse.json({ error: 'Ugovor nije pronaden.' }, { status: 404 });
    }

    const ugovor = ugovorData as UgovorDokumentRow;

    const { data: lokacijeData, error: lokacijeError } = await supabase
      .from('ugovori_dokumenti_lokacije')
      .select('drive_file_id')
      .eq('ugovor_id', ugovorId);

    if (lokacijeError) {
      return NextResponse.json({ error: 'Ne mogu dohvatiti lokacije ugovora.' }, { status: 500 });
    }

    const driveFileIds = Array.from(
      new Set(
        [
          ugovor.drive_file_id,
          ...((lokacijeData || []) as UgovorLokacijaRow[]).map((row) => row.drive_file_id),
        ].filter((fileId): fileId is string => typeof fileId === 'string' && fileId.length > 0)
      )
    );

    if (driveFileIds.length > 0) {
      const drive = await getDriveConfig();
      for (const fileId of driveFileIds) {
        await deleteDriveFile({
          oauthClientId: drive.oauthClientId,
          oauthClientSecret: drive.oauthClientSecret,
          oauthRefreshToken: drive.oauthRefreshToken,
          fileId,
        });
      }
    }

    const { error: deleteError } = await supabase.from('ugovori_dokumenti').delete().eq('id', ugovorId);

    if (deleteError) {
      return NextResponse.json({ error: 'Ne mogu obrisati ugovor iz baze.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Greska u DELETE /api/ugovori/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Brisanje ugovora nije uspjelo.' },
      { status: 500 }
    );
  }
}
