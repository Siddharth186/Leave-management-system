import React, { useState } from 'react';
import { Button } from '../Common/Button';

// ─── Today string helper ───────────────────────────────────────────────────────
// Returns "YYYY-MM-DD" in local time — used as the `min` attribute on both
// date inputs so the browser calendar greys out and blocks all past days.
const getTodayString = () => {
  const d    = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const LeaveForm = ({ onSubmit, onCancel, isSubmitting }) => {
  const today = getTodayString();

  const [formData, setFormData] = useState({
    type:      'casual',
    startDate: '',
    endDate:   '',
    reason:    '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // If user pushes startDate past endDate, clear endDate so they must re-pick
      if (name === 'startDate' && next.endDate && value > next.endDate) {
        next.endDate = '';
      }
      return next;
    });
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    const diff = Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.startDate || !formData.endDate || !formData.reason.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (formData.startDate < today) {
      setError('Start date cannot be in the past.');
      return;
    }
    if (formData.endDate < today) {
      setError('End date cannot be in the past.');
      return;
    }
    if (formData.endDate < formData.startDate) {
      setError('End date must be on or after the start date.');
      return;
    }
    if (formData.reason.trim().length < 10) {
      setError('Reason must be at least 10 characters.');
      return;
    }

    const duration = calculateDuration(formData.startDate, formData.endDate);
    onSubmit({ ...formData, duration });
  };

  const duration = calculateDuration(formData.startDate, formData.endDate);

  // ─── Shared Tailwind class strings ──────────────────────────────────────────
  const inputCls =
    'w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg ' +
    'text-sm text-white placeholder-slate-500 ' +
    'focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500 ' +
    'transition-colors duration-150 ' +
    // Date picker icon colour — works in Chromium-based browsers
    '[color-scheme:dark]';

  const labelCls = 'block text-sm font-medium text-slate-300 mb-1.5';

  return (
    <>
      {/*
        ── Scoped date-picker theme ─────────────────────────────────────────────
        Injected as an inline <style> block so we stay inside the component file
        and add zero external CSS files. These selectors target the Chromium
        shadow-DOM parts exposed for <input type="date"> pickers.
        Firefox ignores them gracefully (no visual break).
      */}
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.7) sepia(1) saturate(3) hue-rotate(160deg);
          cursor: pointer;
          opacity: 0.8;
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }
        /* Inner calendar popup — Chromium only */
        input[type="date"]::-webkit-datetime-edit-fields-wrapper { color: #e2e8f0; }
        input[type="date"]::-webkit-datetime-edit-text           { color: #64748b; }
        input[type="date"]::-webkit-datetime-edit-month-field,
        input[type="date"]::-webkit-datetime-edit-day-field,
        input[type="date"]::-webkit-datetime-edit-year-field     { color: #e2e8f0; }
        input[type="date"]::-webkit-datetime-edit-month-field:focus,
        input[type="date"]::-webkit-datetime-edit-day-field:focus,
        input[type="date"]::-webkit-datetime-edit-year-field:focus {
          background: rgba(6,182,212,0.25);
          border-radius: 2px;
          color: #ffffff;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">

        {/* ── Error Banner ──────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg text-sm">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── Leave Type ────────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="type" className={labelCls}>
            Leave Type <span className="text-red-400">*</span>
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className={inputCls}
          >
            <option value="casual">Casual Leave</option>
            <option value="medical">Medical Leave</option>
            <option value="emergency">Emergency Leave</option>
          </select>
        </div>

        {/* ── Date Range ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

          {/* Start Date */}
          <div>
            <label htmlFor="startDate" className={labelCls}>
              Start Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              min={today}
              className={inputCls}
              required
            />
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="endDate" className={labelCls}>
              End Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              min={formData.startDate || today}
              className={inputCls}
              required
            />
          </div>
        </div>

        {/* ── Duration Preview ─────────────────────────────────────────────── */}
        {formData.startDate && formData.endDate && duration > 0 && (
          <div className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-5 py-3">
            <span className="text-sm font-medium text-slate-400">Estimated Duration</span>
            <span className="text-lg font-bold text-cyan-400">
              {duration} {duration === 1 ? 'Day' : 'Days'}
            </span>
          </div>
        )}

        {/* ── Reason ───────────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="reason" className={labelCls}>
            Reason <span className="text-red-400">*</span>
            <span className="ml-2 text-xs text-slate-500 font-normal">
              (min 10 characters)
            </span>
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={4}
            value={formData.reason}
            onChange={handleChange}
            className={`${inputCls} resize-none`}
            placeholder="Please provide a clear reason for your leave request..."
            required
          />
          {/* Live character count */}
          <p className={`mt-1 text-xs text-right ${
            formData.reason.length < 10 && formData.reason.length > 0
              ? 'text-red-400'
              : 'text-slate-500'
          }`}>
            {formData.reason.length} / 500
          </p>
        </div>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Submit Request
          </Button>
        </div>

      </form>
    </>
  );
};
