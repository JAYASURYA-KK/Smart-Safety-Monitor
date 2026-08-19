import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'purple';
  trend?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
}) => {
  const colorMap = {
    cyan: {
      bg: 'from-cyan-950/40 to-slate-900/60',
      border: 'border-cyan-500/20',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      text: 'text-cyan-400',
    },
    emerald: {
      bg: 'from-emerald-950/40 to-slate-900/60',
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      text: 'text-emerald-400',
    },
    amber: {
      bg: 'from-amber-950/40 to-slate-900/60',
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      text: 'text-amber-400',
    },
    rose: {
      bg: 'from-rose-950/40 to-slate-900/60',
      border: 'border-rose-500/20',
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      text: 'text-rose-400',
    },
    indigo: {
      bg: 'from-indigo-950/40 to-slate-900/60',
      border: 'border-indigo-500/20',
      iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      text: 'text-indigo-400',
    },
    purple: {
      bg: 'from-purple-950/40 to-slate-900/60',
      border: 'border-purple-500/20',
      iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      text: 'text-purple-400',
    },
  };

  const scheme = colorMap[color];

  return (
    <div
      className={`glass-panel p-5 rounded-2xl bg-gradient-to-br ${scheme.bg} border ${scheme.border} relative overflow-hidden group hover:border-slate-700 transition-all duration-300`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center border ${scheme.iconBg}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
          {value}
        </span>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scheme.iconBg}`}>
            {trend}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-2 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};
