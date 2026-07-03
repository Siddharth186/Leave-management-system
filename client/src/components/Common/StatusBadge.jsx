import React from 'react';
import clsx from 'clsx';

export const StatusBadge = ({ status, className }) => {
  const getBadgeStyle = (status) => {
    const normalized = (status || '').toLowerCase();
    const styles = {
      approved: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
      pending:  'bg-amber-500/10 text-amber-400 ring-amber-500/20',
      rejected: 'bg-red-500/10 text-red-400 ring-red-500/20',
    };
    return styles[normalized] || 'bg-slate-500/10 text-slate-400 ring-slate-500/20';
  };

  // Always display with first letter capitalised regardless of what was passed in
  const displayLabel = status
    ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    : '';

  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', getBadgeStyle(status), className)}>
      {displayLabel}
    </span>
  );
};
