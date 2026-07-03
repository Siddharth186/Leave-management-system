import React from 'react';
import { formatDate } from '../../utils/helpers';
import { StatusBadge } from '../Common/StatusBadge';
import { FileText } from 'lucide-react';

export const LeaveTable = ({ leaves, emptyMessage = "No leave history found." }) => {
  if (!leaves || leaves.length === 0) {
    return (
      <div className="p-16 text-center flex flex-col items-center justify-center">
        <FileText className="h-12 w-12 text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-200">Nothing to display</h3>
        <p className="mt-1 text-sm text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-800">
        <thead className="bg-slate-950/50">
          <tr>
            <th className="px-6 py-4 text-left text-[0.75rem] font-semibold text-slate-400 uppercase tracking-wider">Leave Type</th>
            <th className="px-6 py-4 text-left text-[0.75rem] font-semibold text-slate-400 uppercase tracking-wider">Dates</th>
            <th className="px-6 py-4 text-left text-[0.75rem] font-semibold text-slate-400 uppercase tracking-wider">Duration</th>
            <th className="px-6 py-4 text-left text-[0.75rem] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-left text-[0.75rem] font-semibold text-slate-400 uppercase tracking-wider">Reason</th>
            <th className="px-6 py-4 text-left text-[0.75rem] font-semibold text-slate-400 uppercase tracking-wider">Comments</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {leaves.map((leave) => (
            <tr key={leave.id} className="hover:bg-slate-800/40 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-[0.95rem] font-medium text-slate-200">{leave.type}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                {formatDate(leave.startDate)} <br />
                <span className="text-slate-500 text-xs">to</span> {formatDate(leave.endDate)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200 font-medium">{leave.duration} day(s)</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <StatusBadge status={leave.status} />
              </td>
              <td className="px-6 py-4 text-sm text-slate-400 max-w-xs truncate" title={leave.reason}>{leave.reason}</td>
              <td className="px-6 py-4 text-sm text-slate-400 max-w-xs truncate" title={leave.comment || '-'}>{leave.comment || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
