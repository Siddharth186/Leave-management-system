import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { registerAPI } from '../services/api';
import { Button } from '../components/Common/Button';
import { UserPlus } from 'lucide-react';

// ─── Department options — must match backend enum exactly ─────────────────────
const DEPARTMENTS = [
  { value: 'cse',   label: 'Computer Science & Engineering (CSE)' },
  { value: 'aids',  label: 'AI & Data Science (AIDS)' },
  { value: 'cyber', label: 'Cyber Security (CYBER)' },
  { value: 'csbs',  label: 'CS & Business Systems (CSBS)' },
  { value: 'ece',   label: 'Electronics & Communication (ECE)' },
  { value: 'eee',   label: 'Electrical & Electronics (EEE)' },
  { value: 'mech',  label: 'Mechanical Engineering (MECH)' },
];

// ─── Reusable field wrapper ───────────────────────────────────────────────────
const inputCls =
  'w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md ' +
  'text-sm text-white placeholder-slate-500 ' +
  'focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 ' +
  'transition-colors duration-150';

const labelCls = 'block text-sm font-medium text-slate-300 mb-1';

export const Register = () => {
  const [form, setForm] = useState({
    name:       '',
    email:      '',
    password:   '',
    studentId:  '',
    department: '',
    year:       '',
    role:       'student',
  });
  const [error,        setError]      = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const { updateUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleSwitch = (role) => {
    // Reset student-only fields when switching to admin
    setForm((prev) => ({
      ...prev,
      role,
      studentId:  role === 'admin' ? '' : prev.studentId,
      year:       role === 'admin' ? '' : prev.year,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.department) {
      setError('Please select your department.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await registerAPI({
        ...form,
        year: form.year ? parseInt(form.year, 10) : undefined,
      });
      localStorage.setItem('lms_token', response.token);
      updateUser(response.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 py-12 px-4 font-sans">
      <div className="w-full max-w-lg p-8 bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-800">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4 border border-cyan-500/30">
            <UserPlus className="w-6 h-6 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Create an Account</h2>
          <p className="mt-2 text-sm text-slate-400 text-center">
            Join the Student Leave Portal
          </p>
        </div>

        {/* ── Error Banner ────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-md mb-6">
            <p className="text-sm text-red-400 font-medium">{error}</p>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>

          {/* ── Role Selector ──────────────────────────────────────────────── */}
          <div>
            <label className={labelCls}>I am a</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'student', icon: '🎓', label: 'Student' },
                { key: 'admin',   icon: '🛡️', label: 'Admin / Faculty' },
              ].map(({ key, icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleRoleSwitch(key)}
                  className={`py-2.5 rounded-lg border text-sm font-medium transition-all
                    ${form.role === key
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Full Name ──────────────────────────────────────────────────── */}
          <div>
            <label htmlFor="name" className={labelCls}>
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              id="name" name="name" type="text" required
              value={form.name} onChange={handleChange}
              placeholder="John Doe"
              className={inputCls}
            />
          </div>

          {/* ── Email ─────────────────────────────────────────────────────── */}
          <div>
            <label htmlFor="email" className={labelCls}>
              Email <span className="text-red-400">*</span>
            </label>
            <input
              id="email" name="email" type="email" required
              value={form.email} onChange={handleChange}
              placeholder="you@example.com"
              className={inputCls}
            />
          </div>

          {/* ── Password ──────────────────────────────────────────────────── */}
          <div>
            <label htmlFor="password" className={labelCls}>
              Password <span className="text-red-400">*</span>
            </label>
            <input
              id="password" name="password" type="password" required minLength={6}
              value={form.password} onChange={handleChange}
              placeholder="Min 6 characters, include a number"
              className={inputCls}
            />
          </div>

          {/* ── Department (both roles — enum enforced) ───────────────────── */}
          <div>
            <label htmlFor="department" className={labelCls}>
              Department <span className="text-red-400">*</span>
            </label>
            <select
              id="department" name="department" required
              value={form.department} onChange={handleChange}
              className={inputCls}
            >
              <option value="" disabled>— Select your department —</option>
              {DEPARTMENTS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              This determines which admin can review your leave requests.
            </p>
          </div>

          {/* ── Student-only fields ────────────────────────────────────────── */}
          {form.role === 'student' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="studentId" className={labelCls}>Student ID</label>
                <input
                  id="studentId" name="studentId" type="text"
                  value={form.studentId} onChange={handleChange}
                  placeholder="CS21001"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="year" className={labelCls}>Year</label>
                <select
                  id="year" name="year"
                  value={form.year} onChange={handleChange}
                  className={inputCls}
                >
                  <option value="">Select year</option>
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ── Submit ────────────────────────────────────────────────────── */}
          <Button
            type="submit"
            className="w-full py-2.5 text-base !mt-6"
            isLoading={isSubmitting}
          >
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400 border-t border-slate-800 pt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
};
