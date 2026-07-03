const { body, param, query, validationResult } = require('express-validator');

/**
 * handleValidationErrors
 * Reads results from express-validator checks and returns 400 if any failed.
 * Always used as the LAST item in a validation chain array.
 *
 * Returns a consistent error shape:
 * { success: false, message: "First error", errors: [{ field, message }] }
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      message: formatted[0].message, // Surface first error as main message
      errors: formatted,             // Full list for frontend to highlight fields
    });
  }

  next();
};

// ─── Auth Validation Rules ────────────────────────────────────────────────────

/**
 * validateRegister
 * Rules for POST /api/auth/register
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

  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Department name is too long'),

  body('year')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Year must be between 1 and 5'),

  handleValidationErrors,
];

/**
 * validateLogin
 * Rules for POST /api/auth/login
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

// ─── Leave Validation Rules ───────────────────────────────────────────────────

/**
 * validateApplyLeave
 * Rules for POST /api/leaves/apply
 */
const validateApplyLeave = [
  body('leaveType')
    .notEmpty().withMessage('Leave type is required')
    .isIn(['casual', 'medical', 'emergency'])
    .withMessage('Leave type must be casual, medical, or emergency'),

  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be a valid date (YYYY-MM-DD)'),

  body('endDate')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('End date must be a valid date (YYYY-MM-DD)')
    .custom((value, { req }) => {
      // endDate must be on or after startDate
      if (new Date(value) < new Date(req.body.startDate)) {
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
 * Rules for PUT /api/leaves/reject/:id
 * Rejection requires a comment — approval does not.
 */
const validateRejectLeave = [
  param('id')
    .isMongoId().withMessage('Invalid leave ID'),

  body('rejectionComment')
    .trim()
    .notEmpty().withMessage('Rejection comment is required when rejecting a leave')
    .isLength({ min: 5 }).withMessage('Rejection comment must be at least 5 characters')
    .isLength({ max: 300 }).withMessage('Rejection comment cannot exceed 300 characters'),

  handleValidationErrors,
];

/**
 * validateApproveLeave
 * Rules for PUT /api/leaves/approve/:id
 */
const validateApproveLeave = [
  param('id')
    .isMongoId().withMessage('Invalid leave ID'),

  handleValidationErrors,
];

/**
 * validateMongoId
 * Reusable rule for any route with :id param that must be a valid MongoDB ObjectId.
 */
const validateMongoId = [
  param('id')
    .isMongoId().withMessage('Invalid ID format'),

  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateApplyLeave,
  validateRejectLeave,
  validateApproveLeave,
  validateMongoId,
  handleValidationErrors,
};
