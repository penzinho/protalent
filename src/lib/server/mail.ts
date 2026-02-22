import 'server-only';

import { createRequire } from 'node:module';

import type { SmtpResolvedConfig } from '@/lib/server/integracije';

const require = createRequire(import.meta.url);
const nodemailer = require('nodemailer') as {
  createTransport: (config: {
    host: string;
    port: number;
    secure: boolean;
    auth: { user: string; pass: string };
  }) => {
    sendMail: (options: {
      from: string;
      to: string;
      subject: string;
      text: string;
      attachments?: Array<{
        filename: string;
        content: Buffer;
        contentType?: string;
      }>;
    }) => Promise<{ messageId?: string }>;
    verify: () => Promise<void>;
  };
};

const formatFrom = (fromName: string, fromEmail: string): string => {
  const cleanedName = fromName.trim();
  const cleanedEmail = fromEmail.trim();
  return cleanedName ? `${cleanedName} <${cleanedEmail}>` : cleanedEmail;
};

const createTransporter = (smtp: SmtpResolvedConfig) => {
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.username,
      pass: smtp.password,
    },
  });
};

export const verifySmtpConfig = async (smtp: SmtpResolvedConfig): Promise<void> => {
  const transporter = createTransporter(smtp);
  await transporter.verify();
};

export const sendMailWithAttachment = async (params: {
  smtp: SmtpResolvedConfig;
  to: string;
  subject: string;
  text: string;
  attachment: {
    filename: string;
    content: Uint8Array;
    contentType?: string;
  };
}): Promise<{ messageId: string | null }> => {
  const { smtp, to, subject, text, attachment } = params;
  const transporter = createTransporter(smtp);
  const info = await transporter.sendMail({
    from: formatFrom(smtp.fromName, smtp.fromEmail),
    to,
    subject,
    text,
    attachments: [
      {
        filename: attachment.filename,
        content: Buffer.from(attachment.content),
        contentType: attachment.contentType || 'application/pdf',
      },
    ],
  });

  return {
    messageId: info.messageId || null,
  };
};
