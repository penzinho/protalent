'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, Users, CircleDollarSign, Briefcase, Moon, Sun, Monitor, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'hr-sidebar-collapsed';

export default function Sidebar() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [stisnut, setStisnut] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const spremljeniPrikaz = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    setStisnut(spremljeniPrikaz === '1');
  }, []);

  // Određujemo koji logo prikazati na temelju STVARNE teme koja se prikazuje
  const trenutnaTema = theme === 'system' ? resolvedTheme : theme;
  const logoPutanja = trenutnaTema === 'dark' ? '/logo_dark.png' : '/logo.png';
  const osnovniLinkKlase =
    'flex items-center py-3 rounded-xl text-brand-navy dark:text-gray-300 hover:bg-brand-orange/10 dark:hover:bg-brand-orange/20 hover:text-brand-orange dark:hover:text-brand-yellow transition-all group';

  const prebaciSidebar = () => {
    setStisnut((prethodno) => {
      const novo = !prethodno;
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, novo ? '1' : '0');
      return novo;
    });
  };

  return (
    <aside
      className={`${
        stisnut ? 'w-20' : 'w-64'
      } bg-white dark:bg-[#05182d] min-h-screen flex flex-col border-r border-gray-200 dark:border-brand-navy shadow-sm transition-[width,colors] duration-300 shrink-0`}
    >
      
      {/* Logo Section */}
      <div className={`mb-8 py-6 border-b border-gray-100 dark:border-gray-800/50 ${stisnut ? 'px-3' : 'px-6'}`}>
        <div className={`${stisnut ? 'pt-4 flex justify-center' : ''}`}>
          {mounted ? (
            stisnut ? (
              // Placeholder za uski logo; kasnije zamijeniti s logo_uski.png / logo_uski_tamni.png
              <div className="h-[48px] w-[48px] rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-[10px] leading-tight font-semibold text-gray-400 dark:text-gray-500 flex items-center justify-center text-center">
                LOGO
              </div>
            ) : (
              <Image
                src={logoPutanja}
                alt="Protalent Logo"
                width={200}
                height={60}
                className="w-full h-auto object-contain transition-opacity duration-300"
              />
            )
          ) : (
            <div className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg ${stisnut ? 'h-[48px] w-[48px]' : 'h-[60px] w-full'}`}></div>
          )}
        </div>
      </div>
      
      {/* Navigation Section */}
      <nav className={`flex-1 space-y-2 ${stisnut ? 'px-2' : 'px-4'}`}>
        <Link
          href="/"
          title="Nadzorna ploča"
          className={`${osnovniLinkKlase} ${stisnut ? 'justify-center px-2' : 'gap-3 px-4'}`}
        >
          <LayoutDashboard size={20} className="text-brand-yellow group-hover:text-brand-orange transition-colors" />
          {!stisnut && <span className="font-semibold">Nadzorna ploča</span>}
        </Link>
        
        <Link
          href="/klijenti"
          title="Klijenti"
          className={`${osnovniLinkKlase} ${stisnut ? 'justify-center px-2' : 'gap-3 px-4'}`}
        >
          <Users size={20} className="text-brand-yellow group-hover:text-brand-orange transition-colors" />
          {!stisnut && <span className="font-semibold">Klijenti</span>}
        </Link>

        <Link
          href="/potrebe"
          title="Potrebe"
          className={`${osnovniLinkKlase} ${stisnut ? 'justify-center px-2' : 'gap-3 px-4'}`}
        >
          <Briefcase size={20} className="text-brand-yellow group-hover:text-brand-orange transition-colors" />
          {!stisnut && <span className="font-semibold">Potrebe</span>}
        </Link>

        <Link
          href="/prihodi"
          title="Prihodi"
          className={`${osnovniLinkKlase} ${stisnut ? 'justify-center px-2' : 'gap-3 px-4'}`}
        >
          <CircleDollarSign size={20} className="text-brand-yellow group-hover:text-brand-orange transition-colors" />
          {!stisnut && <span className="font-semibold">Prihodi</span>}
        </Link>
      </nav>

      <div className="mt-auto">
        <div className={`${stisnut ? 'px-2' : 'px-4'} pb-3`}>
          <button
            onClick={prebaciSidebar}
            title={stisnut ? 'Proširi sidebar' : 'Suzi sidebar'}
            className={`w-full flex items-center rounded-xl bg-gray-100 dark:bg-[#0b2238] text-gray-500 dark:text-gray-300 hover:text-brand-orange dark:hover:text-brand-yellow transition-colors ${
              stisnut ? 'justify-center px-2 py-2.5' : 'justify-center gap-2 px-4 py-2.5'
            }`}
          >
            {stisnut ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!stisnut && <span className="text-sm font-medium">Sakrij sidebar</span>}
          </button>
        </div>

        {/* Premium Dark Mode Toggle (3 opcije) */}
        {mounted && (
          <div className={`p-4 border-t border-gray-100 dark:border-gray-800/50 ${stisnut ? 'px-2' : ''}`}>
            <div className={`${stisnut ? 'flex flex-col gap-1' : 'flex'} bg-gray-100 dark:bg-[#030e1a] rounded-xl p-1 border border-transparent dark:border-gray-800 relative`}>
              <button
                onClick={() => setTheme('light')}
                title="Svijetli način"
                className={`${stisnut ? 'w-full' : 'flex-1'} flex justify-center items-center py-2.5 rounded-lg transition-all duration-200 z-10 ${
                  theme === 'light'
                    ? 'bg-white text-brand-orange shadow-sm font-medium'
                    : 'text-gray-400 hover:text-brand-navy dark:hover:text-gray-300'
                }`}
              >
                <Sun size={18} className={theme === 'light' ? 'drop-shadow-sm' : ''} />
              </button>

              <button
                onClick={() => setTheme('system')}
                title="Prati sustav"
                className={`${stisnut ? 'w-full' : 'flex-1'} flex justify-center items-center py-2.5 rounded-lg transition-all duration-200 z-10 ${
                  theme === 'system'
                    ? 'bg-white dark:bg-[#07213E] text-brand-orange shadow-sm font-medium border border-gray-200/50 dark:border-gray-700'
                    : 'text-gray-400 hover:text-brand-navy dark:hover:text-gray-300'
                }`}
              >
                <Monitor size={18} className={theme === 'system' ? 'drop-shadow-sm' : ''} />
              </button>

              <button
                onClick={() => setTheme('dark')}
                title="Tamni način"
                className={`${stisnut ? 'w-full' : 'flex-1'} flex justify-center items-center py-2.5 rounded-lg transition-all duration-200 z-10 ${
                  theme === 'dark'
                    ? 'bg-[#07213E] dark:bg-[#0a2b50] text-brand-orange shadow-sm font-medium border border-[#0a2b50] dark:border-gray-700'
                    : 'text-gray-400 hover:text-brand-navy dark:hover:text-gray-300'
                }`}
              >
                <Moon size={18} className={theme === 'dark' ? 'drop-shadow-sm' : ''} />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
