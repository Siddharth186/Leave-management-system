import axios from 'axios';

// ─── Axios Instance ────────────────────────────────────────────────────────────
// All API calls go through this instance.
// baseURL points to the Vite proxy (/api) which forwards to localhost:5000 in dev.
// In production, set VITE_API_URL to your deployed backend URL.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s timeout — Atlas cold start can be slow
});

// ─── Request Interceptor ───────────────────────────────────────────────────────
// Automatically attaches the JWT from localStorage to every outgoing request.
// Controllers that use `protect` middleware require this Authorization header.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ──────────────────────────────────────────────────────
// Unwraps the Axios response envelope so callers get `data` directly.
// Also handles 401 globally — clears local storage and redirects to login
// when the token expires mid-session (no per-call logout logic needed).
api.interceptors.response.use(
  (response) => response.data, // Unwrap: callers receive { success, data } not the full AxiosResponse
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message || error.message || 'Something went wrong';

    // Token expired or invalid — force logout
    if (status === 401) {
      localStorage.removeItem('lms_token');
      localStorage.removeItem('lms_user');
      // Only redirect if not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Reject with a plain Error so catch blocks get a usable .message
    return Promise.reject(new Error(message));
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Login user — returns { success, token, user }
 * Backend: POST /api/auth/login
 */
export const loginAPI = (credentials) =>
  api.post('/auth/login', credentials);

/**
 * Register new user — returns { success, token, user }
 * Backend: POST /api/auth/register
 */
export const registerAPI = (userData) =>
  api.post('/auth/register', userData);

/**
 * Get logged-in user profile — returns { success, user }
 * Backend: GET /api/auth/profile
 */
export const getProfileAPI = () =>
  api.get('/auth/profile');

/**
 * Update profile (name, department, year, avatar)
 * Backend: PUT /api/auth/profile
 */
export const updateProfileAPI = (data) =>
  api.put('/auth/profile', data);

// ═══════════════════════════════════════════════════════════════════════════════
// LEAVE API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply for leave
 * Backend: POST /api/leaves/apply
 * Body: { leaveType, startDate, endDate, reason }
 *
 * NOTE: Frontend form uses { type, startDate, endDate, reason }
 * We normalize 'type' → 'leaveType' and lowercase here so the
 * backend enum (casual/medical/emergency) is always satisfied.
 */
export const applyLeaveAPI = ({ type, leaveType, startDate, endDate, reason }) =>
  api.post('/leaves/apply', {
    leaveType: (leaveType || type || '').toLowerCase(),
    startDate,
    endDate,
    reason,
  });

/**
 * Get leave history for logged-in student
 * Backend: GET /api/leaves/history
 * Supports query params: status, leaveType, page, limit
 */
export const getLeaveHistory = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status)    params.append('status',    filters.status.toLowerCase());
  if (filters.leaveType) params.append('leaveType', filters.leaveType.toLowerCase());
  if (filters.page)      params.append('page',      filters.page);
  if (filters.limit)     params.append('limit',     filters.limit);
  return api.get(`/leaves/history?${params.toString()}`);
};

/**
 * Get all pending leave requests (admin only)
 * Backend: GET /api/leaves/pending
 */
export const getAllPendingLeaves = () =>
  api.get('/leaves/pending');

/**
 * Approve a leave request (admin only)
 * Backend: PUT /api/leaves/approve/:id
 */
export const approveLeaveAPI = (id) =>
  api.put(`/leaves/approve/${id}`);

/**
 * Reject a leave request (admin only)
 * Backend: PUT /api/leaves/reject/:id
 * Body: { rejectionComment }
 */
export const rejectLeaveAPI = (id, rejectionComment) =>
  api.put(`/leaves/reject/${id}`, { rejectionComment });

/**
 * Unified review helper — used by LeaveContext.updateLeaveStatus
 * Action is 'Approved' or 'Rejected' (frontend casing) — normalised internally.
 */
export const reviewLeaveAPI = (id, action, comment = '') => {
  const normalised = action.toLowerCase();
  if (normalised === 'approved') return approveLeaveAPI(id);
  if (normalised === 'rejected') return rejectLeaveAPI(id, comment);
  return Promise.reject(new Error(`Unknown action: ${action}`));
};

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get dashboard metrics for the logged-in user
 * Backend: GET /api/dashboard/metrics
 * Returns different shapes for student vs admin (role-branched in controller)
 */
export const getDashboardMetrics = () =>
  api.get('/dashboard/metrics');

/**
 * Get chart data (leave type distribution, monthly trends, approval ratio)
 * Backend: GET /api/dashboard/chart
 */
export const getDashboardChart = () =>
  api.get('/dashboard/chart');

/**
 * Get recent leave activities
 * Backend: GET /api/dashboard/activities
 */
export const getDashboardActivities = () =>
  api.get('/dashboard/activities');

/**
 * Composite helper — fetches metrics + chart + activities in parallel.
 * Replaces the old getDashboardData(userId) mock function.
 * Returns a normalised object that matches the shape Dashboard.jsx expects:
 * {
 *   balance, taken, pendingCount, approvedCount, rejectedCount,
 *   recentActivity: [{ id, type, startDate, endDate, duration, status }]
 * }
 */
export const getDashboardData = async () => {
  const [metricsRes, activitiesRes] = await Promise.all([
    getDashboardMetrics(),
    getDashboardActivities(),
  ]);

  const m = metricsRes.metrics;

  // Calculate total balance across all leave types (for the balance card + chart)
  const totalBalance =
    m.leaveBalance
      ? (m.leaveBalance.casual ?? 0) +
        (m.leaveBalance.medical ?? 0) +
        (m.leaveBalance.emergency ?? 0)
      : 0;

  // For admin, leaveBalance doesn't exist — use totalStudents instead
  const isAdmin = m.totalStudents !== undefined;

  // Normalise recent activity rows to the shape Dashboard.jsx table expects
  const recentActivity = (activitiesRes.activities || []).map((leave) => ({
    id:        leave._id,
    type:      capitalise(leave.leaveType),
    startDate: leave.startDate,
    endDate:   leave.endDate,
    duration:  leave.duration,
    status:    capitalise(leave.status),
  }));

  if (isAdmin) {
    return {
      balance:       m.totalStudents, // Admin card shows total students in "balance" slot
      taken:         m.approved ?? 0,
      pendingCount:  m.pending ?? 0,
      approvedCount: m.approved ?? 0,
      rejectedCount: m.rejected ?? 0,
      recentActivity,
    };
  }

  // Student: calculate how many days have been taken (total balance - remaining)
  const initialTotal = 21; // casual(12) + medical(6) + emergency(3)
  const taken = initialTotal - totalBalance;

  return {
    balance:       totalBalance,
    taken:         taken < 0 ? 0 : taken,
    pendingCount:  m.pending ?? 0,
    approvedCount: m.approved ?? 0,
    rejectedCount: m.rejected ?? 0,
    leaveBalance:  m.leaveBalance, // Keep full object for profile display
    recentActivity,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get notifications for logged-in user
 * Backend: GET /api/notifications?read=false&page=1&limit=20
 */
export const getNotifications = (params = {}) => {
  const query = new URLSearchParams();
  if (params.read !== undefined) query.append('read', params.read);
  if (params.page)               query.append('page',  params.page);
  if (params.limit)              query.append('limit', params.limit);
  return api.get(`/notifications?${query.toString()}`);
};

/**
 * Mark a single notification as read
 * Backend: PUT /api/notifications/read/:id
 */
export const markNotificationRead = (id) =>
  api.put(`/notifications/read/${id}`);

/**
 * Mark ALL notifications as read
 * Backend: PUT /api/notifications/read-all
 */
export const markAllNotificationsRead = () =>
  api.put('/notifications/read-all');

// ─── Utility ──────────────────────────────────────────────────────────────────
// Capitalises first letter — converts backend lowercase ("pending") to
// display-ready ("Pending") without importing a library.
const capitalise = (str = '') =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export default api;
