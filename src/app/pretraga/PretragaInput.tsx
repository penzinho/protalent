'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  defaultValue: string;
}

export default function PretragaInput({ defaultValue }: Props) {
  const router = useRouter();
  const [upit, setUpit] = useState(defaultValue);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && upit.trim()) {
      router.push(`/pretraga?q=${encodeURIComponent(upit.trim())}`);
    }
  };

  return (
    <div className="relative w-full sm:w-80">
      <Search
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
        size={16}
      />
      <input
        type="text"
        value={upit}
        onChange={(e) => setUpit(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Refinirati pretragu..."
        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#05182d] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-brand-navy dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-yellow transition-all"
      />
    </div>
  );
}
