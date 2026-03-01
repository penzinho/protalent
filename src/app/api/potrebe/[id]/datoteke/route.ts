import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/server/supabase';
import type { KandidatCvSummary, PotrebaDokument } from '@/lib/types/dokumenti';

interface PotrebeDokumentiRow {
  id: string;
  klijent_id: string;
  pozicija_id: string;
  kandidat_id: string | null;
  tip: 'zivotopis' | 'ostalo';
  naziv_datoteke: string;
  mime_type: string;
  drive_file_id: string;
  drive_web_view_link: string | null;
  drive_download_link: string | null;
  folder_name: string;
  is_primary: boolean;
  version: number;
  created_at: string;
}

interface KandidatRow {
  id: string;
  ime_prezime: string;
}

const compareDocsByVersionAndDate = (a: PotrebaDokument, b: PotrebaDokument): number => {
  if (a.version !== b.version) return b.version - a.version;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
};

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const pozicijaId = params.id;
    if (!pozicijaId) {
      return NextResponse.json({ error: 'id potrebe je obavezan.' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('potrebe_dokumenti')
      .select(
        'id, klijent_id, pozicija_id, kandidat_id, tip, naziv_datoteke, mime_type, drive_file_id, drive_web_view_link, drive_download_link, folder_name, is_primary, version, created_at'
      )
      .eq('pozicija_id', pozicijaId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Ne mogu dohvatiti datoteke potrebe.' }, { status: 500 });
    }

    const rows = (data || []) as PotrebeDokumentiRow[];
    const kandidatIds = Array.from(
      new Set(
        rows
          .map((row) => row.kandidat_id)
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
      )
    );

    const kandidatiById = new Map<string, string>();
    if (kandidatIds.length > 0) {
      const { data: kandidatiData, error: kandidatiError } = await supabase
        .from('kandidati')
        .select('id, ime_prezime')
        .in('id', kandidatIds);

      if (kandidatiError) {
        return NextResponse.json({ error: 'Ne mogu dohvatiti kandidate za životopise.' }, { status: 500 });
      }

      for (const kandidat of (kandidatiData || []) as KandidatRow[]) {
        kandidatiById.set(kandidat.id, kandidat.ime_prezime);
      }
    }

    const mappedDocs: PotrebaDokument[] = rows.map((row) => ({
      ...row,
      kandidat_ime_prezime: row.kandidat_id ? kandidatiById.get(row.kandidat_id) || null : null,
    }));

    const zivotopisi = mappedDocs.filter((row) => row.tip === 'zivotopis');
    const ostalo = mappedDocs.filter((row) => row.tip === 'ostalo');

    const groupedByKandidatId = new Map<string, PotrebaDokument[]>();
    for (const doc of zivotopisi) {
      if (!doc.kandidat_id) continue;
      const list = groupedByKandidatId.get(doc.kandidat_id) || [];
      list.push(doc);
      groupedByKandidatId.set(doc.kandidat_id, list);
    }

    const kandidatiCvSummary: KandidatCvSummary[] = Array.from(groupedByKandidatId.entries())
      .map(([kandidatId, docs]) => {
        const sorted = [...docs].sort(compareDocsByVersionAndDate);
        const primaryCv = sorted.find((doc) => doc.is_primary) || sorted[0] || null;
        return {
          kandidatId,
          kandidatImePrezime:
            primaryCv?.kandidat_ime_prezime || kandidatiById.get(kandidatId) || 'Nepoznati kandidat',
          versionsCount: docs.length,
          primaryCv,
        };
      })
      .sort((a, b) => a.kandidatImePrezime.localeCompare(b.kandidatImePrezime, 'hr'));

    return NextResponse.json({ zivotopisi, ostalo, kandidatiCvSummary });
  } catch (error) {
    console.error('Greška u GET /api/potrebe/[id]/datoteke:', error);
    return NextResponse.json({ error: 'Greška pri dohvaćanju datoteka potrebe.' }, { status: 500 });
  }
}
