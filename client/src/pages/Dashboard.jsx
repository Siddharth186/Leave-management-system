import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLeaves } from '../hooks/useLeaves';
import { StatusBadge } from '../components/Common/StatusBadge';
import { formatDate } from '../utils/helpers';
import { Calendar, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { PageWrapper } from '../components/Common/PageWrapper';
import { MetricCard } from '../components/Leaves/MetricCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Dashboard = () => {
  const { user } = useAuth();
  const { dashboardData, loading, fetchDashboardData } = useLeaves();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading || !dashboardData) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div></div>;
  }

  const isAdmin = user?.role === 'admin';

  const statCards = isAdmin
    ? [
        { name: 'Total Students',   value: dashboardData.balance,        icon: Calendar,     color: 'bg-slate-100', textColor: 'text-slate-900' },
        { name: 'Pending Requests', value: dashboardData.pendingCount,  icon: Clock,        color: 'bg-amber-50',  textColor: 'text-amber-600' },
        { name: 'Approved Leaves',  value: dashboardData.approvedCount, icon: CheckCircle2, color: 'bg-green-50',  textColor: 'text-green-600' },
        { name: 'Rejected Leaves',  value: dashboardData.rejectedCount, icon: XCircle,      color: 'bg-red-50',    textColor: 'text-red-600' },
      ]
    : [
        { name: 'Leave Balance',    value: dashboardData.balance,        icon: Calendar,     color: 'bg-slate-100', textColor: 'text-slate-900' },
        { name: 'Pending Requests', value: dashboardData.pendingCount,  icon: Clock,        color: 'bg-amber-50',  textColor: 'text-amber-600' },
        { name: 'Approved Leaves',  value: dashboardData.approvedCount, icon: CheckCircle2, color: 'bg-green-50',  textColor: 'text-green-600' },
        { name: 'Rejected Leaves',  value: dashboardData.rejectedCount, icon: XCircle,      color: 'bg-red-50',    textColor: 'text-red-600' },
      ];

  const chartData = [
    { name: 'Available', value: dashboardData.balance, color: '#4f46e5' },
    { name: 'Taken', value: dashboardData.taken, color: '#94a3b8' }
  ];

  return (
    <PageWrapper className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
            Welcome back, {user?.name}!
          </h2>
          <p className="mt-2 text-[0.95rem] text-slate-400">
            {isAdmin
              ? "System-wide leave statistics overview."
              : "Here's a summary of your leave statistics."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <MetricCard key={stat.name} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-slate-900/60 backdrop-blur-md rounded-xl shadow-sm border border-slate-800 p-6">
          <h3 className="text-[1.05rem] font-bold text-slate-100 mb-6">
            {isAdmin ? 'Approval Overview' : 'Leave Balance'}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#0f172a' }} contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#f1f5f9' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md rounded-xl shadow-sm border border-slate-800 lg:col-span-2 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-800">
            <h3 className="text-[1.05rem] font-bold text-slate-100">Recent Leave Activity</h3>
          </div>
          <div className="flex-1 overflow-x-auto">
            {dashboardData.recentActivity.length > 0 ? (
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-950/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-[0.75rem] font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-[0.75rem] font-semibold text-slate-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-[0.75rem] font-semibold text-slate-500 uppercase tracking-wider">Dates</th>
                    <th className="px-6 py-3 text-left text-[0.75rem] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {dashboardData.recentActivity.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-[0.95rem] font-medium text-slate-200">{leave.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-medium">{leave.duration} day(s)</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <StatusBadge status={leave.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center h-full">
                <Calendar className="w-10 h-10 text-slate-300 mb-3" />
                <p>No recent leave activity found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};
