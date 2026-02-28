'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const KORISNIK_POSTAVKE_STORAGE_KEY = 'hr-korisnik-postavke';

type KorisnikPostavke = {
  imePrezime: string;
  email: string;
};

type IntegracijeState = {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    passwordConfigured: boolean;
    fromName: string;
    fromEmail: string;
  };
  mailTemplate: {
    subjectTemplate: string;
    bodyTemplate: string;
  };
};

const initialIntegracije: IntegracijeState = {
  smtp: {
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    passwordConfigured: false,
    fromName: '',
    fromEmail: '',
  },
  mailTemplate: {
    subjectTemplate: 'Ugovor o suradnji - {{klijent_naziv}}',
    bodyTemplate: 'Poštovani,\n\nu privitku šaljemo ugovor {{naziv_ugovora}}.\n\nLijep pozdrav,',
  },
};

export default function PostavkePage() {
  const [postavke, setPostavke] = useState<KorisnikPostavke>({
    imePrezime: '',
    email: '',
  });
  const [integracije, setIntegracije] = useState<IntegracijeState>(initialIntegracije);
  const [spremljeno, setSpremljeno] = useState(false);
  const [spremljenoIntegracije, setSpremljenoIntegracije] = useState(false);
  const [ucitavanjeIntegracija, setUcitavanjeIntegracija] = useState(false);
  const [spremanjeIntegracija, setSpremanjeIntegracija] = useState(false);
  const [testiranjeSmtp, setTestiranjeSmtp] = useState(false);
  const [testiranjeDrive, setTestiranjeDrive] = useState(false);
  const [driveStatus, setDriveStatus] = useState<'uspjesna' | 'neuspjesna' | null>(null);
  const [greskaIntegracije, setGreskaIntegracije] = useState('');

  useEffect(() => {
    const spremljenoLokalno = localStorage.getItem(KORISNIK_POSTAVKE_STORAGE_KEY);

    if (!spremljenoLokalno) return;

    try {
      const parsirano = JSON.parse(spremljenoLokalno) as KorisnikPostavke;
      setPostavke({
        imePrezime: parsirano.imePrezime || '',
        email: parsirano.email || '',
      });
    } catch {
      localStorage.removeItem(KORISNIK_POSTAVKE_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const ucitajIntegracije = async () => {
      setUcitavanjeIntegracija(true);
      setGreskaIntegracije('');
      try {
        const response = await fetch('/api/postavke/integracije');
        const data = (await response.json()) as {
          smtp?: {
            host?: string;
            port?: number;
            secure?: boolean;
            username?: string;
            passwordConfigured?: boolean;
            fromName?: string;
            fromEmail?: string;
          };
          mailTemplate?: {
            subjectTemplate?: string;
            bodyTemplate?: string;
          };
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || 'Ne mogu dohvatiti postavke integracija.');
        }

        setIntegracije((prev) => ({
          smtp: {
            ...prev.smtp,
            host: data.smtp?.host || '',
            port: data.smtp?.port || 587,
            secure: Boolean(data.smtp?.secure),
            username: data.smtp?.username || '',
            password: '',
            passwordConfigured: Boolean(data.smtp?.passwordConfigured),
            fromName: data.smtp?.fromName || '',
            fromEmail: data.smtp?.fromEmail || '',
          },
          mailTemplate: {
            subjectTemplate: data.mailTemplate?.subjectTemplate || prev.mailTemplate.subjectTemplate,
            bodyTemplate: data.mailTemplate?.bodyTemplate || prev.mailTemplate.bodyTemplate,
          },
        }));
      } catch (error) {
        setGreskaIntegracije(
          error instanceof Error ? error.message : 'Ne mogu dohvatiti postavke integracija.'
        );
      } finally {
        setUcitavanjeIntegracija(false);
      }
    };

    void ucitajIntegracije();
  }, []);

  const spremiPostavke = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    localStorage.setItem(KORISNIK_POSTAVKE_STORAGE_KEY, JSON.stringify(postavke));
    setSpremljeno(true);

    setTimeout(() => {
      setSpremljeno(false);
    }, 2200);
  };

  const spremiIntegracije = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSpremanjeIntegracija(true);
    setGreskaIntegracije('');

    try {
      const payload = {
        smtp: {
          host: integracije.smtp.host.trim(),
          port: Number(integracije.smtp.port),
          secure: integracije.smtp.secure,
          username: integracije.smtp.username.trim(),
          password: integracije.smtp.password.trim() || undefined,
          fromName: integracije.smtp.fromName.trim(),
          fromEmail: integracije.smtp.fromEmail.trim(),
        },
        mailTemplate: {
          subjectTemplate: integracije.mailTemplate.subjectTemplate,
          bodyTemplate: integracije.mailTemplate.bodyTemplate,
        },
      };

      const response = await fetch('/api/postavke/integracije', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        error?: string;
        smtp?: { passwordConfigured?: boolean };
      };

      if (!response.ok) {
        throw new Error(data.error || 'Ne mogu spremiti postavke integracija.');
      }

      setIntegracije((prev) => ({
        ...prev,
        smtp: {
          ...prev.smtp,
          password: '',
          passwordConfigured: Boolean(data.smtp?.passwordConfigured ?? prev.smtp.passwordConfigured),
        },
      }));

      setSpremljenoIntegracije(true);
      setTimeout(() => setSpremljenoIntegracije(false), 2200);
    } catch (error) {
      setGreskaIntegracije(
        error instanceof Error ? error.message : 'Ne mogu spremiti postavke integracija.'
      );
    } finally {
      setSpremanjeIntegracija(false);
    }
  };

  const testirajSmtp = async () => {
    setTestiranjeSmtp(true);
    setGreskaIntegracije('');
    try {
      const response = await fetch('/api/postavke/integracije/test-smtp', { method: 'POST' });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'SMTP test nije uspio.');
      setSpremljenoIntegracije(true);
      setTimeout(() => setSpremljenoIntegracije(false), 2200);
    } catch (error) {
      setGreskaIntegracije(error instanceof Error ? error.message : 'SMTP test nije uspio.');
    } finally {
      setTestiranjeSmtp(false);
    }
  };

  const testirajDrive = async () => {
    setTestiranjeDrive(true);
    setGreskaIntegracije('');
    try {
      const response = await fetch('/api/postavke/integracije/test-drive', { method: 'POST' });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Drive test nije uspio.');
      setDriveStatus('uspjesna');
    } catch (error) {
      setDriveStatus('neuspjesna');
      setGreskaIntegracije(error instanceof Error ? error.message : 'Drive test nije uspio.');
    } finally {
      setTestiranjeDrive(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-brand-navy dark:text-white">Postavke</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Korisnički podaci i integracije sustava.</p>
      </div>

      <form
        onSubmit={spremiPostavke}
        className="bg-white dark:bg-[#0A2B50] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-sm space-y-6"
      >
        <h2 className="text-xl font-bold text-brand-navy dark:text-white">Korisnik aplikacije</h2>
        <div className="space-y-2">
          <label htmlFor="imePrezime" className="text-sm font-semibold text-brand-navy dark:text-gray-300 block">
            Ime i prezime
          </label>
          <Input
            id="imePrezime"
            type="text"
            value={postavke.imePrezime}
            onChange={(event) => setPostavke((prev) => ({ ...prev, imePrezime: event.target.value }))}
            placeholder="Unesite ime i prezime"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-[#05182d] border border-transparent dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all text-brand-navy dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-semibold text-brand-navy dark:text-gray-300 block">
            Email adresa
          </label>
          <Input
            id="email"
            type="email"
            value={postavke.email}
            onChange={(event) => setPostavke((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="ime.prezime@tvrtka.com"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-[#05182d] border border-transparent dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all text-brand-navy dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-brand-navy hover:bg-[#07213E] dark:bg-brand-yellow dark:hover:bg-yellow-500 text-white dark:text-brand-navy px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Save size={18} />
            Spremi
          </button>

          {spremljeno && (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Postavke su spremljene.</p>
          )}
        </div>
      </form>

      <form
        onSubmit={spremiIntegracije}
        className="bg-white dark:bg-[#0A2B50] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-sm space-y-8"
      >
        <h2 className="text-xl font-bold text-brand-navy dark:text-white">Integracije</h2>

        {ucitavanjeIntegracija && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Učitavam postavke integracija...</p>
        )}

        {greskaIntegracije && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm border border-red-100 dark:border-red-900/50">
            {greskaIntegracije}
          </div>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-brand-navy dark:text-white">SMTP server</h3>
            <button
              type="button"
              onClick={() => void testirajSmtp()}
              disabled={testiranjeSmtp}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand-yellow transition-colors text-brand-navy dark:text-gray-200 disabled:opacity-60"
            >
              {testiranjeSmtp ? 'Testiram SMTP...' : 'Test SMTP'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="text"
              placeholder="Host (npr. smtp.gmail.com)"
              value={integracije.smtp.host}
              onChange={(e) =>
                setIntegracije((prev) => ({ ...prev, smtp: { ...prev.smtp, host: e.target.value } }))
              }
              className="px-4 py-3 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
            />
            <Input
              type="number"
              placeholder="Port"
              value={integracije.smtp.port}
              onChange={(e) =>
                setIntegracije((prev) => ({
                  ...prev,
                  smtp: { ...prev.smtp, port: Number(e.target.value || 587) },
                }))
              }
              className="px-4 py-3 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
            />
            <Input
              type="text"
              placeholder="Username"
              value={integracije.smtp.username}
              onChange={(e) =>
                setIntegracije((prev) => ({ ...prev, smtp: { ...prev.smtp, username: e.target.value } }))
              }
              className="px-4 py-3 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
            />
            <Input
              type="password"
              placeholder={
                integracije.smtp.passwordConfigured ? 'Lozinka je spremljena (upiši novu za promjenu)' : 'Lozinka'
              }
              value={integracije.smtp.password}
              onChange={(e) =>
                setIntegracije((prev) => ({ ...prev, smtp: { ...prev.smtp, password: e.target.value } }))
              }
              className="px-4 py-3 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
            />
            <Input
              type="text"
              placeholder="From name"
              value={integracije.smtp.fromName}
              onChange={(e) =>
                setIntegracije((prev) => ({ ...prev, smtp: { ...prev.smtp, fromName: e.target.value } }))
              }
              className="px-4 py-3 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
            />
            <Input
              type="email"
              placeholder="From email"
              value={integracije.smtp.fromEmail}
              onChange={(e) =>
                setIntegracije((prev) => ({ ...prev, smtp: { ...prev.smtp, fromEmail: e.target.value } }))
              }
              className="px-4 py-3 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-brand-navy dark:text-gray-300">
            <Checkbox
              checked={integracije.smtp.secure}
              onCheckedChange={(checked) =>
                setIntegracije((prev) => ({ ...prev, smtp: { ...prev.smtp, secure: checked === true } }))
              }
              className="border-gray-300 data-[state=checked]:bg-brand-navy data-[state=checked]:border-brand-navy"
            />
            Koristi TLS/SSL (secure)
          </label>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-brand-navy dark:text-white">Template maila</h3>
          <Input
            type="text"
            placeholder="Subject template"
            value={integracije.mailTemplate.subjectTemplate}
            onChange={(e) =>
              setIntegracije((prev) => ({
                ...prev,
                mailTemplate: { ...prev.mailTemplate, subjectTemplate: e.target.value },
              }))
            }
            className="w-full px-4 py-3 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
          />
          <Textarea
            rows={8}
            value={integracije.mailTemplate.bodyTemplate}
            onChange={(e) =>
              setIntegracije((prev) => ({
                ...prev,
                mailTemplate: { ...prev.mailTemplate, bodyTemplate: e.target.value },
              }))
            }
            className="w-full px-4 py-3 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white resize-y"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Placeholderi: <code>{'{{klijent_naziv}}'}</code>, <code>{'{{datum}}'}</code>,{' '}
            <code>{'{{naziv_ugovora}}'}</code>
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-brand-navy dark:text-white">Google Drive</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Drive konfiguracija se čita iz <code>.env.local</code>.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void testirajDrive()}
              disabled={testiranjeDrive}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand-yellow transition-colors text-brand-navy dark:text-gray-200 disabled:opacity-60"
            >
              {testiranjeDrive ? 'Testiram Google Drive...' : 'Testiraj Google Drive integraciju'}
            </button>

            {driveStatus === 'uspjesna' && (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                Google Drive integracija uspješna.
              </p>
            )}
            {driveStatus === 'neuspjesna' && (
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                Google Drive integracija neuspješna.
              </p>
            )}
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={spremanjeIntegracija}
            className="inline-flex items-center gap-2 bg-brand-navy hover:bg-[#07213E] dark:bg-brand-yellow dark:hover:bg-yellow-500 text-white dark:text-brand-navy px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-60"
          >
            {(spremanjeIntegracija || testiranjeSmtp) && <Loader2 size={18} className="animate-spin" />}
            Spremi integracije
          </button>
          {spremljenoIntegracije && (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              Integracije su spremljene ili uspješno testirane.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
