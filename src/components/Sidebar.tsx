'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  CircleDollarSign,
  Briefcase,
  Moon,
  Sun,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'hr-sidebar-collapsed';

const navigacija: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: '/', label: 'Nadzorna ploča', icon: LayoutDashboard },
  { href: '/klijenti', label: 'Klijenti', icon: Users },
  { href: '/potrebe', label: 'Potrebe', icon: Briefcase },
  { href: '/prihodi', label: 'Prihodi', icon: CircleDollarSign },
];

export default function Sidebar() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [stisnut, setStisnut] = useState(false);
  const [mobileOtvoren, setMobileOtvoren] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const spremljeniPrikaz = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    setStisnut(spremljeniPrikaz === '1');
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOtvoren(false);
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  const zatvoriMobile = () => setMobileOtvoren(false);

  const renderLogo = (uski: boolean, mobile = false) => {
    if (!mounted) {
      return <div className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg ${uski ? 'h-[48px] w-[48px]' : mobile ? 'h-[48px] w-[140px]' : 'h-[60px] w-full'}`}></div>;
    }

    if (uski) {
      return (
        <div className="h-[48px] w-[48px] rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-[10px] leading-tight font-semibold text-gray-400 dark:text-gray-500 flex items-center justify-center text-center">
          LOGO
        </div>
      );
    }

    return (
      <Image
        src={logoPutanja}
        alt="Protalent Logo"
        width={mobile ? 140 : 200}
        height={mobile ? 48 : 60}
        className={`${mobile ? 'w-[140px]' : 'w-full'} h-auto object-contain transition-opacity duration-300`}
      />
    );
  };

  const renderThemeToggle = (compact: boolean) => (
    <div className={`${compact ? 'flex flex-col gap-1' : 'flex'} bg-gray-100 dark:bg-[#030e1a] rounded-xl p-1 border border-transparent dark:border-gray-800 relative`}>
      <button
        onClick={() => setTheme('light')}
        title="Svijetli način"
        className={`${compact ? 'w-full' : 'flex-1'} flex justify-center items-center py-2.5 rounded-lg transition-all duration-200 z-10 ${
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
        className={`${compact ? 'w-full' : 'flex-1'} flex justify-center items-center py-2.5 rounded-lg transition-all duration-200 z-10 ${
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
        className={`${compact ? 'w-full' : 'flex-1'} flex justify-center items-center py-2.5 rounded-lg transition-all duration-200 z-10 ${
          theme === 'dark'
            ? 'bg-[#07213E] dark:bg-[#0a2b50] text-brand-orange shadow-sm font-medium border border-[#0a2b50] dark:border-gray-700'
            : 'text-gray-400 hover:text-brand-navy dark:hover:text-gray-300'
        }`}
      >
        <Moon size={18} className={theme === 'dark' ? 'drop-shadow-sm' : ''} />
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 bg-white dark:bg-[#05182d] border-b border-gray-200 dark:border-brand-navy px-4 py-3 flex items-center justify-between">
        {renderLogo(false, true)}
        <button
          onClick={() => setMobileOtvoren(true)}
          className="p-2 rounded-lg bg-gray-100 dark:bg-[#0b2238] text-gray-600 dark:text-gray-300 hover:text-brand-orange dark:hover:text-brand-yellow transition-colors"
          title="Otvori izbornik"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOtvoren && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            onClick={zatvoriMobile}
            className="absolute inset-0 bg-black/45"
            aria-label="Zatvori izbornik"
          />

          <aside className="absolute right-0 top-0 h-full w-[82vw] max-w-[320px] bg-white dark:bg-[#05182d] border-l border-gray-200 dark:border-brand-navy shadow-2xl flex flex-col">
            <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800/50 flex items-center justify-between">
              {renderLogo(false, true)}
              <button
                onClick={zatvoriMobile}
                className="p-2 rounded-lg bg-gray-100 dark:bg-[#0b2238] text-gray-600 dark:text-gray-300 hover:text-brand-orange dark:hover:text-brand-yellow transition-colors"
                title="Zatvori izbornik"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 space-y-2 px-4 py-4">
              {navigacija.map((stavka) => {
                const Icon = stavka.icon;
                return (
                  <Link
                    key={stavka.href}
                    href={stavka.href}
                    onClick={zatvoriMobile}
                    className={`${osnovniLinkKlase} gap-3 px-4`}
                  >
                    <Icon size={20} className="text-brand-yellow group-hover:text-brand-orange transition-colors" />
                    <span className="font-semibold">{stavka.label}</span>
                  </Link>
                );
              })}
            </nav>

            {mounted && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-800/50">
                {renderThemeToggle(false)}
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`${
          stisnut ? 'w-20' : 'w-64'
        } hidden md:flex bg-white dark:bg-[#05182d] min-h-screen flex-col border-r border-gray-200 dark:border-brand-navy shadow-sm transition-[width,colors] duration-300 shrink-0`}
      >
        <div className={`mb-8 py-6 border-b border-gray-100 dark:border-gray-800/50 ${stisnut ? 'px-3' : 'px-6'}`}>
          <div className={`${stisnut ? 'pt-4 flex justify-center' : ''}`}>{renderLogo(stisnut)}</div>
        </div>

        <nav className={`flex-1 space-y-2 ${stisnut ? 'px-2' : 'px-4'}`}>
          {navigacija.map((stavka) => {
            const Icon = stavka.icon;
            return (
              <Link
                key={stavka.href}
                href={stavka.href}
                title={stavka.label}
                className={`${osnovniLinkKlase} ${stisnut ? 'justify-center px-2' : 'gap-3 px-4'}`}
              >
                <Icon size={20} className="text-brand-yellow group-hover:text-brand-orange transition-colors" />
                {!stisnut && <span className="font-semibold">{stavka.label}</span>}
              </Link>
            );
          })}
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

          {mounted && (
            <div className={`p-4 border-t border-gray-100 dark:border-gray-800/50 ${stisnut ? 'px-2' : ''}`}>
              {renderThemeToggle(stisnut)}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
