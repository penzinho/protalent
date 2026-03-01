import { NextResponse } from 'next/server';

import { type DriveUploadResult, uploadFileToDrive } from '@/lib/server/drive';
import {
  ensureClientAndPotrebaFolders,
  resolvePotrebaFolderTargets,
  type PotrebaFolderResolvedTarget,
} from '@/lib/server/driveFoldering';
import { getDriveConfig } from '@/lib/server/integracije';
import { createSupabaseServerClient } from '@/lib/server/supabase';

interface SaveContractBody {
  klijentId: string;
  pozicijaIds: string[];
  nazivDatoteke: string;
  pdfBase64: string;
}

const fallbackDownloadLink = (fileId: string): string =>
  `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;

const buildUploadResultByFolder = async (params: {
  oauthClientId: string;
  oauthClientSecret: string;
  oauthRefreshToken: string;
  fileBytes: Uint8Array;
  fileName: string;
  resolvedTargets: PotrebaFolderResolvedTarget[];
}): Promise<Map<string, DriveUploadResult>> => {
  const { oauthClientId, oauthClientSecret, oauthRefreshToken, fileBytes, fileName, resolvedTargets } = params;
  const uploadsByFolderId = new Map<string, DriveUploadResult>();

  for (const target of resolvedTargets) {
    if (uploadsByFolderId.has(target.folderId)) continue;

    const uploaded = await uploadFileToDrive({
      oauthClientId,
      oauthClientSecret,
      oauthRefreshToken,
      parentId: target.folderId,
      fileName,
      fileBytes,
      mimeType: 'application/pdf',
    });
    uploadsByFolderId.set(target.folderId, uploaded);
  }

  return uploadsByFolderId;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveContractBody;
    if (!body.klijentId || !body.nazivDatoteke || !body.pdfBase64) {
      return NextResponse.json(
        { error: 'Nedostaju obavezni podaci: klijentId, nazivDatoteke ili pdfBase64.' },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.pozicijaIds) || body.pozicijaIds.length === 0) {
      return NextResponse.json({ error: 'Potrebna je barem jedna pozicija za ugovor.' }, { status: 400 });
    }

    const fileBytes = Buffer.from(body.pdfBase64, 'base64');
    if (!fileBytes.length) {
      return NextResponse.json({ error: 'PDF sadržaj nije ispravan.' }, { status: 400 });
    }

    const resolvedTargets = await resolvePotrebaFolderTargets({
      klijentId: body.klijentId,
      pozicijaIds: body.pozicijaIds,
    });

    const drive = await getDriveConfig();
    const ensuredTargets = await ensureClientAndPotrebaFolders({
      oauthClientId: drive.oauthClientId,
      oauthClientSecret: drive.oauthClientSecret,
      oauthRefreshToken: drive.oauthRefreshToken,
      rootFolderId: drive.rootFolderId,
      targets: resolvedTargets,
    });

    if (ensuredTargets.length === 0) {
      return NextResponse.json({ error: 'Nije pronađen folder target za ugovor.' }, { status: 400 });
    }

    const uploadsByFolderId = await buildUploadResultByFolder({
      oauthClientId: drive.oauthClientId,
      oauthClientSecret: drive.oauthClientSecret,
      oauthRefreshToken: drive.oauthRefreshToken,
      fileBytes: new Uint8Array(fileBytes),
      fileName: body.nazivDatoteke,
      resolvedTargets: ensuredTargets,
    });

    const primaryTarget = ensuredTargets[0];
    const primaryUpload = uploadsByFolderId.get(primaryTarget.folderId);
    if (!primaryUpload) {
      return NextResponse.json({ error: 'Ne mogu odrediti primarni upload ugovora.' }, { status: 500 });
    }

    const supabase = await createSupabaseServerClient();
    const insertPayload = {
      klijent_id: body.klijentId,
      naziv_datoteke: primaryUpload.name || body.nazivDatoteke,
      mime_type: primaryUpload.mimeType || 'application/pdf',
      drive_file_id: primaryUpload.id,
      drive_web_view_link: primaryUpload.webViewLink || null,
      drive_download_link: primaryUpload.webContentLink || fallbackDownloadLink(primaryUpload.id),
      pozicije_ids: ensuredTargets.map((target) => target.pozicijaId),
    };

    const { data: insertData, error: insertError } = await supabase
      .from('ugovori_dokumenti')
      .insert([insertPayload])
      .select('*')
      .single();

    if (insertError || !insertData) {
      return NextResponse.json({ error: 'Ne mogu spremiti ugovor u bazu.' }, { status: 500 });
    }

    const lokacijePayload = ensuredTargets.map((target) => {
      const upload = uploadsByFolderId.get(target.folderId)!;
      return {
        ugovor_id: String((insertData as { id: string }).id),
        pozicija_id: target.pozicijaId,
        datum_upisa: target.datumUpisa,
        drive_file_id: upload.id,
        drive_web_view_link: upload.webViewLink || null,
        drive_download_link: upload.webContentLink || fallbackDownloadLink(upload.id),
        folder_name: target.folderName,
      };
    });

    const { error: lokacijeError } = await supabase
      .from('ugovori_dokumenti_lokacije')
      .insert(lokacijePayload);

    if (lokacijeError) {
      return NextResponse.json(
        { error: 'Ugovor je spremljen, ali nije moguće spremiti lokacije dokumenta.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ugovor: insertData });
  } catch (error) {
    console.error('Greška u POST /api/ugovori/spremi:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Greška pri spremanju ugovora.' },
      { status: 500 }
    );
  }
}
