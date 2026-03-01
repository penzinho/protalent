'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
}

interface PopoverPos {
  top: number;
  left: number;
  width: number;
}

export default function Select({ value, onChange, options, label, placeholder = 'Odaberi...' }: SelectProps) {
  const [otvoren, setOtvoren] = useState(false);
  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const odabranaOpcija = options.find((o) => o.value === value);

  const izracunajPoziciju = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopoverPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  const toggleOtvoren = () => {
    if (!otvoren) izracunajPoziciju();
    setOtvoren((v) => !v);
  };

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setOtvoren(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOtvoren(false);
    };
    const onScroll = () => {
      if (otvoren) izracunajPoziciju();
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [otvoren]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setOtvoren(false);
  };

  const popover =
    otvoren && popoverPos ? (
      <div
        ref={popoverRef}
        style={{
          position: 'fixed',
          top: popoverPos.top,
          left: popoverPos.left,
          width: popoverPos.width,
          zIndex: 9999,
        }}
        className="bg-white dark:bg-[#0A2B50] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 py-1"
      >
        {options.map((opcija) => {
          const isSelected = opcija.value === value;
          return (
            <button
              key={opcija.value}
              type="button"
              onClick={() => handleSelect(opcija.value)}
              className={[
                'w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2',
                isSelected
                  ? 'bg-brand-orange/10 text-brand-orange font-semibold'
                  : 'text-brand-navy dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5',
              ].join(' ')}
            >
              {opcija.label}
              {isSelected && <Check size={14} className="shrink-0 text-brand-orange" />}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <div className="relative">
      {label && (
        <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">
          {label}
        </label>
      )}
      <div
        ref={triggerRef}
        role="button"
        aria-expanded={otvoren}
        aria-haspopup="listbox"
        tabIndex={0}
        onClick={toggleOtvoren}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleOtvoren()}
        className={[
          'w-full px-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border rounded-xl',
          'transition-all flex items-center gap-2 cursor-pointer select-none',
          otvoren
            ? 'border-brand-yellow ring-2 ring-brand-yellow'
            : 'border-gray-200 dark:border-gray-700 hover:border-brand-yellow/60 dark:hover:border-brand-yellow/40',
        ].join(' ')}
      >
        <span
          className={`flex-1 text-sm font-medium ${
            odabranaOpcija ? 'text-brand-navy dark:text-white' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {odabranaOpcija ? odabranaOpcija.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 shrink-0 ${otvoren ? 'rotate-180' : ''}`}
        />
      </div>

      {typeof window !== 'undefined' && createPortal(popover, document.body)}
    </div>
  );
}
