import React from 'react';
import { EmailStatus } from '../../types';
import { Clock, Send, AlertTriangle, RefreshCw } from 'lucide-react';

interface BadgeProps {
  status: EmailStatus | 'rescheduled' | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {

  const getBadgeStyle = () => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return {
          label: 'Scheduled',
          icon: <Clock className="w-3 h-3" />,
          classes: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
        };
      case 'processing':
        return {
          label: 'Processing',
          icon: <RefreshCw className="w-3 h-3 animate-spin" />,
          classes: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
        };
      case 'sent':
        return {
          label: 'Sent',
          icon: <Send className="w-3 h-3" />,
          classes: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        };
      case 'rescheduled':
        return {
          label: 'Rescheduled',
          icon: <Clock className="w-3 h-3" />,
          classes: 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800/80',
        };
      case 'failed':
        return {
          label: 'Failed',
          icon: <AlertTriangle className="w-3 h-3" />,
          classes: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
        };
      default:
        return {
          label: status,
          icon: null,
          classes: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  const badge = getBadgeStyle();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.classes} ${className}`}
    >
      {badge.icon}
      <span>{badge.label}</span>
    </span>
  );
};
