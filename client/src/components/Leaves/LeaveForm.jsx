import React, { useState } from 'react';
import { Button } from '../Common/Button';

export const LeaveForm = ({ onSubmit, onCancel, isSubmitting }) => {
  const [formData, setFormData] = useState({
    type: 'casual',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateDuration = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate) || isNaN(endDate)) return 0;
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      setError('Please fill in all required fields');
      return;
    }

    const duration = calculateDuration(formData.startDate, formData.endDate);
    if (duration <= 0) {
      setError('End date must be after or equal to start date');
      return;
    }

    onSubmit({ ...formData, duration });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
      {error && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-md text-[0.95rem] border border-red-500/20">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-slate-300 mb-1">Leave Type *</label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 text-[0.95rem] text-white"
        >
          <option value="casual">Casual Leave</option>
          <option value="medical">Medical Leave</option>
          <option value="emergency">Emergency Leave</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-slate-300 mb-1">Start Date *</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 text-[0.95rem] text-white"
            required
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-slate-300 mb-1">End Date *</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 text-[0.95rem] text-white"
            required
          />
        </div>
      </div>

      {formData.startDate && formData.endDate && (
        <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-800 flex justify-between items-center transition-all">
          <span className="text-[0.95rem] font-medium text-slate-400">Estimated Duration:</span>
          <span className="text-lg font-bold text-slate-200">
            {calculateDuration(formData.startDate, formData.endDate)} Day(s)
          </span>
        </div>
      )}

      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-slate-300 mb-1">Reason *</label>
        <textarea
          id="reason"
          name="reason"
          rows={4}
          value={formData.reason}
          onChange={handleChange}
          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 text-[0.95rem] text-white resize-none"
          placeholder="Please provide a clear reason for your leave request..."
          required
        />
      </div>

      <div className="pt-4 flex justify-end space-x-3 border-t border-slate-800 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" isLoading={isSubmitting}>
          Submit Request
        </Button>
      </div>
    </form>
  );
};
