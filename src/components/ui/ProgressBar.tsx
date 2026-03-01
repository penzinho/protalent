interface Props {
  current: number;
  total: number;
  className?: string;
  compact?: boolean;
}

const bojaBara = (postotak: number) => {
  if (postotak >= 100) return 'bg-green-500';
  if (postotak >= 50) return 'bg-brand-yellow';
  return 'bg-brand-orange';
};

export default function ProgressBar({ current, total, className = '', compact = false }: Props) {
  const postotak = total > 0 ? Math.min((current / total) * 100, 100) : 0;

  return (
    <div className={className}>
      {compact ? (
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block mb-1">
          {current} / {total}
        </span>
      ) : (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {current} / {total} popunjeno
          </span>
          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{Math.round(postotak)}%</span>
        </div>
      )}
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bojaBara(postotak)}`}
          style={{ width: `${postotak}%` }}
        />
      </div>
    </div>
  );
}
