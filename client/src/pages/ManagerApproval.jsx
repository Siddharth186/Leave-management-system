import React, { useEffect, useState } from 'react';
import { useLeaves } from '../hooks/useLeaves';
import { Button } from '../components/Common/Button';
import { ConfirmationModal } from '../components/Common/ConfirmationModal';
import { StatusBadge } from '../components/Common/StatusBadge';
import { formatDate } from '../utils/helpers';
import { Check, X, ClipboardCheck } from 'lucide-react';
import { PageWrapper } from '../components/Common/PageWrapper';

export const ManagerApproval = () => {
  const { pendingLeaves, loading, fetchPendingLeaves, updateLeaveStatus } = useLeaves();
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [comment, setComment] = useState('');
  const [actionType, setActionType] = useState(''); // 'Approved' or 'Rejected'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingLeaves();
  }, [fetchPendingLeaves]);

  const handleActionClick = (leave, type) => {
    setSelectedLeave(leave);
    setActionType(type);
    setComment('');
    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedLeave) return;
    
    if (actionType === 'Rejected' && !comment.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateLeaveStatus(selectedLeave.id, actionType, comment);
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      alert('Failed to update leave status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div></div>;
  }

  return (
    <PageWrapper className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">Pending Approvals</h2>
        <p className="mt-2 text-[0.95rem] text-slate-400">Review and manage student leave requests.</p>
      </div>
      
      <div className="bg-slate-900/60 backdrop-blur-md rounded-xl shadow-sm border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          {pendingLeaves.length > 0 ? (
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-950/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[0.75rem] font-semibold text-slate-400 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-[0.75rem] font-semibold text-slate-400 uppercase tracking-wider">Leave Type</th>
                  <th className="px-6 py-4 text-left text-[0.75rem] font-semibold text-slate-400 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-4 text-left text-[0.75rem] font-semibold text-slate-400 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-4 text-center text-[0.75rem] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pendingLeaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-[0.95rem] font-medium text-slate-200">{leave.userName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{leave.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {formatDate(leave.startDate)} <span className="text-slate-500">to</span> {formatDate(leave.endDate)} <br/>
                      <span className="text-[0.8rem] text-slate-500 font-medium">({leave.duration} days)</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 max-w-xs truncate" title={leave.reason}>{leave.reason}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => handleActionClick(leave, 'Approved')}
                          className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleActionClick(leave, 'Rejected')}
                          className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              <ClipboardCheck className="h-12 w-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-200">All caught up!</h3>
              <p className="mt-1 text-sm text-slate-400">There are no pending leave requests to review.</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal 
        isOpen={isModalOpen} 
        onClose={() => !isSubmitting && setIsModalOpen(false)} 
        title={actionType === 'Approved' ? 'Approve Leave Request' : 'Reject Leave Request'}
      >
        <div className="space-y-5">
          <p className="text-[0.95rem] text-slate-300">
            Are you sure you want to <strong>{actionType.toLowerCase()}</strong> the leave request from <span className="font-semibold text-white">{selectedLeave?.userName}</span> for <span className="font-semibold text-white">{selectedLeave?.duration} day(s)</span>?
          </p>
          
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-slate-300 mb-1.5">
              Add a comment {actionType === 'Rejected' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id="comment"
              rows={3}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 text-[0.95rem] text-white resize-none"
              placeholder={actionType === 'Rejected' ? 'Reason for rejection (required)...' : 'Optional comment...'}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required={actionType === 'Rejected'}
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3 mt-4 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button 
              variant={actionType === 'Approved' ? 'success' : 'danger'} 
              onClick={handleConfirm}
              isLoading={isSubmitting}
            >
              Confirm {actionType}
            </Button>
          </div>
        </div>
      </ConfirmationModal>
    </PageWrapper>
  );
};
