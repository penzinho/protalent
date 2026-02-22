import { NextResponse } from 'next/server';

import { downloadDriveFile } from '@/lib/server/drive';
import {
  getDriveConfig,
  getMailTemplateConfig,
  getSmtpConfig,
} from '@/lib/server/integracije';
import { sendMailWithAttachment } from '@/lib/server/mail';
import { createSupabaseServerClient } from '@/lib/server/supabase';
import { renderMailTemplate } from '@/lib/server/template';

interface SendContractBody {
  ugovorId: string;
  to?: string;
  subject?: string;
  body?: string;
}

interface UgovorRow {
  id: string;
  klijent_id: string;
  naziv_datoteke: string;
  mime_type: string;
  drive_file_id: string;
}

interface KlijentRow {
  id: string;
  naziv_tvrtke: string;
  email_ugovori: string | null;
}

const datumDanas = (): string => new Date().toLocaleDateString('hr-HR');

export async function POST(request: Request) {
  let ugovor: UgovorRow | null = null;
  let klijent: KlijentRow | null = null;
  let toEmailForLog = '';
  let subjectForLog = '';

  try {
    const payload = (await request.json()) as SendContractBody;
    if (!payload.ugovorId) {
      return NextResponse.json({ error: 'ugovorId je obavezan.' }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const { data: ugovorData, error: ugovorError } = await supabase
      .from('ugovori_dokumenti')
      .select('id, klijent_id, naziv_datoteke, mime_type, drive_file_id')
      .eq('id', payload.ugovorId)
      .single();

    if (ugovorError || !ugovorData) {
      return NextResponse.json({ error: 'Ugovor nije pronađen.' }, { status: 404 });
    }
    ugovor = ugovorData as UgovorRow;

    const { data: klijentData, error: klijentError } = await supabase
      .from('klijenti')
      .select('id, naziv_tvrtke, email_ugovori')
      .eq('id', ugovor.klijent_id)
      .single();

    if (klijentError || !klijentData) {
      return NextResponse.json({ error: 'Klijent nije pronađen.' }, { status: 404 });
    }
    klijent = klijentData as KlijentRow;

    const to = (payload.to || klijent.email_ugovori || '').trim();
    if (!to) {
      return NextResponse.json(
        { error: 'Email primatelja nije unesen na klijentu niti u modalu.' },
        { status: 400 }
      );
    }
    toEmailForLog = to;

    const template = await getMailTemplateConfig();
    const templateContext = {
      klijent_naziv: klijent.naziv_tvrtke,
      datum: datumDanas(),
      naziv_ugovora: ugovor.naziv_datoteke,
    };

    const subject =
      (payload.subject || '').trim() ||
      renderMailTemplate(template.subjectTemplate, templateContext).trim();
    subjectForLog = subject;
    const text =
      (payload.body || '').trim() || renderMailTemplate(template.bodyTemplate, templateContext);

    const [driveConfig, smtpConfig] = await Promise.all([getDriveConfig(), getSmtpConfig()]);
    const fileBytes = await downloadDriveFile({
      oauthClientId: driveConfig.oauthClientId,
      oauthClientSecret: driveConfig.oauthClientSecret,
      oauthRefreshToken: driveConfig.oauthRefreshToken,
      fileId: ugovor.drive_file_id,
    });

    const sendInfo = await sendMailWithAttachment({
      smtp: smtpConfig,
      to,
      subject,
      text,
      attachment: {
        filename: ugovor.naziv_datoteke,
        content: fileBytes,
        contentType: ugovor.mime_type || 'application/pdf',
      },
    });

    await supabase.from('mail_slanje_log').insert([
      {
        ugovor_id: ugovor.id,
        klijent_id: ugovor.klijent_id,
        to_email: to,
        subject,
        status: 'sent',
        error: null,
      },
    ]);

    return NextResponse.json({ ok: true, messageId: sendInfo.messageId });
  } catch (error) {
    console.error('Greška u POST /api/ugovori/posalji:', error);

    if (ugovor) {
      try {
        const supabase = createSupabaseServerClient();
        await supabase.from('mail_slanje_log').insert([
          {
            ugovor_id: ugovor.id,
            klijent_id: klijent?.id || ugovor.klijent_id,
            to_email: toEmailForLog,
            subject: subjectForLog || '(prazan subject)',
            status: 'failed',
            error: error instanceof Error ? error.message : 'Nepoznata greška',
          },
        ]);
      } catch (logError) {
        console.error('Neuspjeh logiranja mail greške:', logError);
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Slanje ugovora nije uspjelo.' },
      { status: 500 }
    );
  }
}
