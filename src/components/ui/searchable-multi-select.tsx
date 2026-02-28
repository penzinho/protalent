'use client';

import { Check, ChevronsUpDown, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { SearchableSelectOption } from '@/components/ui/searchable-select';

interface SearchableMultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  triggerClassName?: string;
  popoverClassName?: string;
}

export function SearchableMultiSelect({
  values,
  onChange,
  options,
  placeholder,
  searchPlaceholder = 'Pretraži...',
  emptyText = 'Nema rezultata.',
  disabled = false,
  triggerClassName,
  popoverClassName,
}: SearchableMultiSelectProps) {
  const selectedOptions = options.filter((option) => values.includes(option.value));

  const toggle = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((current) => current !== value));
      return;
    }

    onChange([...values, value]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            'w-full justify-between bg-white dark:bg-[#0A2B50] border-gray-200 dark:border-gray-600 rounded-xl text-brand-navy dark:text-white hover:bg-gray-50 dark:hover:bg-[#07213E] font-normal min-h-10 h-auto py-2',
            triggerClassName
          )}
        >
          <div className="flex flex-wrap items-center gap-1.5 text-left">
            {selectedOptions.length === 0 ? (
              <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
            ) : (
              selectedOptions.slice(0, 2).map((option) => (
                <Badge key={option.value} variant="secondary" className="rounded-md">
                  {option.label}
                </Badge>
              ))
            )}
            {selectedOptions.length > 2 && (
              <Badge variant="outline" className="rounded-md">
                +{selectedOptions.length - 2}
              </Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-[var(--radix-popover-trigger-width)] p-0', popoverClassName)} align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={`${option.label} ${option.keywords || ''} ${option.value}`}
                onSelect={() => toggle(option.value)}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    values.includes(option.value) ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
        {values.length > 0 && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange([])}
              className="w-full justify-center text-xs"
            >
              <X className="h-3.5 w-3.5" />
              Očisti odabir
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
