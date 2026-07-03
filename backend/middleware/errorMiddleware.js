/**
 * Global Error Handling Middleware
 *
 * Catches all errors passed via next(error) or thrown in async routes
 * that aren't wrapped in try/catch.
 *
 * Must be registered LAST in server.js so it catches errors from all routes.
 *
 * Handles:
 * - Mongoose validation errors (11000 duplicate key, CastError bad ObjectId, etc.)
 * - JWT errors (expired, malformed)
 * - Generic 500 errors
 *
 * Returns consistent JSON structure to the frontend:
 * { success: false, message: "...", stack: "..." }
 */

/**
 * notFound
 * 404 handler for routes that don't exist.
 * Place this AFTER all route definitions but BEFORE errorHandler.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * errorHandler
 * Centralized error response formatter.
 * Converts all error types into a standard JSON response.
 *
 * @middleware
 */
const errorHandler = (err, req, res, next) => {
  // Default to 500 unless statusCode was already set by middleware/controller
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // ─── Mongoose Duplicate Key Error (11000) ────────────────────────────────
  // Occurs when unique constraint is violated (e.g., email already exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    statusCode = 400;
  }

  // ─── Mongoose Validation Error ─────────────────────────────────────────
  // Multiple validation failures — collect all into a single message
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join('. ');
    statusCode = 400;
  }

  // ─── Mongoose CastError (Invalid ObjectId) ──────────────────────────────
  // Happens when an invalid ID format is provided (e.g., /api/users/abc123)
  if (err.name === 'CastError') {
    message = `Resource not found. Invalid ${err.path}: ${err.value}`;
    statusCode = 404;
  }

  // ─── JWT Errors ───────────────────────────────────────────────────────────
  // TokenExpiredError, JsonWebTokenError — caught here if not handled earlier
  if (err.name === 'TokenExpiredError') {
    message = 'Session expired. Please log in again.';
    statusCode = 401;
  }

  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token. Please log in again.';
    statusCode = 401;
  }

  // Log full error in development for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ ERROR:', err);
  }

  // Send JSON error response
  res.status(statusCode).json({
    success: false,
    message,
    // Include stack trace in development mode only (never leak internals in production)
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
