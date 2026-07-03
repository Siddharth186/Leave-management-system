import React, { useEffect } from 'react';
import { useLeaves } from '../hooks/useLeaves';
import { LeaveTable } from '../components/Leaves/LeaveTable';
import { PageWrapper } from '../components/Common/PageWrapper';

export const LeaveHistory = () => {
  const { history, loading, fetchHistory } = useLeaves();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div></div>;
  }

  return (
    <PageWrapper className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">Leave History</h2>
        <p className="mt-2 text-[0.95rem] text-slate-400">View your past and current leave requests.</p>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-md rounded-xl shadow-sm border border-slate-800 overflow-hidden">
        <div className="p-6">
          <LeaveTable leaves={history} />
        </div>
      </div>
    </PageWrapper>
  );
};
