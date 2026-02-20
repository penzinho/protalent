'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, Users, CircleDollarSign, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Određujemo koji logo prikazati na temelju STVARNE teme koja se prikazuje
  const trenutnaTema = theme === 'system' ? resolvedTheme : theme;
  const logoPutanja = trenutnaTema === 'dark' ? '/logo_dark.png' : '/logo.png';

  return (
    <aside className="w-64 bg-white dark:bg-[#05182d] min-h-screen flex flex-col border-r border-gray-200 dark:border-brand-navy shadow-sm transition-colors duration-300">
      
      {/* Logo Section */}
      <div className="mb-8 px-6 py-6 border-b border-gray-100 dark:border-gray-800/50 flex justify-center">
        {mounted ? (
          <Image 
            src={logoPutanja} 
            alt="Protalent Logo" 
            width={200} 
            height={60} 
            className="w-full h-auto object-contain transition-opacity duration-300" 
          />
        ) : (
          <div className="h-[60px] w-full animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
        )}
      </div>
      
      {/* Navigation Section */}
      <nav className="flex-1 space-y-2 px-4">
        <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-brand-navy dark:text-gray-300 hover:bg-brand-orange/10 dark:hover:bg-brand-orange/20 hover:text-brand-orange dark:hover:text-brand-yellow transition-all group">
          <LayoutDashboard size={20} className="text-brand-yellow group-hover:text-brand-orange transition-colors" />
          <span className="font-semibold">Nadzorna ploča</span>
        </Link>
        
        <Link href="/klijenti" className="flex items-center gap-3 px-4 py-3 rounded-xl text-brand-navy dark:text-gray-300 hover:bg-brand-orange/10 dark:hover:bg-brand-orange/20 hover:text-brand-orange dark:hover:text-brand-yellow transition-all group">
          <Users size={20} className="text-brand-yellow group-hover:text-brand-orange transition-colors" />
          <span className="font-semibold">Klijenti</span>
        </Link>

        <Link href="/prihodi" className="flex items-center gap-3 px-4 py-3 rounded-xl text-brand-navy dark:text-gray-300 hover:bg-brand-orange/10 dark:hover:bg-brand-orange/20 hover:text-brand-orange dark:hover:text-brand-yellow transition-all group">
          <CircleDollarSign size={20} className="text-brand-yellow group-hover:text-brand-orange transition-colors" />
          <span className="font-semibold">Prihodi</span>
        </Link>
      </nav>

     {/* Premium Dark Mode Toggle (3 opcije) */}
      {mounted && (
        <div className="p-4 mt-auto border-t border-gray-100 dark:border-gray-800/50">
          <div className="flex bg-gray-100 dark:bg-[#030e1a] rounded-xl p-1 border border-transparent dark:border-gray-800 relative">
            
            <button
              onClick={() => setTheme('light')}
              title="Svijetli način"
              className={`flex-1 flex justify-center items-center py-2.5 rounded-lg transition-all duration-200 z-10 ${
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
              className={`flex-1 flex justify-center items-center py-2.5 rounded-lg transition-all duration-200 z-10 ${
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
              className={`flex-1 flex justify-center items-center py-2.5 rounded-lg transition-all duration-200 z-10 ${
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
    </aside>
  );
}