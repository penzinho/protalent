'use client';

import { format } from 'date-fns';
import { hr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const parseDateString = (dateValue: string): Date | undefined => {
  if (!dateValue) return undefined;
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
};

export function DatePicker({
  value,
  onChange,
  placeholder = 'Odaberi datum',
  disabled = false,
  className,
}: DatePickerProps) {
  const selectedDate = parseDateString(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal bg-gray-50 dark:bg-[#05182d] border-gray-200 dark:border-gray-700 rounded-xl text-brand-navy dark:text-white hover:bg-gray-100 dark:hover:bg-[#07213E]',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
          {selectedDate ? (
            format(selectedDate, 'dd.MM.yyyy.', { locale: hr })
          ) : (
            <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) return;
            onChange(format(date, 'yyyy-MM-dd'));
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
