import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/server/supabase';

interface UgovorDokumentRow {
  id: string;
  klijent_id: string;
  naziv_datoteke: string;
  mime_type: string;
  drive_file_id: string;
  drive_web_view_link: string | null;
  drive_download_link: string | null;
  pozicije_ids: string[] | null;
  created_at: string;
}

interface PozicijaRow {
  id: string;
  naziv_pozicije: string;
}

interface UgovorDokumentLokacijaRow {
  id: string;
  ugovor_id: string;
  pozicija_id: string;
  datum_upisa: string | null;
  drive_file_id: string;
  drive_web_view_link: string | null;
  drive_download_link: string | null;
  folder_name: string;
  created_at: string;
}

interface UgovorLokacijaIdRow {
  ugovor_id: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const klijentId = searchParams.get('klijentId');
    const pozicijaId = searchParams.get('pozicijaId');
    if (!klijentId) {
      return NextResponse.json({ error: 'klijentId je obavezan.' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    let filterUgovorIds: string[] | null = null;
    if (pozicijaId) {
      const { data: lokacijeIdData, error: lokacijeIdError } = await supabase
        .from('ugovori_dokumenti_lokacije')
        .select('ugovor_id')
        .eq('pozicija_id', pozicijaId);

      if (lokacijeIdError) {
        return NextResponse.json({ error: 'Ne mogu filtrirati ugovore po potrebi.' }, { status: 500 });
      }

      filterUgovorIds = Array.from(
        new Set(
          ((lokacijeIdData || []) as UgovorLokacijaIdRow[])
            .map((row) => row.ugovor_id)
            .filter((value) => typeof value === 'string' && value.length > 0)
        )
      );

      if (filterUgovorIds.length === 0) {
        return NextResponse.json({ ugovori: [] });
      }
    }

    let query = supabase
      .from('ugovori_dokumenti')
      .select('*')
      .eq('klijent_id', klijentId)
      .order('created_at', { ascending: false });

    if (filterUgovorIds) {
      query = query.in('id', filterUgovorIds);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Ne mogu dohvatiti ugovore.' }, { status: 500 });
    }

    const rows = (data || []) as UgovorDokumentRow[];
    const allPozicijeIds = Array.from(
      new Set(
        rows
          .flatMap((row) => row.pozicije_ids || [])
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
      )
    );

    let pozicijeById = new Map<string, string>();
    if (allPozicijeIds.length > 0) {
      const { data: pozicijeData } = await supabase
        .from('pozicije')
        .select('id, naziv_pozicije')
        .in('id', allPozicijeIds);
      pozicijeById = new Map(
        ((pozicijeData || []) as PozicijaRow[]).map((row) => [row.id, row.naziv_pozicije])
      );
    }

    const ugovorIds = rows.map((row) => row.id);
    let lokacijeByUgovorId = new Map<string, UgovorDokumentLokacijaRow[]>();
    if (ugovorIds.length > 0) {
      const { data: lokacijeData, error: lokacijeError } = await supabase
        .from('ugovori_dokumenti_lokacije')
        .select(
          'id, ugovor_id, pozicija_id, datum_upisa, drive_file_id, drive_web_view_link, drive_download_link, folder_name, created_at'
        )
        .in('ugovor_id', ugovorIds);

      if (lokacijeError) {
        return NextResponse.json({ error: 'Ne mogu dohvatiti lokacije ugovora.' }, { status: 500 });
      }

      for (const lokacija of (lokacijeData || []) as UgovorDokumentLokacijaRow[]) {
        const trenutne = lokacijeByUgovorId.get(lokacija.ugovor_id) || [];
        trenutne.push(lokacija);
        lokacijeByUgovorId.set(lokacija.ugovor_id, trenutne);
      }
    }

    const rezultat = rows.map((row) => ({
      ...row,
      pozicije_nazivi: (row.pozicije_ids || []).map((id) => pozicijeById.get(id) || id),
      lokacije: (lokacijeByUgovorId.get(row.id) || []).map((lokacija) => ({
        ...lokacija,
        pozicija_naziv: pozicijeById.get(lokacija.pozicija_id),
      })),
    }));

    return NextResponse.json({ ugovori: rezultat });
  } catch (error) {
    console.error('Greška u GET /api/ugovori:', error);
    return NextResponse.json({ error: 'Greška pri dohvaćanju ugovora.' }, { status: 500 });
  }
}
