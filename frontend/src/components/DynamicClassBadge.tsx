import React from 'react';

interface DynamicClassBadgeProps {
  className: string;
  count: number;
}

export const DynamicClassBadge: React.FC<DynamicClassBadgeProps> = ({
  className: clsName,
  count,
}) => {
  const isViolation = clsName.toLowerCase().startsWith('no_');
  const isPerson = clsName.toLowerCase() === 'person';

  let badgeStyle = 'bg-slate-800/80 text-slate-300 border-slate-700/60';
  if (isViolation && count > 0) {
    badgeStyle = 'bg-rose-950/80 text-rose-300 border-rose-800/80 font-bold animate-pulse';
  } else if (isViolation && count === 0) {
    badgeStyle = 'bg-slate-900/60 text-slate-500 border-slate-800/60';
  } else if (isPerson) {
    badgeStyle = 'bg-blue-950/80 text-blue-300 border-blue-800/80';
  } else if (count > 0) {
    badgeStyle = 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80';
  }

  // Format label for display (e.g. no_helmet -> No Helmet)
  const formattedLabel = clsName
    .replace('_', ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div
      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs border ${badgeStyle} transition-all duration-200`}
    >
      <span className="truncate max-w-[100px]">{formattedLabel}:</span>
      <span className="font-mono font-bold">{count}</span>
    </div>
  );
};
