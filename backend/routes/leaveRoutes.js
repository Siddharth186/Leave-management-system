const express = require('express');
const router = express.Router();

const {
  applyLeave,
  getLeaveHistory,
  getPendingLeaves,
  approveLeave,
  rejectLeave,
  getLeaveById,
} = require('../controllers/leaveController');

const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const {
  validateApplyLeave,
  validateApproveLeave,
  validateRejectLeave,
  validateMongoId,
} = require('../middleware/validationMiddleware');

/**
 * LEAVE ROUTES
 * Base path: /api/leaves
 *
 * Route Summary:
 * ┌──────────────────────────────────┬──────────────────┬────────────────────────────────────┐
 * │ Endpoint                         │ Access           │ Description                        │
 * ├──────────────────────────────────┼──────────────────┼────────────────────────────────────┤
 * │ POST   /api/leaves/apply         │ Private (student)│ Submit a new leave request         │
 * │ GET    /api/leaves/history       │ Private (student)│ Get own leave history w/ filters   │
 * │ GET    /api/leaves/pending       │ Private (admin)  │ Get all pending leave requests     │
 * │ PUT    /api/leaves/approve/:id   │ Private (admin)  │ Approve a leave request            │
 * │ PUT    /api/leaves/reject/:id    │ Private (admin)  │ Reject a leave + add comment       │
 * │ GET    /api/leaves/:id           │ Private (both)   │ Get single leave (ownership check) │
 * └──────────────────────────────────┴──────────────────┴────────────────────────────────────┘
 *
 * Note: All routes require authentication (protect).
 * Role-specific routes additionally use restrictTo().
 */

// ─── Student Routes ───────────────────────────────────────────────────────────

// POST /api/leaves/apply
// Student submits a new leave request
router.post(
  '/apply',
  protect,
  restrictTo('student'),
  validateApplyLeave,
  applyLeave
);

// GET /api/leaves/history?status=&leaveType=&startDate=&endDate=&page=&limit=
// Student views their own leave history with filters and pagination
router.get(
  '/history',
  protect,
  restrictTo('student'),
  getLeaveHistory
);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// GET /api/leaves/pending?department=&page=&limit=
// Admin views all pending leave requests
router.get(
  '/pending',
  protect,
  restrictTo('admin'),
  getPendingLeaves
);

// PUT /api/leaves/approve/:id
// Admin approves a specific leave request by ID
router.put(
  '/approve/:id',
  protect,
  restrictTo('admin'),
  validateApproveLeave,
  approveLeave
);

// PUT /api/leaves/reject/:id
// Admin rejects a specific leave request — body must include rejectionComment
router.put(
  '/reject/:id',
  protect,
  restrictTo('admin'),
  validateRejectLeave,
  rejectLeave
);

// ─── Shared Routes (student + admin) ─────────────────────────────────────────

// GET /api/leaves/:id
// Get a single leave by ID — students can only view their own (enforced in controller)
// IMPORTANT: This must be declared AFTER /pending, /history routes
// to avoid Express matching "pending" or "history" as :id param
router.get(
  '/:id',
  protect,
  validateMongoId,
  getLeaveById
);

module.exports = router;
