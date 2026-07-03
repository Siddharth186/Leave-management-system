const User = require('../models/User');
const { verifyToken } = require('../utils/generateToken');

/**
 * protect
 * JWT Authentication Middleware — gates every protected route.
 *
 * Flow:
 * 1. Extract token from Authorization header ("Bearer <token>")
 * 2. Verify and decode the JWT using verifyToken()
 * 3. Fetch the live user from DB (confirms user still exists / not deleted)
 * 4. Attach user to req.user so controllers can access it without another DB call
 *
 * Why re-fetch from DB even though JWT has the payload?
 * - User might have been deleted or deactivated after token was issued.
 * - Ensures req.user always has the latest data (e.g. updated leaveBalance).
 * - Using .select('-password') keeps the password hash out of req.user.
 *
 * @middleware
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from "Authorization: Bearer <token>" header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // Verify JWT signature and expiry — throws if invalid or expired
    const decoded = verifyToken(token);

    // Confirm user still exists in DB
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.',
      });
    }

    // Attach user object to request — available in all downstream controllers
    req.user = user;
    next();
  } catch (error) {
    // jwt.verify() throws specific error types we can map to useful messages
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.',
      });
    }

    // Unexpected error — pass to global error middleware
    next(error);
  }
};

module.exports = { protect };
