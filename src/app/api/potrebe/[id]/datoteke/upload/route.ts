import { NextResponse } from 'next/server';

import { uploadFileToDrive } from '@/lib/server/drive';
import { ensurePotrebaDocumentFolder } from '@/lib/server/driveFoldering';
import { getDriveConfig } from '@/lib/server/integracije';
import { createSupabaseServerClient } from '@/lib/server/supabase';
import type { PotrebaDokument, PotrebaDokumentTip } from '@/lib/types/dokumenti';

interface PozicijaRow {
  id: string;
  klijent_id: string;
}

interface KandidatRow {
  id: string;
  pozicija_id: string;
  ime_prezime: string;
}

interface VerzijaRow {
  version: number;
}

const fallbackDownloadLink = (fileId: string): string =>
  `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;

const isSupportedTip = (value: unknown): value is PotrebaDokumentTip =>
  value === 'zivotopis' || value === 'ostalo';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const pozicijaId = params.id;
    if (!pozicijaId) {
      return NextResponse.json({ error: 'id potrebe je obavezan.' }, { status: 400 });
    }

    const formData = await request.formData();
    const tipValue = formData.get('tip');
    const fileValue = formData.get('file');
    const kandidatIdValue = formData.get('kandidatId');

    if (!isSupportedTip(tipValue)) {
      return NextResponse.json({ error: 'Tip dokumenta mora biti "zivotopis" ili "ostalo".' }, { status: 400 });
    }
    const tip = tipValue;

    if (!(fileValue instanceof File) || fileValue.size === 0) {
      return NextResponse.json({ error: 'Datoteka je obavezna.' }, { status: 400 });
    }

    const kandidatId =
      typeof kandidatIdValue === 'string' && kandidatIdValue.trim().length > 0
        ? kandidatIdValue.trim()
        : null;

    if (tip === 'zivotopis' && !kandidatId) {
      return NextResponse.json({ error: 'Za životopis je obavezan kandidatId.' }, { status: 400 });
    }
    if (tip === 'ostalo' && kandidatId) {
      return NextResponse.json({ error: 'Dokument tipa ostalo ne smije imati kandidatId.' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: pozicijaData, error: pozicijaError } = await supabase
      .from('pozicije')
      .select('id, klijent_id')
      .eq('id', pozicijaId)
      .single();

    if (pozicijaError || !pozicijaData) {
      return NextResponse.json({ error: 'Potreba nije pronađena.' }, { status: 404 });
    }

    const pozicija = pozicijaData as PozicijaRow;
    let kandidat: KandidatRow | null = null;
    if (tip === 'zivotopis' && kandidatId) {
      const { data: kandidatData, error: kandidatError } = await supabase
        .from('kandidati')
        .select('id, pozicija_id, ime_prezime')
        .eq('id', kandidatId)
        .single();

      if (kandidatError || !kandidatData) {
        return NextResponse.json({ error: 'Kandidat nije pronađen.' }, { status: 404 });
      }

      kandidat = kandidatData as KandidatRow;
      if (kandidat.pozicija_id !== pozicijaId) {
        return NextResponse.json({ error: 'Kandidat ne pripada ovoj potrebi.' }, { status: 400 });
      }
    }

    const driveConfig = await getDriveConfig();
    const folder = await ensurePotrebaDocumentFolder({
      oauthClientId: driveConfig.oauthClientId,
      oauthClientSecret: driveConfig.oauthClientSecret,
      oauthRefreshToken: driveConfig.oauthRefreshToken,
      rootFolderId: driveConfig.rootFolderId,
      klijentId: pozicija.klijent_id,
      pozicijaId,
      tip,
    });

    const fileBytes = new Uint8Array(await fileValue.arrayBuffer());
    const upload = await uploadFileToDrive({
      oauthClientId: driveConfig.oauthClientId,
      oauthClientSecret: driveConfig.oauthClientSecret,
      oauthRefreshToken: driveConfig.oauthRefreshToken,
      parentId: folder.folderId,
      fileName: fileValue.name,
      fileBytes,
      mimeType: fileValue.type || 'application/octet-stream',
    });

    let version = 1;
    if (tip === 'zivotopis' && kandidatId) {
      const { error: resetPrimaryError } = await supabase
        .from('potrebe_dokumenti')
        .update({ is_primary: false })
        .eq('pozicija_id', pozicijaId)
        .eq('kandidat_id', kandidatId)
        .eq('tip', 'zivotopis')
        .eq('is_primary', true);

      if (resetPrimaryError) {
        return NextResponse.json(
          { error: 'Ne mogu ažurirati postojeći glavni životopis.' },
          { status: 500 }
        );
      }

      const { data: versionRows, error: versionError } = await supabase
        .from('potrebe_dokumenti')
        .select('version')
        .eq('pozicija_id', pozicijaId)
        .eq('kandidat_id', kandidatId)
        .eq('tip', 'zivotopis')
        .order('version', { ascending: false })
        .limit(1);

      if (versionError) {
        return NextResponse.json({ error: 'Ne mogu dohvatiti verziju životopisa.' }, { status: 500 });
      }

      const currentVersion = ((versionRows || []) as VerzijaRow[])[0]?.version || 0;
      version = currentVersion + 1;
    }

    const insertPayload = {
      klijent_id: pozicija.klijent_id,
      pozicija_id: pozicijaId,
      kandidat_id: tip === 'zivotopis' ? kandidatId : null,
      tip,
      naziv_datoteke: upload.name || fileValue.name,
      mime_type: upload.mimeType || fileValue.type || 'application/octet-stream',
      drive_file_id: upload.id,
      drive_web_view_link: upload.webViewLink || null,
      drive_download_link: upload.webContentLink || fallbackDownloadLink(upload.id),
      folder_name: folder.folderName,
      is_primary: true,
      version,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('potrebe_dokumenti')
      .insert([insertPayload])
      .select(
        'id, klijent_id, pozicija_id, kandidat_id, tip, naziv_datoteke, mime_type, drive_file_id, drive_web_view_link, drive_download_link, folder_name, is_primary, version, created_at'
      )
      .single();

    if (insertError || !inserted) {
      return NextResponse.json({ error: 'Ne mogu spremiti dokument potrebe u bazu.' }, { status: 500 });
    }

    const dokument: PotrebaDokument = {
      ...(inserted as PotrebaDokument),
      kandidat_ime_prezime: kandidat?.ime_prezime || null,
    };

    return NextResponse.json({ dokument });
  } catch (error) {
    console.error('Greška u POST /api/potrebe/[id]/datoteke/upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Greška pri uploadu dokumenta potrebe.' },
      { status: 500 }
    );
  }
}
