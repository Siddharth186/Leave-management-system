import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Button = ({ children, variant = 'primary', className, isLoading, ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center px-4 py-2 text-[0.95rem] font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 focus:ring-cyan-500 shadow-sm font-semibold',
    secondary: 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 focus:ring-cyan-500 shadow-sm',
    danger: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 focus:ring-red-500 shadow-sm',
    success: 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 focus:ring-emerald-500 shadow-sm',
    ghost: 'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-cyan-400',
  };

  return (
    <button className={twMerge(clsx(baseClasses, variants[variant], className))} disabled={isLoading || props.disabled} {...props}>
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};
