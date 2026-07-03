import React from 'react';

export const MetricCard = ({ stat }) => {
  return (
    <div className="bg-slate-900/60 backdrop-blur-md overflow-hidden rounded-xl shadow-sm border border-slate-800 hover:scale-105 transition-all duration-300 ease-out cursor-pointer">
      <div className="p-6">
        <div className="flex items-center">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
            <stat.icon className="w-6 h-6" />
          </div>
          <div className="ml-4">
            <h3 className="text-[0.95rem] font-medium text-slate-400">
              {stat.name}
            </h3>
            <div className="flex items-baseline mt-1">
              <p className="text-2xl font-bold text-slate-100">
                {stat.value ?? '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
