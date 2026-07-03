const express = require('express');
const router = express.Router();

const {
  getMetrics,
  getChartData,
  getRecentActivities,
} = require('../controllers/dashboardController');

const { protect } = require('../middleware/authMiddleware');

/**
 * DASHBOARD ROUTES
 * Base path: /api/dashboard
 *
 * Route Summary:
 * ┌──────────────────────────────────┬────────────┬───────────────────────────────────────┐
 * │ Endpoint                         │ Access     │ Description                           │
 * ├──────────────────────────────────┼────────────┼───────────────────────────────────────┤
 * │ GET    /api/dashboard/metrics    │ Private    │ Get role-specific dashboard metrics   │
 * │ GET    /api/dashboard/chart      │ Private    │ Get aggregated chart data             │
 * │ GET    /api/dashboard/activities │ Private    │ Get recent leave activities           │
 * └──────────────────────────────────┴────────────┴───────────────────────────────────────┘
 *
 * All routes require authentication.
 * Controllers auto-adapt response based on req.user.role (student vs admin).
 */

// ─── Dashboard Metrics ────────────────────────────────────────────────────────

// GET /api/dashboard/metrics
// Returns role-specific metrics:
// - Student: leaveBalance, pending/approved/rejected counts
// - Admin:   totalStudents, system-wide pending/approved/rejected counts
router.get('/metrics', protect, getMetrics);

// ─── Chart Data ───────────────────────────────────────────────────────────────

// GET /api/dashboard/chart
// Returns aggregated data for frontend charts:
// - leaveTypeDistribution (casual, medical, emergency)
// - monthlyTrends (last 6 months)
// - approvalRatio (approved vs rejected percentage)
router.get('/chart', protect, getChartData);

// ─── Recent Activities ────────────────────────────────────────────────────────

// GET /api/dashboard/activities
// Returns last 10 leave-related actions sorted by updatedAt desc
// Used for activity feed widgets
router.get('/activities', protect, getRecentActivities);

module.exports = router;
