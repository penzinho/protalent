import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/server/supabase';

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const klijentId = params.id;

    if (!klijentId) {
      return NextResponse.json({ error: 'id klijenta je obavezan.' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('klijent_aktivnosti')
      .select('id, klijent_id, akcija, opis, user_label, metadata, event_at')
      .eq('klijent_id', klijentId)
      .order('event_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: 'Ne mogu dohvatiti aktivnosti klijenta.' }, { status: 500 });
    }

    return NextResponse.json({ aktivnosti: data || [] });
  } catch (error) {
    console.error('Greska u GET /api/klijenti/[id]/aktivnosti:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Greska pri dohvatu aktivnosti.' },
      { status: 500 }
    );
  }
}
