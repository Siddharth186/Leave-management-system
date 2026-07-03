import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, Mail, Shield } from 'lucide-react';
import { PageWrapper } from '../components/Common/PageWrapper';

export const Profile = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <PageWrapper className="max-w-3xl mx-auto space-y-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          My Profile
        </h2>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-md rounded-xl shadow-sm border border-slate-800 overflow-hidden">
        {/* Profile Header Background */}
        <div className="h-32 bg-gradient-to-r from-cyan-600 to-blue-600"></div>
        
        <div className="px-6 py-6 sm:px-8 sm:py-8 relative">
          {/* Avatar */}
          <div className="-mt-20 sm:-mt-24 mb-6 flex justify-center sm:justify-start">
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-full bg-slate-800 border-4 border-slate-900 shadow-md flex items-center justify-center text-cyan-400 font-bold text-3xl sm:text-5xl">
              {user.name?.charAt(0)}
            </div>
          </div>
          
          <div className="text-center sm:text-left mb-8 pb-8 border-b border-slate-800">
            <h2 className="text-2xl font-bold text-slate-100">{user?.name}</h2>
            <p className="text-[0.95rem] font-medium text-cyan-400 mt-1">
              {user?.department || 'No Department'} • {user?.role}
            </p>
          </div>
          
          <div className="mt-8">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1 bg-slate-800/30 p-4 rounded-lg border border-slate-800">
                <dt className="text-sm font-medium text-slate-400">Email address</dt>
                <dd className="mt-1 text-[0.95rem] text-slate-200">{user?.email}</dd>
              </div>
              <div className="sm:col-span-1 bg-slate-800/30 p-4 rounded-lg border border-slate-800">
                <dt className="text-sm font-medium text-slate-400">Student ID</dt>
                <dd className="mt-1 text-[0.95rem] text-slate-200">{user?.studentId || 'N/A'}</dd>
              </div>
              <div className="sm:col-span-1 bg-slate-800/30 p-4 rounded-lg border border-slate-800">
                <dt className="text-sm font-medium text-slate-400">Role</dt>
                <dd className="mt-1 text-[0.95rem] text-slate-200 capitalize">{user?.role}</dd>
              </div>
              <div className="sm:col-span-1 bg-slate-800/30 p-4 rounded-lg border border-slate-800">
                <dt className="text-sm font-medium text-slate-400">Year</dt>
                <dd className="mt-1 text-[0.95rem] text-slate-200">
                  {user?.year ? `Year ${user.year}` : 'N/A'}
                </dd>
              </div>
              
              {user?.role === 'student' && user?.leaveBalance && (
                <>
                  <div className="sm:col-span-1 bg-slate-800/30 p-4 rounded-lg border border-slate-800">
                    <dt className="text-sm font-medium text-slate-400">Casual Leave Balance</dt>
                    <dd className="mt-1 text-[0.95rem] text-slate-200 font-semibold">
                      {user.leaveBalance.casual} days
                    </dd>
                  </div>
                  <div className="sm:col-span-1 bg-slate-800/30 p-4 rounded-lg border border-slate-800">
                    <dt className="text-sm font-medium text-slate-400">Medical Leave Balance</dt>
                    <dd className="mt-1 text-[0.95rem] text-slate-200 font-semibold">
                      {user.leaveBalance.medical} days
                    </dd>
                  </div>
                  <div className="sm:col-span-1 bg-slate-800/30 p-4 rounded-lg border border-slate-800">
                    <dt className="text-sm font-medium text-slate-400">Emergency Leave Balance</dt>
                    <dd className="mt-1 text-[0.95rem] text-slate-200 font-semibold">
                      {user.leaveBalance.emergency} days
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};
