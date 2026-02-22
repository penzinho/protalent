import 'server-only';

export interface MailTemplateContext {
  klijent_naziv: string;
  datum: string;
  naziv_ugovora: string;
}

const PLACEHOLDER_REGEX = /\{\{\s*(klijent_naziv|datum|naziv_ugovora)\s*\}\}/g;

export const renderMailTemplate = (template: string, context: MailTemplateContext): string => {
  return template.replace(PLACEHOLDER_REGEX, (_, key: keyof MailTemplateContext) => {
    return context[key] ?? '';
  });
};
