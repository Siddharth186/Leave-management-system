import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeaves } from '../hooks/useLeaves';
import { LeaveForm } from '../components/Leaves/LeaveForm';
import { PageWrapper } from '../components/Common/PageWrapper';

export const ApplyLeave = () => {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { applyLeave } = useLeaves();
  const navigate = useNavigate();

  const handleLeaveSubmit = async (formData) => {
    setIsSubmitting(true);
    setError('');
    try {
      await applyLeave(formData);
      navigate('/history');
    } catch (err) {
      setError(err.message || 'Failed to apply for leave. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Apply for Leave
        </h2>
        <p className="mt-2 text-[0.95rem] text-slate-400">
          Submit a new request for time off.
        </p>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-md rounded-xl shadow-sm border border-slate-800 overflow-hidden">
        {error && (
          <div className="p-4 bg-red-500/10 text-red-400 border-b border-red-500/20 text-sm">
            {error}
          </div>
        )}
        <LeaveForm 
          onSubmit={handleLeaveSubmit} 
          onCancel={() => navigate(-1)} 
          isSubmitting={isSubmitting} 
        />
      </div>
    </PageWrapper>
  );
};
