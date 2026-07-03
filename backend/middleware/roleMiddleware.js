/**
 * restrictTo
 * Role-Based Access Control (RBAC) Middleware.
 * Returns a middleware function that only allows users with the specified roles.
 *
 * Usage in routes:
 *   router.put('/approve/:id', protect, restrictTo('admin'), approveLeave);
 *   router.get('/profile',     protect, restrictTo('student', 'admin'), getProfile);
 *
 * Design — factory function pattern:
 * restrictTo(...roles) returns a middleware function.
 * This lets you pass any number of allowed roles cleanly in route definitions.
 *
 * Must always be used AFTER protect middleware because it reads req.user
 * which is set by protect.
 *
 * @param {...string} roles - Allowed roles e.g. 'admin', 'student'
 * @returns {Function} Express middleware
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // req.user is guaranteed to exist here because protect ran first
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Only ${roles.join(' or ')} can perform this action.`,
      });
    }
    next();
  };
};

module.exports = { restrictTo };
