'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { format, isValid, parse } from 'date-fns';
import { hr } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerInputProps {
  value: string; // ISO format: YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  align?: 'left' | 'right';
}

interface PopoverPos {
  top: number;
  left?: number;
  right?: number;
}

export default function DatePickerInput({
  value,
  onChange,
  label,
  placeholder = 'Odaberi datum',
  align = 'left',
}: DatePickerInputProps) {
  const [otvoren, setOtvoren] = useState(false);
  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const odabraniDatum = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const validanDatum = odabraniDatum && isValid(odabraniDatum) ? odabraniDatum : undefined;
  const prikazDatuma = validanDatum ? format(validanDatum, 'dd.MM.yyyy.') : '';

  const izracunajPoziciju = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const pos: PopoverPos = { top: rect.bottom + 8 };
    if (align === 'right') {
      pos.right = window.innerWidth - rect.right;
    } else {
      pos.left = rect.left;
    }
    setPopoverPos(pos);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otvoren]);

  const handleSelect = (datum: Date | undefined) => {
    if (datum && isValid(datum)) {
      onChange(format(datum, 'yyyy-MM-dd'));
      setOtvoren(false);
    }
  };

  const ocisti = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const goToToday = () => {
    onChange(format(new Date(), 'yyyy-MM-dd'));
    setOtvoren(false);
  };

  const popover = otvoren && popoverPos ? (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: popoverPos.top,
        left: popoverPos.left,
        right: popoverPos.right,
        zIndex: 9999,
      }}
      className="bg-white dark:bg-[#0A2B50] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      <DayPicker
        mode="single"
        selected={validanDatum}
        onSelect={handleSelect}
        defaultMonth={validanDatum ?? new Date()}
        locale={hr}
        weekStartsOn={1}
        showOutsideDays
        components={{
          Chevron: ({ orientation }) =>
            orientation === 'left' ? <ChevronLeft size={15} /> : <ChevronRight size={15} />,
        }}
        classNames={{
          root: 'p-3',
          months: '',
          month: 'space-y-1',
          month_caption: 'flex items-center justify-between h-8 px-1 mb-1',
          caption_label: 'text-sm font-bold text-brand-navy dark:text-white capitalize',
          nav: 'flex items-center gap-0.5',
          button_previous: [
            'h-7 w-7 flex items-center justify-center rounded-lg transition-colors',
            'text-gray-400 dark:text-gray-500',
            'hover:bg-brand-orange/10 hover:text-brand-orange dark:hover:text-brand-orange',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow',
          ].join(' '),
          button_next: [
            'h-7 w-7 flex items-center justify-center rounded-lg transition-colors',
            'text-gray-400 dark:text-gray-500',
            'hover:bg-brand-orange/10 hover:text-brand-orange dark:hover:text-brand-orange',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow',
          ].join(' '),
          month_grid: 'w-full border-collapse',
          weekdays: '',
          weekday:
            'text-[10px] font-semibold text-gray-400 dark:text-gray-500 text-center uppercase tracking-wide w-8 pb-1.5',
          week: '',
          day: 'text-center p-[2px]',
          day_button: [
            'h-8 w-8 rounded-lg text-sm font-medium transition-all cursor-pointer',
            'text-brand-navy dark:text-gray-200',
            'hover:bg-brand-orange/10 hover:text-brand-orange dark:hover:text-brand-orange',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow',
          ].join(' '),
          selected:
            '[&>button]:!bg-brand-orange [&>button]:!text-white [&>button]:hover:!bg-brand-orange/90',
          today:
            '[&>button]:font-extrabold [&:not([class*=selected])>button]:text-brand-orange [&:not([class*=selected])>button]:bg-brand-orange/10',
          outside:
            '[&>button]:!text-gray-300 dark:[&>button]:!text-gray-600 [&>button]:hover:!bg-transparent [&>button]:hover:!text-gray-300 dark:[&>button]:hover:!text-gray-600',
          disabled:
            '[&>button]:!text-gray-200 dark:[&>button]:!text-gray-700 [&>button]:cursor-not-allowed [&>button]:hover:!bg-transparent',
          hidden: 'invisible',
        }}
      />

      <div className="px-3 pb-2.5 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {validanDatum ? format(validanDatum, 'dd.MM.yyyy.') : 'Nije odabrano'}
        </span>
        <button
          type="button"
          onClick={goToToday}
          className="text-xs font-semibold text-brand-orange hover:text-brand-yellow transition-colors"
        >
          Danas
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative">
      {label && (
        <label className="text-sm font-semibold text-brand-navy dark:text-gray-300 mb-1 block">
          {label}
        </label>
      )}

      {/* Trigger */}
      <div
        ref={triggerRef}
        role="button"
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
        <CalendarDays size={16} className="text-brand-yellow shrink-0" />
        <span
          className={`flex-1 text-sm ${
            prikazDatuma ? 'text-brand-navy dark:text-white font-medium' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {prikazDatuma || placeholder}
        </span>
        {prikazDatuma ? (
          <button
            type="button"
            onClick={ocisti}
            className="text-gray-400 hover:text-brand-orange dark:hover:text-brand-yellow transition-colors p-0.5 rounded"
            aria-label="Ukloni datum"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {/* Portal — renders outside overflow containers, never gets clipped */}
      {typeof window !== 'undefined' && createPortal(popover, document.body)}
    </div>
  );
}
