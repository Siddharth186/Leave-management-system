const { body, param, validationResult } = require('express-validator');

// ─── Shared Constants ─────────────────────────────────────────────────────────
const DEPARTMENTS = ['cse', 'aids', 'cyber', 'csbs', 'ece', 'eee', 'mech'];

/**
 * todayString()
 * Returns today's date as "YYYY-MM-DD" in local time.
 * Used for past-date comparisons — always recalculated at request time
 * so the server never caches a stale date across midnight.
 */
const todayString = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * handleValidationErrors
 * Reads express-validator results and short-circuits with 400 if any failed.
 * Returns:  { success: false, message: "<first error>", errors: [{ field, message }] }
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return res.status(400).json({
      success: false,
      message: formatted[0].message,
      errors:  formatted,
    });
  }
  next();
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * validateRegister
 * POST /api/auth/register
 * Enforces department enum so invalid departments are rejected at the edge
 * before they ever reach the DB (double-layer: validator + Mongoose enum).
 */
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain at least one number'),

  body('role')
    .optional()
    .isIn(['student', 'admin']).withMessage('Role must be student or admin'),

  // Department must be one of the seven allowed values (case-insensitive check;
  // the model stores it lowercased anyway).
  body('department')
    .optional()
    .trim()
    .customSanitizer((v) => (v ? v.toLowerCase() : v))
    .isIn([...DEPARTMENTS, '', null, undefined])
    .withMessage(`Department must be one of: ${DEPARTMENTS.join(', ')}`),

  body('year')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Year must be between 1 and 5'),

  handleValidationErrors,
];

/**
 * validateLogin
 * POST /api/auth/login
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),

  handleValidationErrors,
];

// ═══════════════════════════════════════════════════════════════════════════════
// LEAVE VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * validateApplyLeave
 * POST /api/leaves/apply
 *
 * Past-date rule:
 *   Both startDate and endDate must be >= today (midnight, local time).
 *   The frontend enforces this via the `min` attribute too, but the server
 *   rejects anything that bypasses the UI (e.g. direct API calls).
 */
const validateApplyLeave = [
  body('leaveType')
    .notEmpty().withMessage('Leave type is required')
    .isIn(['casual', 'medical', 'emergency'])
    .withMessage('Leave type must be casual, medical, or emergency'),

  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      // Compare date strings directly — no timezone conversion needed
      // because both sides are in YYYY-MM-DD format.
      if (value < todayString()) {
        throw new Error('Start date cannot be in the past');
      }
      return true;
    }),

  body('endDate')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('End date must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      if (value < todayString()) {
        throw new Error('End date cannot be in the past');
      }
      return true;
    })
    .custom((value, { req }) => {
      if (value < req.body.startDate) {
        throw new Error('End date cannot be before start date');
      }
      return true;
    }),

  body('reason')
    .trim()
    .notEmpty().withMessage('Reason is required')
    .isLength({ min: 10 }).withMessage('Reason must be at least 10 characters')
    .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters'),

  handleValidationErrors,
];

/**
 * validateRejectLeave
 * PUT /api/leaves/reject/:id
 * Rejection requires a comment — approval does not.
 */
const validateRejectLeave = [
  param('id')
    .isMongoId().withMessage('Invalid leave ID'),

  body('rejectionComment')
    .trim()
    .notEmpty().withMessage('Rejection comment is required when rejecting a leave')
    .isLength({ min: 5  }).withMessage('Rejection comment must be at least 5 characters')
    .isLength({ max: 300 }).withMessage('Rejection comment cannot exceed 300 characters'),

  handleValidationErrors,
];

/**
 * validateApproveLeave
 * PUT /api/leaves/approve/:id
 */
const validateApproveLeave = [
  param('id').isMongoId().withMessage('Invalid leave ID'),
  handleValidationErrors,
];

/**
 * validateMongoId
 * Reusable :id param guard for any route.
 */
const validateMongoId = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  handleValidationErrors,
];

module.exports = {
  DEPARTMENTS,           // exported so seed.js / other files can reuse
  validateRegister,
  validateLogin,
  validateApplyLeave,
  validateRejectLeave,
  validateApproveLeave,
  validateMongoId,
  handleValidationErrors,
};
