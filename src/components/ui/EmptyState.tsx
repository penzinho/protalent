import type { LucideIcon } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

export default function EmptyState({ icon: Icon, title, description, action, compact = false }: Props) {
  return (
    <div
      className={`text-center ${compact ? 'py-10' : 'py-16'} bg-white dark:bg-[#0A2B50] rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed transition-colors`}
    >
      {Icon && <Icon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />}
      <h3 className="text-lg font-medium text-brand-navy dark:text-white">{title}</h3>
      {description && <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 bg-brand-orange text-white px-5 py-2.5 rounded-xl hover:bg-brand-yellow transition-colors font-medium text-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
