import 'server-only';

import { createSupabaseServerClient } from '@/lib/server/supabase';
import { decryptSecret, encryptSecret } from '@/lib/server/secrets';

const APP_POSTAVKE_ID = 1;

interface AppPostavkeRow {
  id: number;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_username: string;
  smtp_encrypted_password: string | null;
  smtp_from_name: string;
  smtp_from_email: string;
  mail_subject_template: string;
  mail_body_template: string;
  updated_at: string;
}

export interface IntegracijePublicConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    passwordConfigured: boolean;
    fromName: string;
    fromEmail: string;
  };
  mailTemplate: {
    subjectTemplate: string;
    bodyTemplate: string;
  };
  updatedAt: string;
}

export interface IntegracijeUpdateInput {
  smtp?: {
    host?: string;
    port?: number;
    secure?: boolean;
    username?: string;
    password?: string;
    fromName?: string;
    fromEmail?: string;
  };
  mailTemplate?: {
    subjectTemplate?: string;
    bodyTemplate?: string;
  };
}

export interface SmtpResolvedConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

export interface DriveResolvedConfig {
  rootFolderId: string;
  oauthClientId: string;
  oauthClientSecret: string;
  oauthRefreshToken: string;
}

const toPublicConfig = (row: AppPostavkeRow): IntegracijePublicConfig => ({
  smtp: {
    host: row.smtp_host,
    port: row.smtp_port,
    secure: Boolean(row.smtp_secure),
    username: row.smtp_username,
    passwordConfigured: Boolean(row.smtp_encrypted_password),
    fromName: row.smtp_from_name,
    fromEmail: row.smtp_from_email,
  },
  mailTemplate: {
    subjectTemplate: row.mail_subject_template,
    bodyTemplate: row.mail_body_template,
  },
  updatedAt: row.updated_at,
});

const getRow = async (): Promise<AppPostavkeRow> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('app_postavke')
    .select(
      'id, smtp_host, smtp_port, smtp_secure, smtp_username, smtp_encrypted_password, smtp_from_name, smtp_from_email, mail_subject_template, mail_body_template, updated_at'
    )
    .eq('id', APP_POSTAVKE_ID)
    .single();

  if (error || !data) {
    throw new Error('Ne mogu dohvatiti app postavke.');
  }

  return data as AppPostavkeRow;
};

export const getIntegracijePublicConfig = async (): Promise<IntegracijePublicConfig> => {
  const row = await getRow();
  return toPublicConfig(row);
};

export const updateIntegracijeConfig = async (
  input: IntegracijeUpdateInput
): Promise<IntegracijePublicConfig> => {
  const row = await getRow();
  const updatePayload: Record<string, string | number | boolean | null> = {};

  if (input.smtp) {
    if (typeof input.smtp.host === 'string') updatePayload.smtp_host = input.smtp.host.trim();
    if (typeof input.smtp.port === 'number') updatePayload.smtp_port = input.smtp.port;
    if (typeof input.smtp.secure === 'boolean') updatePayload.smtp_secure = input.smtp.secure;
    if (typeof input.smtp.username === 'string') {
      updatePayload.smtp_username = input.smtp.username.trim();
    }
    if (typeof input.smtp.fromName === 'string') updatePayload.smtp_from_name = input.smtp.fromName.trim();
    if (typeof input.smtp.fromEmail === 'string') {
      updatePayload.smtp_from_email = input.smtp.fromEmail.trim();
    }
    if (typeof input.smtp.password === 'string') {
      const value = input.smtp.password.trim();
      updatePayload.smtp_encrypted_password = value ? encryptSecret(value) : null;
    }
  }

  if (input.mailTemplate) {
    if (typeof input.mailTemplate.subjectTemplate === 'string') {
      updatePayload.mail_subject_template = input.mailTemplate.subjectTemplate;
    }
    if (typeof input.mailTemplate.bodyTemplate === 'string') {
      updatePayload.mail_body_template = input.mailTemplate.bodyTemplate;
    }
  }

  updatePayload.updated_at = new Date().toISOString();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('app_postavke')
    .update(updatePayload)
    .eq('id', row.id)
    .select(
      'id, smtp_host, smtp_port, smtp_secure, smtp_username, smtp_encrypted_password, smtp_from_name, smtp_from_email, mail_subject_template, mail_body_template, updated_at'
    )
    .single();

  if (error || !data) {
    throw new Error('Ne mogu spremiti app postavke.');
  }

  return toPublicConfig(data as AppPostavkeRow);
};

export const getSmtpConfig = async (): Promise<SmtpResolvedConfig> => {
  const row = await getRow();
  const passwordEncrypted = row.smtp_encrypted_password;
  if (!passwordEncrypted) {
    throw new Error('SMTP lozinka nije konfigurirana.');
  }

  return {
    host: row.smtp_host,
    port: row.smtp_port,
    secure: row.smtp_secure,
    username: row.smtp_username,
    password: decryptSecret(passwordEncrypted),
    fromName: row.smtp_from_name,
    fromEmail: row.smtp_from_email,
  };
};

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value || !value.trim()) {
    throw new Error(`Drive nije konfiguriran: nedostaje ${key}.`);
  }
  return value.trim();
};

export const getDriveConfig = async (): Promise<DriveResolvedConfig> => {
  return {
    rootFolderId: getRequiredEnv('GOOGLE_DRIVE_ROOT_FOLDER_ID'),
    oauthClientId: getRequiredEnv('GOOGLE_OAUTH_CLIENT_ID'),
    oauthClientSecret: getRequiredEnv('GOOGLE_OAUTH_CLIENT_SECRET'),
    oauthRefreshToken: getRequiredEnv('GOOGLE_OAUTH_REFRESH_TOKEN'),
  };
};

export const getMailTemplateConfig = async (): Promise<{
  subjectTemplate: string;
  bodyTemplate: string;
}> => {
  const row = await getRow();
  return {
    subjectTemplate: row.mail_subject_template,
    bodyTemplate: row.mail_body_template,
  };
};
