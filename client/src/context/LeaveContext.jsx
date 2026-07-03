import React, { createContext, useState, useCallback } from 'react';
import { 
  getDashboardData,
  applyLeaveAPI, 
  getLeaveHistory, 
  getAllPendingLeaves, 
  reviewLeaveAPI 
} from '../services/api';
import { useAuth } from '../hooks/useAuth';

export const LeaveContext = createContext();

export const LeaveProvider = ({ children }) => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [history, setHistory] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await getLeaveHistory();
      // Backend returns { success, leaves, pagination, ... }
      // Normalize to match Dashboard/LeaveTable expectations
      const normalized = (response.leaves || []).map((leave) => ({
        id: leave._id,
        type: capitalise(leave.leaveType),
        startDate: leave.startDate,
        endDate: leave.endDate,
        duration: leave.duration,
        reason: leave.reason,
        status: capitalise(leave.status),
        comment: leave.rejectionComment || '',
      }));
      setHistory(normalized);
    } catch (error) {
      console.error('Failed to fetch leave history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchPendingLeaves = useCallback(async () => {
    if (!user || user.role === 'student') return;
    setLoading(true);
    try {
      const response = await getAllPendingLeaves();
      // Backend returns { success, leaves, ... }
      const normalized = (response.leaves || []).map((leave) => ({
        id: leave._id,
        userName: leave.studentId?.name || 'Unknown',
        type: capitalise(leave.leaveType),
        startDate: leave.startDate,
        endDate: leave.endDate,
        duration: leave.duration,
        reason: leave.reason,
        status: capitalise(leave.status),
      }));
      setPendingLeaves(normalized);
    } catch (error) {
      console.error('Failed to fetch pending leaves:', error);
      setPendingLeaves([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const applyLeave = async (leaveData) => {
    try {
      const response = await applyLeaveAPI(leaveData);
      // Refresh dashboard and history after successful submission
      await Promise.all([fetchDashboardData(), fetchHistory()]);
      return response.leave;
    } catch (error) {
      console.error('Failed to apply leave:', error);
      throw error;
    }
  };

  const updateLeaveStatus = async (leaveId, status, comment) => {
    try {
      await reviewLeaveAPI(leaveId, status, comment);
      // Refresh pending leaves after review
      await fetchPendingLeaves();
      if (user.role === 'admin') {
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Failed to update leave status:', error);
      throw error;
    }
  };

  return (
    <LeaveContext.Provider value={{
      dashboardData, history, pendingLeaves, loading,
      fetchDashboardData, fetchHistory, fetchPendingLeaves,
      applyLeave, updateLeaveStatus
    }}>
      {children}
    </LeaveContext.Provider>
  );
};

// Helper to capitalize first letter (matches api.js pattern)
const capitalise = (str = '') =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
