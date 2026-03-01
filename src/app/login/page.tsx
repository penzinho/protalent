'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'register' && !email.endsWith('@protalent.hr')) {
      toast.error('Registracija je dostupna samo za @protalent.hr adrese.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error('Lozinka mora imati najmanje 6 znakova.');
      setLoading(false);
      return;
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error('Pogrešan email ili lozinka.');
        setLoading(false);
        return;
      }

      toast.success('Uspješna prijava!');
      router.push('/');
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      toast.success('Račun kreiran! Možete se prijaviti.');
      setMode('login');
      setPassword('');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#05182d] px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-orange mb-4">
            <span className="text-white text-2xl font-bold">PT</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-navy dark:text-white">
            HR Agencija
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            ProTalent interni sustav
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#0A2B50] border border-gray-100 dark:border-gray-800 rounded-2xl p-8 shadow-sm">
          {/* Tabs */}
          <div className="flex mb-6 bg-gray-100 dark:bg-[#05182d] rounded-xl p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-white dark:bg-[#0A2B50] text-brand-navy dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-brand-navy dark:hover:text-white'
              }`}
            >
              <LogIn size={16} />
              Prijava
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'register'
                  ? 'bg-white dark:bg-[#0A2B50] text-brand-navy dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-brand-navy dark:hover:text-white'
              }`}
            >
              <UserPlus size={16} />
              Registracija
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'register' ? 'ime@protalent.hr' : 'Vaš email'}
                required
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
              />
              {mode === 'register' && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Samo @protalent.hr adrese
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Lozinka
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Unesite lozinku"
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 pr-12 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-yellow outline-none transition-all dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-orange text-white px-6 py-2.5 rounded-xl hover:bg-brand-yellow transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Učitavanje...'
                : mode === 'login'
                  ? 'Prijavi se'
                  : 'Registriraj se'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
